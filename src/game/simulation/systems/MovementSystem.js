import { SIMULATION_TICK_MS, TILE_SIZE } from '../../config/constants.js'
import { PawnStateSystem } from './PawnStateSystem.js'

const ARRIVAL_THRESHOLD = 4

export class MovementSystem {
  static update(worldStore) {
    const pawns = worldStore.units ?? []

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (pawn.state !== 'moving_to_tree' && pawn.state !== 'moving') {
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
    const targetPosition = this.gridTileToWorldPosition(targetTile)
    const currentPosition = this.getCurrentWorldPosition(pawn)

    if (!currentPosition) {
      return
    }

    const dx = targetPosition.x - currentPosition.x
    const dy = targetPosition.y - currentPosition.y
    const distance = Math.hypot(dx, dy)

    if (distance < ARRIVAL_THRESHOLD) {
      pawn.pos = {
        x: targetPosition.x,
        y: targetPosition.y,
      }
      pawn.gridPos = {
        x: targetTile.x,
        y: targetTile.y,
      }
      pawn.state = 'preparing_to_gather'
      PawnStateSystem.queueTimedTransition(pawn, worldStore, 'gathering')
      return
    }

    const speed = pawn.stats?.moveSpeed ?? 0

    if (speed <= 0) {
      return
    }

    const deltaTime = SIMULATION_TICK_MS / 1000
    const step = Math.min(speed * deltaTime, distance)
    const nextPosition = {
      x: currentPosition.x + (dx / distance) * step,
      y: currentPosition.y + (dy / distance) * step,
    }

    pawn.pos = nextPosition
  }

  static getCurrentWorldPosition(pawn) {
    if (!pawn.pos && pawn.gridPos) {
      pawn.pos = this.gridTileToWorldPosition(pawn.gridPos)
    }

    return pawn.pos ?? null
  }

  static gridTileToWorldPosition(tile) {
    return {
      x: tile.x * TILE_SIZE + TILE_SIZE / 2,
      y: tile.y * TILE_SIZE + TILE_SIZE / 2,
    }
  }
}
