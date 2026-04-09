import {
  PAWN_ARRIVAL_THRESHOLD,
  PAWN_PREPARE_TO_GATHER_MS,
  SIMULATION_TICK_MS,
  TILE_SIZE,
} from '../../config/constants.js'
import { findPath } from '../../core/findPath.js'
import { PawnStateSystem } from './PawnStateSystem.js'

export class MovementSystem {
  static update(worldStore) {
    const pawns = worldStore.units ?? []

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (
        pawn.state !== 'moving_to_tree' &&
        pawn.state !== 'moving_to_gold' &&
        pawn.state !== 'returning_to_castle' &&
        pawn.state !== 'moving'
      ) {
        continue
      }

      const targetTile = pawn.target?.tile

      if (!targetTile) {
        continue
      }

      this.movePawnTowardTile(pawn, targetTile, worldStore)
    }
  }

  static movePawnTowardTile(pawn, targetTile, worldStore) {
    const currentPosition = this.getCurrentWorldPosition(pawn)
    const currentTile = pawn.gridPos ?? this.getGridTileFromWorldPosition(currentPosition)

    if (!currentPosition || !currentTile) {
      return
    }

    const targetKey = this.getTileKey(targetTile)

    if (pawn.pathGoalKey !== targetKey || !Array.isArray(pawn.path) || pawn.path.length === 0) {
      pawn.path = findPath(worldStore, currentTile, targetTile)
      pawn.pathGoalKey = targetKey
    }

    if (!Array.isArray(pawn.path) || pawn.path.length === 0) {
      if (currentTile.x === targetTile.x && currentTile.y === targetTile.y) {
        this.arriveAtTarget(pawn, worldStore)
      }

      return
    }

    const speed = pawn.stats?.moveSpeed ?? 0

    if (speed <= 0) {
      return
    }

    const deltaTime = SIMULATION_TICK_MS / 1000
    let remainingStep = speed * deltaTime
    let nextPosition = { ...currentPosition }

    while (remainingStep > 0 && pawn.path.length > 0) {
      const nextTile = pawn.path[0]
      const targetPosition = this.gridTileToWorldPosition(nextTile)
      const dx = targetPosition.x - nextPosition.x
      const dy = targetPosition.y - nextPosition.y
      const distance = Math.hypot(dx, dy)

      if (distance <= PAWN_ARRIVAL_THRESHOLD || remainingStep >= distance) {
        nextPosition = {
          x: targetPosition.x,
          y: targetPosition.y,
        }
        pawn.pos = nextPosition
        pawn.gridPos = {
          x: nextTile.x,
          y: nextTile.y,
        }
        pawn.path.shift()

        if (dx > 0) {
          pawn.facing = 'right'
        } else if (dx < 0) {
          pawn.facing = 'left'
        }

        remainingStep -= Math.min(distance, remainingStep)

        if (pawn.path.length === 0) {
          pawn.pathGoalKey = null
          this.arriveAtTarget(pawn, worldStore)
          return
        }

        continue
      }

      const step = Math.min(remainingStep, distance)
      nextPosition = {
        x: nextPosition.x + (dx / distance) * step,
        y: nextPosition.y + (dy / distance) * step,
      }

      pawn.pos = nextPosition

      if (dx > 0) {
        pawn.facing = 'right'
      } else if (dx < 0) {
        pawn.facing = 'left'
      }

      return
    }
  }

  static getCurrentWorldPosition(pawn) {
    if (!pawn.pos && pawn.gridPos) {
      pawn.pos = this.gridTileToWorldPosition(pawn.gridPos)
    }

    return pawn.pos ?? null
  }

  static arriveAtTarget(pawn, worldStore) {
    pawn.path = []
    pawn.pathGoalKey = null

    if (pawn.target?.type === 'castle') {
      pawn.state = this.resolveDeliveryState(pawn)
      return
    }

    if (pawn.interactionFacing === 'left' || pawn.interactionFacing === 'right') {
      pawn.facing = pawn.interactionFacing
    }

    pawn.state = 'preparing_to_gather'
    PawnStateSystem.queueTimedTransition(pawn, worldStore, 'gathering', PAWN_PREPARE_TO_GATHER_MS)
  }

  static resolveDeliveryState(pawn) {
    if ((pawn.inventory?.gold ?? 0) > 0 || pawn.workTargetType === 'gold') {
      return 'delivering_gold'
    }

    return 'delivering_wood'
  }

  static gridTileToWorldPosition(tile) {
    return {
      x: tile.x * TILE_SIZE + TILE_SIZE / 2,
      y: tile.y * TILE_SIZE + TILE_SIZE / 2,
    }
  }

  static getGridTileFromWorldPosition(position) {
    if (!position) {
      return null
    }

    return {
      x: Math.floor(position.x / TILE_SIZE),
      y: Math.floor(position.y / TILE_SIZE),
    }
  }

  static getTileKey(tile) {
    return `${tile.x}:${tile.y}`
  }
}
