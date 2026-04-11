import { SIMULATION_TICK_MS, TILE_SIZE } from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'
import { seededRandom } from '../../core/seededRandom.js'

const SHEEP_MOVE_SPEED = 40
const SHEEP_TURN_INTERVAL_MIN_TICKS = 4
const SHEEP_TURN_INTERVAL_VARIATION_TICKS = 4

function getTileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function getWorldPositionFromTile(tile) {
  return {
    x: tile.x * TILE_SIZE + TILE_SIZE / 2,
    y: tile.y * TILE_SIZE + TILE_SIZE / 2,
  }
}

function getRandomFacing() {
  return Math.random() < 0.5 ? 'left' : 'right'
}

function isTileOccupied(worldStore, tile, ignoreEntityId) {
  const entities = [
    ...(worldStore.buildings ?? []),
    ...(worldStore.resources ?? []),
    ...(worldStore.units ?? []),
  ]

  for (const entity of entities) {
    if (!entity?.gridPos || entity.id === ignoreEntityId) {
      continue
    }

    if (
      getOccupiedTiles(entity).some((occupiedTile) => getTileKey(occupiedTile) === getTileKey(tile))
    ) {
      return true
    }
  }

  return false
}

function isMoveTargetValid(worldStore, sheep, tile) {
  if (!isTraversableWorldTile(worldStore, tile)) {
    return false
  }

  return !isTileOccupied(worldStore, tile, sheep.id)
}

export class SheepMovementSystem {
  static update(worldStore) {
    const sheepResources = worldStore.resources ?? []
    const currentTick = worldStore.tick ?? 0

    for (const sheep of sheepResources) {
      if (sheep.type !== 'sheep' || (sheep.amount ?? 0) <= 0) {
        continue
      }

      this.ensureSheepPosition(sheep)

      if (sheep.state !== 'moving') {
        continue
      }

      const motion = this.ensureMotionState(sheep, worldStore)
      this.updateSheepMotion(sheep, worldStore, motion, currentTick)
    }
  }

  static ensureSheepPosition(sheep) {
    if (sheep.pos && Number.isFinite(sheep.pos.x) && Number.isFinite(sheep.pos.y)) {
      return sheep.pos
    }

    const gridPos = sheep.gridPos ?? { x: 0, y: 0 }
    sheep.pos = getWorldPositionFromTile(gridPos)

    return sheep.pos
  }

  static ensureMotionState(sheep, worldStore) {
    if (sheep.motion) {
      if (!Number.isFinite(sheep.motion.nextTurnTick)) {
        sheep.motion.nextTurnTick = (worldStore.tick ?? 0) + this.getNextTurnIntervalTicks(sheep)
      }

      if (sheep.motion.direction !== 'left' && sheep.motion.direction !== 'right') {
        sheep.motion.direction = getRandomFacing()
      }

      if (!Number.isFinite(sheep.motion.speed) || sheep.motion.speed <= 0) {
        sheep.motion.speed = SHEEP_MOVE_SPEED
      }

      sheep.facing = sheep.motion.direction
      return sheep.motion
    }

    const motionSeed = `${worldStore.seed ?? 1}:sheep-motion:${sheep.id}`
    const motionRng = seededRandom(motionSeed)
    const turnIntervalTicks = SHEEP_TURN_INTERVAL_MIN_TICKS + motionRng.nextInt(
      SHEEP_TURN_INTERVAL_VARIATION_TICKS,
    )

    sheep.motion = {
      seed: motionSeed,
      cycle: 0,
      direction: getRandomFacing(),
      speed: SHEEP_MOVE_SPEED + motionRng.nextInt(9),
      turnIntervalTicks,
      nextTurnTick: (worldStore.tick ?? 0) + turnIntervalTicks,
    }

    sheep.facing = sheep.motion.direction

    return sheep.motion
  }

  static getNextTurnIntervalTicks(sheep) {
    const motionSeed = sheep.motion?.seed ?? `${sheep.id}:sheep-motion`
    const cycle = Number.isInteger(sheep.motion?.cycle) ? sheep.motion.cycle : 0
    const motionRng = seededRandom(`${motionSeed}:${cycle}`)

    return SHEEP_TURN_INTERVAL_MIN_TICKS + motionRng.nextInt(SHEEP_TURN_INTERVAL_VARIATION_TICKS)
  }

  static updateSheepMotion(sheep, worldStore, motion, currentTick) {
    if (currentTick >= motion.nextTurnTick) {
      this.turnSheep(sheep, motion, currentTick)
    }

    const deltaSeconds = SIMULATION_TICK_MS / 1000
    const directionMultiplier = motion.direction === 'left' ? -1 : 1
    const currentPosition = this.ensureSheepPosition(sheep)
    const speed = motion.speed ?? SHEEP_MOVE_SPEED
    const nextPosition = {
      x: currentPosition.x + directionMultiplier * speed * deltaSeconds,
      y: currentPosition.y,
    }

    if (!this.canAdvance(sheep, worldStore, currentPosition, nextPosition)) {
      this.turnSheep(sheep, motion, currentTick)

      const reversedMultiplier = motion.direction === 'left' ? -1 : 1
      const fallbackPosition = {
        x: currentPosition.x + reversedMultiplier * speed * deltaSeconds,
        y: currentPosition.y,
      }

      if (this.canAdvance(sheep, worldStore, currentPosition, fallbackPosition)) {
        sheep.pos = fallbackPosition
        this.syncGridPosition(sheep, fallbackPosition)
      }

      return
    }

    sheep.pos = nextPosition
    this.syncGridPosition(sheep, nextPosition)
  }

  static turnSheep(sheep, motion, currentTick) {
    motion.direction = motion.direction === 'left' ? 'right' : 'left'
    motion.cycle = (motion.cycle ?? 0) + 1
    motion.turnIntervalTicks = this.getNextTurnIntervalTicks(sheep)
    motion.nextTurnTick = currentTick + motion.turnIntervalTicks
    sheep.facing = motion.direction
  }

  static canAdvance(sheep, worldStore, currentPosition, nextPosition) {
    const currentTile = sheep.gridPos ?? this.getGridPositionFromWorldPosition(currentPosition)
    const nextTile = this.getGridPositionFromWorldPosition(nextPosition)

    if (!currentTile || !nextTile) {
      return false
    }

    if (currentTile.x === nextTile.x && currentTile.y === nextTile.y) {
      return true
    }

    return isMoveTargetValid(worldStore, sheep, nextTile)
  }

  static syncGridPosition(sheep, nextPosition) {
    const nextTile = this.getGridPositionFromWorldPosition(nextPosition)

    if (!nextTile) {
      return
    }

    sheep.gridPos = nextTile
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
