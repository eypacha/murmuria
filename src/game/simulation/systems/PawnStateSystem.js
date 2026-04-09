import { SIMULATION_TICK_MS } from '../../config/constants.js'

const DEFAULT_STATE_DELAY_MS = 1000

function delayToTicks(delayMs) {
  return Math.max(1, Math.ceil(delayMs / SIMULATION_TICK_MS))
}

export class PawnStateSystem {
  static update(worldStore) {
    const pawns = worldStore.units ?? []
    const currentTick = worldStore.tick ?? 0

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (pawn.stateUntilTick == null) {
        continue
      }

      if (currentTick < pawn.stateUntilTick) {
        continue
      }

      if (pawn.nextState) {
        pawn.state = pawn.nextState
      }

      pawn.stateUntilTick = null
      pawn.nextState = null
    }
  }

  static queueTimedTransition(pawn, worldStore, nextState, delayMs = DEFAULT_STATE_DELAY_MS) {
    const currentTick = worldStore.tick ?? 0

    pawn.stateUntilTick = currentTick + delayToTicks(delayMs)
    pawn.nextState = nextState
  }
}
