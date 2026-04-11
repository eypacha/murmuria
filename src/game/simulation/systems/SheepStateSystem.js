import { SIMULATION_TICK_MS } from '../../config/constants.js'
import { seededRandom } from '../../core/seededRandom.js'

const SHEEP_STATE_CHANGE_INTERVAL_MS = 10000
const SHEEP_STATE_CHANGE_INTERVAL_TICKS = Math.max(
  1,
  Math.round(SHEEP_STATE_CHANGE_INTERVAL_MS / SIMULATION_TICK_MS),
)
const SHEEP_STATES = ['idle', 'moving', 'eating']

function isValidSheepState(state) {
  return SHEEP_STATES.includes(state)
}

function pickNextState(currentState, rng) {
  const options = SHEEP_STATES.filter((state) => state !== currentState)

  if (options.length === 0) {
    return 'idle'
  }

  return options[rng.nextInt(options.length)] ?? 'idle'
}

export class SheepStateSystem {
  static update(worldStore) {
    const sheepResources = worldStore.resources ?? []
    const currentTick = worldStore.tick ?? 0

    for (const sheep of sheepResources) {
      if (sheep.type !== 'sheep' || (sheep.amount ?? 0) <= 0) {
        continue
      }

      this.ensureSheepStateSchedule(sheep, worldStore, currentTick)
    }
  }

  static ensureSheepStateSchedule(sheep, worldStore, currentTick) {
    if (!isValidSheepState(sheep.state)) {
      sheep.state = 'idle'
    }

    if (!Number.isFinite(sheep.stateUntilTick)) {
      sheep.stateUntilTick = currentTick + SHEEP_STATE_CHANGE_INTERVAL_TICKS
      sheep.stateCycle = Number.isInteger(sheep.stateCycle) ? sheep.stateCycle : 0
      return
    }

    if (currentTick < sheep.stateUntilTick) {
      return
    }

    const stateCycle = Number.isInteger(sheep.stateCycle) ? sheep.stateCycle : 0
    const stateSeed = `${worldStore.seed ?? 1}:sheep-state:${sheep.id}:${stateCycle}`
    const rng = seededRandom(stateSeed)

    sheep.state = pickNextState(sheep.state, rng)
    sheep.stateCycle = stateCycle + 1
    sheep.stateUntilTick = currentTick + SHEEP_STATE_CHANGE_INTERVAL_TICKS
  }
}
