import {
  PAWN_CARRY_CAPACITY_WOOD,
  PAWN_GATHER_DURATION_MS,
  PAWN_PREPARE_TO_RETURN_MS,
  PAWN_WOOD_HARVEST_CHUNK,
} from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
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

      if (pawn.state === 'delivering_wood') {
        this.completeDelivery(pawn, worldStore)
      }
    }
  }

  static ensureGatherTimer(pawn, worldStore) {
    if (pawn.stateUntilTick != null) {
      return
    }

    PawnStateSystem.queueTimedTransition(pawn, worldStore, 'gathering_complete', PAWN_GATHER_DURATION_MS)
  }

  static completeGather(pawn, worldStore) {
    const tree = this.getTreeById(worldStore, pawn.workTargetId ?? pawn.targetId)
    const treeAmount = Math.max(0, tree?.amount ?? 0)
    const carryCapacity = pawn.stats?.carryCapacityWood ?? PAWN_CARRY_CAPACITY_WOOD
    pawn.inventory = pawn.inventory ?? { wood: 0 }
    const currentWood = Math.max(0, pawn.inventory.wood ?? 0)
    const availableCapacity = Math.max(0, carryCapacity - currentWood)
    const transferAmount = Math.min(PAWN_WOOD_HARVEST_CHUNK, availableCapacity, treeAmount)

    if (transferAmount > 0) {
      pawn.inventory.wood = currentWood + transferAmount

      if (tree) {
        tree.amount = Math.max(0, treeAmount - transferAmount)
      }
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
      pawn.facing = returnTile.x > (pawn.gridPos?.x ?? returnTile.x) ? 'right' : 'left'
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
    pawn.inventory = pawn.inventory ?? { wood: 0 }
    const carriedWood = Math.max(0, pawn.inventory.wood ?? 0)

    if (carriedWood > 0) {
      worldStore.kingdom.resources.wood += carriedWood
      pawn.inventory.wood = 0
    }

    const tree = this.getTreeById(worldStore, pawn.workTargetId ?? pawn.targetId)

    if (tree) {
      tree.reservedBy = null
    }

    pawn.workTargetId = null
    pawn.targetId = null
    pawn.target = null
    pawn.interactionFacing = null
    pawn.path = []
    pawn.pathGoalKey = null
    pawn.stateUntilTick = null
    pawn.nextState = null
    pawn.state = 'idle'
  }

  static getCastle(worldStore) {
    return (worldStore.buildings ?? []).find((building) => building.type === 'castle') ?? null
  }

  static getTreeById(worldStore, treeId) {
    if (!treeId) {
      return null
    }

    return (worldStore.resources ?? []).find((resource) => resource.id === treeId) ?? null
  }

  static isInsideWorld(tile, worldStore) {
    const width = worldStore.world?.width ?? 0
    const height = worldStore.world?.height ?? 0

    return tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height
  }

  static isWalkable(tile, worldStore) {
    return worldStore.world?.tiles?.[tile.y]?.[tile.x]?.walkable ?? false
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
