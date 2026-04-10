import {
  PAWN_CARRY_CAPACITY_GOLD,
  PAWN_CARRY_CAPACITY_MEAT,
  PAWN_CARRY_CAPACITY_WOOD,
  PAWN_GATHER_DURATION_MS,
  PAWN_GOLD_HARVEST_CHUNK,
  PAWN_MEAT_HARVEST_CHUNK,
  PAWN_PREPARE_TO_RETURN_MS,
  PAWN_WOOD_HARVEST_CHUNK,
  TILE_SIZE,
} from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'
import { PawnStateSystem } from './PawnStateSystem.js'
import { computeWorkSpeedMultiplier } from './KingSpeechIntentSystem.js'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function computeTaskAbandonChance(kingdom) {
  const morale = kingdom?.morale ?? 0
  return clamp(0.05 - morale * 0.003, 0.01, 0.08)
}

export class PawnWorkSystem {
  static update(worldStore) {
    const units = worldStore.units ?? []

    for (const unit of units) {
      if (unit.role !== 'pawn') {
        continue
      }

      if (unit.state === 'gathering') {
        if (Math.random() < computeTaskAbandonChance(worldStore.kingdom)) {
          this.abandonWork(unit, worldStore)
          continue
        }

        this.ensureGatherTimer(unit, worldStore)
        continue
      }

      if (unit.state === 'gathering_complete') {
        this.completeGather(unit, worldStore)
        continue
      }

      if (
        unit.state === 'delivering_wood' ||
        unit.state === 'delivering_gold' ||
        unit.state === 'delivering_meat'
      ) {
        this.completeDelivery(unit, worldStore)
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

    PawnStateSystem.queueTimedTransition(unit, worldStore, 'gathering_complete', gatherDurationMs)
  }

  static completeGather(unit, worldStore) {
    const resource = this.getResourceById(worldStore, unit.workTargetId ?? unit.targetId)
    const resourceType = this.getWorkTargetType(unit, resource)
    const resourceAmount = Math.max(0, resource?.amount ?? 0)
    const inventoryKey = this.getInventoryKey(resourceType)
    const carryCapacity = this.getCarryCapacity(unit, resourceType)
    const harvestChunk = this.getHarvestChunk(resourceType)
    const workSpeedMultiplier = computeWorkSpeedMultiplier(worldStore.kingdom)

    unit.inventory = unit.inventory ?? { wood: 0, gold: 0, meat: 0 }
    const currentAmount = Math.max(0, unit.inventory[inventoryKey] ?? 0)
    const availableCapacity = Math.max(0, carryCapacity - currentAmount)
    const transferAmount =
      resourceType === 'sheep'
        ? resourceAmount * workSpeedMultiplier
        : Math.min(harvestChunk * workSpeedMultiplier, availableCapacity, resourceAmount)

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

  static abandonWork(unit, worldStore) {
    const resource = this.getResourceById(worldStore, unit.workTargetId ?? unit.targetId)

    if (resource) {
      resource.reservedBy = null
    }

    unit.workTargetId = null
    unit.workTargetType = null
    unit.targetId = null
    unit.target = null
    unit.interactionFacing = null
    unit.path = []
    unit.pathGoalKey = null
    unit.stateUntilTick = null
    unit.nextState = null
    unit.state = 'idle'
    unit.idleSince = worldStore.tick ?? 0
    unit.idleAction = null

    if (unit.equipment) {
      unit.equipment.tool = null
    }
  }

  static beginReturnToCastle(unit, worldStore) {
    const castle = this.getCastle(worldStore)
    const returnTile = castle ? this.findCastleDropTile(castle, worldStore) : null

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
    PawnStateSystem.queueTimedTransition(unit, worldStore, 'returning_to_castle', PAWN_PREPARE_TO_RETURN_MS)
  }

  static findCastleDropTile(castle, worldStore) {
    const footprint = castle.footprint ?? { w: 1, h: 1 }
    const centerTile = {
      x: castle.gridPos.x + Math.floor(footprint.w / 2),
      y: castle.gridPos.y + footprint.h,
    }

    if (!this.isInsideWorld(centerTile, worldStore)) {
      return null
    }

    if (!this.isWalkable(centerTile, worldStore)) {
      return null
    }

    return centerTile
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

  static getCastle(worldStore) {
    return (worldStore.buildings ?? []).find((building) => building.type === 'castle') ?? null
  }

  static getResourceById(worldStore, resourceId) {
    if (!resourceId) {
      return null
    }

    return (worldStore.resources ?? []).find((resource) => resource.id === resourceId) ?? null
  }

  static getFacingTowardResource(pawn, resource) {
    const pawnX = this.getWorldCenterX(pawn)
    const resourceX = this.getResourceCenterX(resource)

    if (!Number.isFinite(pawnX) || !Number.isFinite(resourceX)) {
      return null
    }

    if (resourceX > pawnX) {
      return 'right'
    }

    if (resourceX < pawnX) {
      return 'left'
    }

    return pawn.interactionFacing === 'left' || pawn.interactionFacing === 'right'
      ? pawn.interactionFacing
      : pawn.facing === 'left' || pawn.facing === 'right'
        ? pawn.facing
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

  static getWorkTargetType(pawn, resource) {
    return pawn.workTargetType ?? resource?.type ?? 'tree'
  }

  static getCarriedResourceType(pawn) {
    if ((pawn.inventory?.meat ?? 0) > 0) {
      return 'meat'
    }

    if ((pawn.inventory?.gold ?? 0) > 0) {
      return 'gold'
    }

    if ((pawn.inventory?.wood ?? 0) > 0) {
      return 'wood'
    }

    return pawn.workTargetType ?? 'wood'
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

  static getCarryCapacity(pawn, resourceType) {
    if (resourceType === 'gold') {
      return pawn.stats?.carryCapacityGold ?? PAWN_CARRY_CAPACITY_GOLD
    }

    if (resourceType === 'sheep' || resourceType === 'meat') {
      return pawn.stats?.carryCapacityMeat ?? PAWN_CARRY_CAPACITY_MEAT
    }

    return pawn.stats?.carryCapacityWood ?? PAWN_CARRY_CAPACITY_WOOD
  }

  static getHarvestChunk(resourceType) {
    if (resourceType === 'gold') {
      return PAWN_GOLD_HARVEST_CHUNK
    }

    if (resourceType === 'sheep' || resourceType === 'meat') {
      return PAWN_MEAT_HARVEST_CHUNK
    }

    return PAWN_WOOD_HARVEST_CHUNK
  }

  static getGatherDuration(resourceType, resourceAmount) {
    if (resourceType === 'sheep') {
      const batches = Math.max(1, Math.ceil(resourceAmount / PAWN_MEAT_HARVEST_CHUNK))

      return PAWN_GATHER_DURATION_MS * batches
    }

    return PAWN_GATHER_DURATION_MS
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
