import { SIMULATION_TICK_MS, TILE_SIZE } from '../../config/constants.js'
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

      if (
        sheep.visualStateUntilTick != null &&
        currentTick > sheep.visualStateUntilTick
      ) {
        sheep.visualState = null
        sheep.visualStateUntilTick = null
      }

      if (sheep.combatLocked) {
        if (sheep.state !== 'idle') {
          this.stopSheepMovementAtTileCenter(sheep, 'idle', currentTick)
        }

        sheep.state = 'idle'
        sheep.stateUntilTick = null
        continue
      }

      this.ensureSheepStateSchedule(sheep, worldStore, currentTick)
    }
  }

  static stopSheepMovementAtTileCenter(sheep, nextState = 'idle', currentTick = 0) {
    if (!sheep) {
      return
    }

    const motionDirection =
      sheep.motion?.direction === 'left' || sheep.motion?.direction === 'right'
        ? sheep.motion.direction
        : sheep.facing === 'left' || sheep.facing === 'right'
          ? sheep.facing
          : 'right'

    const tile = sheep.gridPos ?? this.getGridPositionFromWorldPosition(sheep.pos)

    if (tile) {
      sheep.gridPos = { x: tile.x, y: tile.y }
      sheep.pos = {
        x: tile.x * TILE_SIZE + TILE_SIZE / 2,
        y: tile.y * TILE_SIZE + TILE_SIZE / 2,
      }
    }

    sheep.motion = null
    sheep.facing = motionDirection
    sheep.state = nextState
    sheep.stateUntilTick = null
    sheep.stateCycle = Number.isInteger(sheep.stateCycle) ? sheep.stateCycle : 0
    sheep.visualState = 'moving'
    sheep.visualStateUntilTick = currentTick + 1
  }

  static lockSheepAtTileCenter(sheep, currentTick = 0) {
    if (!sheep) {
      return
    }

    sheep.combatLocked = true
    this.stopSheepMovementAtTileCenter(sheep, 'idle', currentTick)
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
    const nextState = pickNextState(sheep.state, rng)

    if (sheep.state === 'moving' && nextState !== 'moving') {
      this.stopSheepMovementAtTileCenter(sheep, nextState, currentTick)
    } else {
      sheep.state = nextState
      sheep.motion = nextState === 'moving' ? sheep.motion : null
      if (nextState !== 'moving') {
        sheep.visualState = null
        sheep.visualStateUntilTick = null
      }
    }

    sheep.stateCycle = stateCycle + 1
    sheep.stateUntilTick = currentTick + SHEEP_STATE_CHANGE_INTERVAL_TICKS
  }

  static getGridPositionFromWorldPosition(position) {
    if (!position) {
      return null
    }

    return {
      x: Math.round((position.x - TILE_SIZE / 2) / TILE_SIZE),
      y: Math.round((position.y - TILE_SIZE / 2) / TILE_SIZE),
    }
  }
}
