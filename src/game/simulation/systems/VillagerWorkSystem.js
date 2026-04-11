import {
  VILLAGER_CARRY_CAPACITY_GOLD,
  VILLAGER_CARRY_CAPACITY_MEAT,
  VILLAGER_CARRY_CAPACITY_WOOD,
  VILLAGER_GATHER_DURATION_MS,
  VILLAGER_GOLD_HARVEST_CHUNK,
  VILLAGER_MEAT_HARVEST_CHUNK,
  VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
  VILLAGER_INTENT_ACTION_DELAY_TICKS,
  VILLAGER_WOOD_HARVEST_CHUNK,
  SIMULATION_TICK_MS,
  TILE_SIZE,
} from '../../config/constants.js'
import { findCastleDropTile } from '../../core/findCastleDropTile.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'
import { UnitStateSystem } from './UnitStateSystem.js'
import { getIntentBubbleText } from './getIntentBubbleText.js'

export class VillagerWorkSystem {
  static update(worldStore) {
    const units = worldStore.units ?? []

    for (const unit of units) {
      if (unit.role !== 'villager') {
        continue
      }

      if (unit.state === 'gathering') {
        this.ensureGatherTimer(unit, worldStore)
        continue
      }

      if (unit.state === 'gathering_complete') {
        this.completeGather(unit, worldStore)
        continue
      }

      if (unit.state === 'loading_construction_wood') {
        this.completeConstructionPickup(unit, worldStore)
        continue
      }

      if (
        unit.state === 'delivering_wood' ||
        unit.state === 'delivering_gold' ||
        unit.state === 'delivering_meat'
      ) {
        this.completeDelivery(unit, worldStore)
        continue
      }

      if (unit.state === 'delivering_construction_wood') {
        this.completeConstructionDelivery(unit, worldStore)
      }
    }
  }

  static ensureGatherTimer(unit, worldStore) {
    if (unit.stateUntilTick != null) {
      return
    }

    const resource = this.getResourceById(worldStore, unit.workTargetId ?? unit.targetId)
    const resourceType = this.getWorkTargetType(unit, resource)
    const resourceAmount = Math.max(0, resource?.amount ?? 0)
    const gatherDurationMs = this.getGatherDuration(resourceType, resourceAmount)

    const interactionFacing = this.getFacingTowardResource(unit, resource)
    if (interactionFacing) {
      unit.interactionFacing = interactionFacing
      unit.facing = interactionFacing
    }

    if (resourceType === 'sheep' && resource) {
      resource.state = 'idle'
    }

    UnitStateSystem.queueTimedTransition(unit, worldStore, 'gathering_complete', gatherDurationMs)
  }

  static completeGather(unit, worldStore) {
    const resource = this.getResourceById(worldStore, unit.workTargetId ?? unit.targetId)
    const resourceType = this.getWorkTargetType(unit, resource)
    const resourceAmount = Math.max(0, resource?.amount ?? 0)
    const inventoryKey = this.getInventoryKey(resourceType)
    const carryCapacity = this.getCarryCapacity(unit, resourceType)
    const harvestChunk = this.getHarvestChunk(resourceType)

    unit.inventory = unit.inventory ?? { wood: 0, gold: 0, meat: 0 }
    const currentAmount = Math.max(0, unit.inventory[inventoryKey] ?? 0)
    const availableCapacity = Math.max(0, carryCapacity - currentAmount)
    const transferAmount =
      resourceType === 'sheep'
        ? resourceAmount
        : Math.min(harvestChunk, availableCapacity, resourceAmount)

    if (transferAmount > 0) {
      unit.inventory[inventoryKey] = currentAmount + transferAmount

      if (resource) {
        if (resourceType === 'sheep') {
          resource.state = 'idle'
        }

        resource.amount = Math.max(0, resourceAmount - transferAmount)
      }
    }

    if (resourceType === 'sheep') {
      this.removeResourceById(worldStore, resource?.id ?? unit.workTargetId ?? unit.targetId)
    }

    this.beginReturnToCastle(unit, worldStore)
  }

  static beginReturnToCastle(unit, worldStore) {
    const castle = this.getCastle(worldStore)
    const returnTile = castle ? findCastleDropTile(castle, worldStore) : null
    const resourceType = this.getCarriedResourceType(unit)
    const intentText = getIntentBubbleText(`${resourceType}_delivery`)

    if (intentText) {
      const currentTick = worldStore.tick ?? 0

      unit.bubble = {
        text: intentText,
        untilTick: currentTick + VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
      }
    }

    if (castle && returnTile) {
      unit.targetId = castle.id
      unit.target = {
        type: 'castle',
        id: castle.id,
        tile: returnTile,
      }
      unit.path = []
      unit.pathGoalKey = null
      const unitX = unit.gridPos?.x

      if (unitX != null) {
        if (returnTile.x > unitX) {
          unit.facing = 'right'
        } else if (returnTile.x < unitX) {
          unit.facing = 'left'
        }
      }
    }

    unit.state = 'preparing_to_return'
    UnitStateSystem.queueTimedTransition(
      unit,
      worldStore,
      'returning_to_castle',
      VILLAGER_INTENT_ACTION_DELAY_TICKS * SIMULATION_TICK_MS,
    )
  }

  static completeDelivery(unit, worldStore) {
    unit.inventory = unit.inventory ?? { wood: 0, gold: 0, meat: 0 }
    const resourceType = this.getCarriedResourceType(unit)
    const inventoryKey = this.getInventoryKey(resourceType)
    const carriedAmount = Math.max(0, unit.inventory[inventoryKey] ?? 0)

    if (carriedAmount > 0) {
      const kingdomResourceKey = this.getKingdomResourceKey(resourceType)
      worldStore.kingdom.resources[kingdomResourceKey] =
        (worldStore.kingdom.resources[kingdomResourceKey] ?? 0) + carriedAmount

      if (resourceType === 'wood') {
        worldStore.kingdom.needs.wood = Math.max(
          0,
          (worldStore.kingdom.needs.wood ?? 0) - carriedAmount,
        )
      } else if (resourceType === 'gold') {
        worldStore.kingdom.needs.gold = Math.max(
          0,
          (worldStore.kingdom.needs.gold ?? 0) - carriedAmount,
        )
      } else if (resourceType === 'meat') {
        worldStore.kingdom.needs.food = Math.max(
          0,
          (worldStore.kingdom.needs.food ?? 0) - carriedAmount,
        )
      }

      unit.inventory[inventoryKey] = 0
    }

    const resource = this.getResourceById(worldStore, unit.workTargetId ?? unit.targetId)

    if (resource) {
      resource.reservedBy = null
    }

    unit.workTargetId = null
    unit.workTargetType = null
    unit.targetId = null
    unit.target = null
    unit.interactionFacing = null
    if (unit.equipment) {
      unit.equipment.tool = null
    }
    unit.path = []
    unit.pathGoalKey = null
    unit.stateUntilTick = null
    unit.nextState = null
    unit.state = 'idle'
  }

  static completeConstructionPickup(unit, worldStore) {
    const delivery = unit.constructionDelivery

    if (!delivery) {
      this.resetConstructionDelivery(unit, worldStore)
      return
    }

    unit.inventory = unit.inventory ?? { wood: 0, gold: 0, meat: 0 }

    const amount = Math.max(0, Number(delivery.amount ?? 0))
    unit.inventory.wood = amount

    const site = this.getConstructionSiteById(worldStore, delivery.siteId)

    if (!site) {
      worldStore.kingdom.resources.wood = (worldStore.kingdom.resources.wood ?? 0) + amount
      this.resetConstructionDelivery(unit, worldStore)
      return
    }

    const deliveryTile = delivery.targetTile ?? site.gridPos

    unit.targetId = site.id
    unit.target = {
      type: 'constructionSite',
      id: site.id,
      tile: deliveryTile,
    }
    unit.path = []
    unit.pathGoalKey = null
    unit.state = 'moving'
    unit.stateUntilTick = null
    unit.nextState = null
  }

  static completeConstructionDelivery(unit, worldStore) {
    const delivery = unit.constructionDelivery

    if (!delivery) {
      this.resetConstructionDelivery(unit, worldStore)
      return
    }

    const site = this.getConstructionSiteById(worldStore, delivery.siteId)
    const carriedAmount = Math.max(0, Number(unit.inventory?.wood ?? 0))

    if (site && carriedAmount > 0) {
      const remainingNeed = Math.max(
        0,
        Number(site.woodRequired ?? 0) -
          Number(site.woodDelivered ?? 0) -
          Number(site.woodReserved ?? 0),
      )
      const transferAmount = Math.min(carriedAmount, remainingNeed)

      if (transferAmount > 0) {
        site.woodDelivered = Math.max(0, Number(site.woodDelivered ?? 0)) + transferAmount
        site.woodReserved = Math.max(0, Number(site.woodReserved ?? 0) - transferAmount)
      }

      const excessAmount = Math.max(0, carriedAmount - transferAmount)

      if (excessAmount > 0) {
        worldStore.kingdom.resources.wood = Math.max(
          0,
          Number(worldStore.kingdom.resources?.wood ?? 0) + excessAmount,
        )
      }
    } else if (carriedAmount > 0) {
      worldStore.kingdom.resources.wood = Math.max(
        0,
        Number(worldStore.kingdom.resources?.wood ?? 0) + carriedAmount,
      )
    }

    unit.inventory = unit.inventory ?? { wood: 0, gold: 0, meat: 0 }
    unit.inventory.wood = 0
    this.resetConstructionDelivery(unit, worldStore)
  }

  static resetConstructionDelivery(unit, worldStore) {
    unit.constructionDelivery = null
    unit.targetId = null
    unit.target = null
    unit.interactionFacing = null
    unit.path = []
    unit.pathGoalKey = null
    unit.stateUntilTick = null
    unit.nextState = null
    unit.state = 'idle'
    unit.idleSince = worldStore.tick ?? 0
  }

  static getConstructionSiteById(worldStore, siteId) {
    if (!siteId) {
      return null
    }

    return (worldStore.constructionSites ?? []).find((site) => site.id === siteId) ?? null
  }

  static getCastle(worldStore) {
    return (worldStore.buildings ?? []).find((building) => building.type === 'castle') ?? null
  }

  static getResourceById(worldStore, resourceId) {
    if (!resourceId) {
      return null
    }

    return (worldStore.resources ?? []).find((resource) => resource.id === resourceId) ?? null
  }

  static getFacingTowardResource(unit, resource) {
    const unitX = this.getWorldCenterX(unit)
    const resourceX = this.getResourceCenterX(resource)

    if (!Number.isFinite(unitX) || !Number.isFinite(resourceX)) {
      return null
    }

    if (resourceX > unitX) {
      return 'right'
    }

    if (resourceX < unitX) {
      return 'left'
    }

    return unit.interactionFacing === 'left' || unit.interactionFacing === 'right'
      ? unit.interactionFacing
      : unit.facing === 'left' || unit.facing === 'right'
        ? unit.facing
        : null
  }

  static getWorldCenterX(entity) {
    if (entity?.pos && Number.isFinite(entity.pos.x)) {
      return entity.pos.x
    }

    if (entity?.gridPos && Number.isFinite(entity.gridPos.x)) {
      return entity.gridPos.x * TILE_SIZE + TILE_SIZE / 2
    }

    return null
  }

  static getResourceCenterX(resource) {
    if (resource?.pos && Number.isFinite(resource.pos.x)) {
      return resource.pos.x
    }

    if (resource?.gridPos && Number.isFinite(resource.gridPos.x)) {
      return resource.gridPos.x * TILE_SIZE + TILE_SIZE / 2
    }

    return null
  }

  static getWorkTargetType(unit, resource) {
    return unit.workTargetType ?? resource?.type ?? 'tree'
  }

  static getCarriedResourceType(unit) {
    if ((unit.inventory?.meat ?? 0) > 0) {
      return 'meat'
    }

    if ((unit.inventory?.gold ?? 0) > 0) {
      return 'gold'
    }

    if ((unit.inventory?.wood ?? 0) > 0) {
      return 'wood'
    }

    return unit.workTargetType ?? 'wood'
  }

  static getInventoryKey(resourceType) {
    if (resourceType === 'gold') {
      return 'gold'
    }

    if (resourceType === 'sheep' || resourceType === 'meat') {
      return 'meat'
    }

    return 'wood'
  }

  static getKingdomResourceKey(resourceType) {
    if (resourceType === 'gold') {
      return 'gold'
    }

    if (resourceType === 'sheep' || resourceType === 'meat') {
      return 'meat'
    }

    return 'wood'
  }

  static getCarryCapacity(unit, resourceType) {
    if (resourceType === 'gold') {
      return unit.stats?.carryCapacityGold ?? VILLAGER_CARRY_CAPACITY_GOLD
    }

    if (resourceType === 'sheep' || resourceType === 'meat') {
      return unit.stats?.carryCapacityMeat ?? VILLAGER_CARRY_CAPACITY_MEAT
    }

    return unit.stats?.carryCapacityWood ?? VILLAGER_CARRY_CAPACITY_WOOD
  }

  static getHarvestChunk(resourceType) {
    if (resourceType === 'gold') {
      return VILLAGER_GOLD_HARVEST_CHUNK
    }

    if (resourceType === 'sheep' || resourceType === 'meat') {
      return VILLAGER_MEAT_HARVEST_CHUNK
    }

    return VILLAGER_WOOD_HARVEST_CHUNK
  }

  static getGatherDuration(resourceType, resourceAmount) {
    if (resourceType === 'sheep') {
      const batches = Math.max(1, Math.ceil(resourceAmount / VILLAGER_MEAT_HARVEST_CHUNK))

      return VILLAGER_GATHER_DURATION_MS * batches
    }

    return VILLAGER_GATHER_DURATION_MS
  }

  static removeResourceById(worldStore, resourceId) {
    if (!resourceId) {
      return
    }

    const resources = worldStore.resources ?? []
    const resourceIndex = resources.findIndex((resource) => resource.id === resourceId)

    if (resourceIndex >= 0) {
      resources.splice(resourceIndex, 1)
    }
  }

  static isInsideWorld(tile, worldStore) {
    const width = worldStore.world?.width ?? 0
    const height = worldStore.world?.height ?? 0

    return tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height
  }

  static isWalkable(tile, worldStore) {
    return isTraversableWorldTile(worldStore, tile)
  }

  static isTileOccupied(tile, worldStore) {
    const entities = [
      ...(worldStore.buildings ?? []),
      ...(worldStore.resources ?? []),
      ...(worldStore.units ?? []),
    ]

    return entities.some((entity) => this.entityOccupiesTile(entity, tile))
  }

  static entityOccupiesTile(entity, tile) {
    if (!entity?.gridPos) {
      return false
    }

    return getOccupiedTiles(entity).some((occupiedTile) => {
      return occupiedTile.x === tile.x && occupiedTile.y === tile.y
    })
  }

  static getManhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }
}
