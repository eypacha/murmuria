import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { PAWN_PREPARE_TO_TREE_MS } from '../../config/constants.js'
import { PawnStateSystem } from './PawnStateSystem.js'

export class DecisionSystem {
  static update(worldStore) {
    const woodPriority = worldStore.kingdom?.policies?.woodPriority ?? 0

    if (woodPriority <= 0) {
      return
    }

    const pawns = worldStore.units ?? []
    const trees = (worldStore.resources ?? []).filter((resource) => resource.type === 'tree')

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (pawn.state !== 'idle') {
        continue
      }

      if ((pawn.inventory?.wood ?? 0) > 0) {
        continue
      }

      const tree = this.findNearestAvailableTree(pawn, trees)

      if (!tree) {
        continue
      }

      const targetTile = this.findAdjacentTile(tree, pawn, worldStore)

      if (!targetTile) {
        continue
      }

      tree.reservedBy = pawn.id
      pawn.targetId = tree.id
      pawn.workTargetId = tree.id
      pawn.target = {
        type: 'tree',
        id: tree.id,
        tile: targetTile,
      }
      pawn.path = []
      pawn.pathGoalKey = null
      pawn.interactionFacing = this.getFacingForTree(tree, targetTile)
      pawn.facing = pawn.interactionFacing
      pawn.state = 'preparing_to_tree'
      PawnStateSystem.queueTimedTransition(pawn, worldStore, 'moving_to_tree', PAWN_PREPARE_TO_TREE_MS)
    }
  }

  static findNearestAvailableTree(pawn, trees) {
    const pawnPosition = this.getGridPosition(pawn)

    if (!pawnPosition) {
      return null
    }

    let nearestTree = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const tree of trees) {
      if (!this.isTreeAvailable(tree)) {
        continue
      }

      const treePosition = this.getGridPosition(tree)

      if (!treePosition) {
        continue
      }

      const distance = this.getManhattanDistance(pawnPosition, treePosition)

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestTree = tree
      }
    }

    return nearestTree
  }

  static findAdjacentTile(tree, pawn, worldStore) {
    const pawnPosition = this.getGridPosition(pawn)

    if (!pawnPosition) {
      return null
    }

    const candidates = [
      { x: tree.gridPos.x + 1, y: tree.gridPos.y },
      { x: tree.gridPos.x - 1, y: tree.gridPos.y },
    ]

    const validCandidates = candidates.filter((tile) => {
      if (!this.isInsideWorld(tile, worldStore)) {
        return false
      }

      if (!this.isWalkable(tile, worldStore)) {
        return false
      }

      return !this.isTileOccupied(tile, worldStore)
    })

    if (validCandidates.length === 0) {
      return null
    }

    let closestTile = validCandidates[0]
    let closestDistance = this.getManhattanDistance(pawnPosition, closestTile)

    for (let i = 1; i < validCandidates.length; i += 1) {
      const candidate = validCandidates[i]
      const distance = this.getManhattanDistance(pawnPosition, candidate)

      if (distance < closestDistance) {
        closestDistance = distance
        closestTile = candidate
      }
    }

    return closestTile
  }

  static getTargetResource(worldStore, unit) {
    const targetId = unit.target?.id ?? unit.targetId

    if (!targetId) {
      return null
    }

    return (worldStore.resources ?? []).find((resource) => resource.id === targetId) ?? null
  }

  static getFacingForTree(tree, targetTile) {
    if (targetTile.x > tree.gridPos.x) {
      return 'left'
    }

    return 'right'
  }

  static isTreeAvailable(tree) {
    return (
      (tree.reservedBy === null || tree.reservedBy === undefined) &&
      (tree.amount ?? 0) > 0
    )
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

  static getGridPosition(entity) {
    return entity.gridPos ?? entity.pos ?? null
  }

  static getManhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }
}
