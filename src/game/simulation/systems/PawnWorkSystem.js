import {
  PAWN_CARRY_CAPACITY_GOLD,
  PAWN_CARRY_CAPACITY_MEAT,
  PAWN_CARRY_CAPACITY_WOOD,
  PAWN_GATHER_DURATION_MS,
  PAWN_GOLD_HARVEST_CHUNK,
  PAWN_MEAT_HARVEST_CHUNK,
  PAWN_PREPARE_TO_RETURN_MS,
  PAWN_WOOD_HARVEST_CHUNK,
} from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'
import { PawnStateSystem } from './PawnStateSystem.js'

export class PawnWorkSystem {
  static update(worldStore) {
    const pawns = worldStore.units ?? []

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (pawn.state === 'gathering') {
        this.ensureGatherTimer(pawn, worldStore)
        continue
      }

      if (pawn.state === 'gathering_complete') {
        this.completeGather(pawn, worldStore)
        continue
      }

      if (
        pawn.state === 'delivering_wood' ||
        pawn.state === 'delivering_gold' ||
        pawn.state === 'delivering_meat'
      ) {
        this.completeDelivery(pawn, worldStore)
      }
    }
  }

  static ensureGatherTimer(pawn, worldStore) {
    if (pawn.stateUntilTick != null) {
      return
    }

    const resource = this.getResourceById(worldStore, pawn.workTargetId ?? pawn.targetId)
    const resourceType = this.getWorkTargetType(pawn, resource)
    const resourceAmount = Math.max(0, resource?.amount ?? 0)
    const gatherDurationMs = this.getGatherDuration(resourceType, resourceAmount)

    if (resourceType === 'sheep' && resource) {
      resource.state = 'idle'
    }

    PawnStateSystem.queueTimedTransition(pawn, worldStore, 'gathering_complete', gatherDurationMs)
  }

  static completeGather(pawn, worldStore) {
    const resource = this.getResourceById(worldStore, pawn.workTargetId ?? pawn.targetId)
    const resourceType = this.getWorkTargetType(pawn, resource)
    const resourceAmount = Math.max(0, resource?.amount ?? 0)
    const inventoryKey = this.getInventoryKey(resourceType)
    const carryCapacity = this.getCarryCapacity(pawn, resourceType)
    const harvestChunk = this.getHarvestChunk(resourceType)

    pawn.inventory = pawn.inventory ?? { wood: 0, gold: 0, meat: 0 }
    const currentAmount = Math.max(0, pawn.inventory[inventoryKey] ?? 0)
    const availableCapacity = Math.max(0, carryCapacity - currentAmount)
    const transferAmount =
      resourceType === 'sheep'
        ? resourceAmount
        : Math.min(harvestChunk, availableCapacity, resourceAmount)

    if (transferAmount > 0) {
      pawn.inventory[inventoryKey] = currentAmount + transferAmount

      if (resource) {
        if (resourceType === 'sheep') {
          resource.state = 'idle'
        }

        resource.amount = Math.max(0, resourceAmount - transferAmount)
      }
    }

    if (resourceType === 'sheep') {
      this.removeResourceById(worldStore, resource?.id ?? pawn.workTargetId ?? pawn.targetId)
    }

    this.beginReturnToCastle(pawn, worldStore)
  }

  static beginReturnToCastle(pawn, worldStore) {
    const castle = this.getCastle(worldStore)
    const returnTile = castle ? this.findCastleDropTile(castle, worldStore) : null

    if (castle && returnTile) {
      pawn.targetId = castle.id
      pawn.target = {
        type: 'castle',
        id: castle.id,
        tile: returnTile,
      }
      pawn.path = []
      pawn.pathGoalKey = null
      const pawnX = pawn.gridPos?.x

      if (pawnX != null) {
        if (returnTile.x > pawnX) {
          pawn.facing = 'right'
        } else if (returnTile.x < pawnX) {
          pawn.facing = 'left'
        }
      }
    }

    pawn.state = 'preparing_to_return'
    PawnStateSystem.queueTimedTransition(pawn, worldStore, 'returning_to_castle', PAWN_PREPARE_TO_RETURN_MS)
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

  static completeDelivery(pawn, worldStore) {
    pawn.inventory = pawn.inventory ?? { wood: 0, gold: 0, meat: 0 }
    const resourceType = this.getCarriedResourceType(pawn)
    const inventoryKey = this.getInventoryKey(resourceType)
    const carriedAmount = Math.max(0, pawn.inventory[inventoryKey] ?? 0)

    if (carriedAmount > 0) {
      const kingdomResourceKey = this.getKingdomResourceKey(resourceType)
      worldStore.kingdom.resources[kingdomResourceKey] =
        (worldStore.kingdom.resources[kingdomResourceKey] ?? 0) + carriedAmount
      pawn.inventory[inventoryKey] = 0
    }

    const resource = this.getResourceById(worldStore, pawn.workTargetId ?? pawn.targetId)

    if (resource) {
      resource.reservedBy = null
    }

    pawn.workTargetId = null
    pawn.workTargetType = null
    pawn.targetId = null
    pawn.target = null
    pawn.interactionFacing = null
    if (pawn.equipment) {
      pawn.equipment.tool = null
    }
    pawn.path = []
    pawn.pathGoalKey = null
    pawn.stateUntilTick = null
    pawn.nextState = null
    pawn.state = 'idle'
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
