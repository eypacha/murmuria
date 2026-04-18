import { GRID_HEIGHT, GRID_WIDTH, OFFSCREEN_MARGIN } from '../config/constants.js'
import { ENEMY_TEST_GROUP_TYPES } from '../config/enemyVariants.js'
import { createEnemy } from '../domain/factories/createEnemy.js'
import { findCastleSiegeTile } from './findCastleSiegeTile.js'

const GROUP_SPREAD = [0, 1, 2, 3]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function pickRandomSide() {
  const sides = ['left', 'right', 'top', 'bottom']
  return sides[Math.floor(Math.random() * sides.length)] ?? 'left'
}

function getSpawnBasePosition(side, castleCenter) {
  const centerX = Number(castleCenter?.x ?? GRID_WIDTH / 2)
  const centerY = Number(castleCenter?.y ?? GRID_HEIGHT / 2)
  const jitter = Math.floor(Math.random() * 5) - 2

  if (side === 'left') {
    return { x: -OFFSCREEN_MARGIN, y: centerY + jitter }
  }

  if (side === 'right') {
    return { x: GRID_WIDTH + OFFSCREEN_MARGIN, y: centerY + jitter }
  }

  if (side === 'top') {
    return { x: centerX + jitter, y: -OFFSCREEN_MARGIN }
  }

  return { x: centerX + jitter, y: GRID_HEIGHT + OFFSCREEN_MARGIN }
}

function getFormationPosition(side, basePosition, index) {
  const spread = GROUP_SPREAD[index] ?? index

  if (side === 'left') {
    return {
      x: basePosition.x - Math.floor(index / 2),
      y: basePosition.y + spread,
    }
  }

  if (side === 'right') {
    return {
      x: basePosition.x + Math.floor(index / 2),
      y: basePosition.y + spread,
    }
  }

  if (side === 'top') {
    return {
      x: basePosition.x + spread,
      y: basePosition.y - Math.floor(index / 2),
    }
  }

  return {
    x: basePosition.x + spread,
    y: basePosition.y + Math.floor(index / 2),
  }
}

function getEntryTile(side, siegeTile, worldStore) {
  const width = worldStore.world?.width ?? GRID_WIDTH
  const height = worldStore.world?.height ?? GRID_HEIGHT

  if (side === 'left') {
    return {
      x: 0,
      y: Math.max(0, Math.min(height - 1, Math.round(siegeTile.y))),
    }
  }

  if (side === 'right') {
    return {
      x: width - 1,
      y: Math.max(0, Math.min(height - 1, Math.round(siegeTile.y))),
    }
  }

  if (side === 'top') {
    return {
      x: Math.max(0, Math.min(width - 1, Math.round(siegeTile.x))),
      y: 0,
    }
  }

  return {
    x: Math.max(0, Math.min(width - 1, Math.round(siegeTile.x))),
    y: height - 1,
  }
}

export function spawnEnemyTestGroup(worldStore) {
  const castle = (worldStore.buildings ?? []).find((building) => building?.type === 'castle') ?? null

  if (!castle) {
    return []
  }

  const side = pickRandomSide()
  const basePosition = getSpawnBasePosition(side, castle.gridPos)
  const siegeTile = findCastleSiegeTile(castle, worldStore, {
    x: basePosition.x,
    y: basePosition.y,
  })

  if (!siegeTile) {
    return []
  }

  const tick = Number.isFinite(Number(worldStore.tick)) ? Number(worldStore.tick) : 0
  const entryTile = getEntryTile(side, siegeTile, worldStore)
  const enemies = ENEMY_TEST_GROUP_TYPES.map((type, index) => {
    const spawnPosition = getFormationPosition(side, basePosition, index)
    const x = clamp(spawnPosition.x, -OFFSCREEN_MARGIN, GRID_WIDTH + OFFSCREEN_MARGIN)
    const y = clamp(spawnPosition.y, -OFFSCREEN_MARGIN, GRID_HEIGHT + OFFSCREEN_MARGIN)

    return createEnemy(type, x, y, {
      targetX: siegeTile.x,
      targetY: siegeTile.y,
      spawnSide: side,
      entryX: entryTile.x,
      entryY: entryTile.y,
      spawnedTick: tick,
      state: 'spawning',
    })
  })

  worldStore.enemies = [...(worldStore.enemies ?? []), ...enemies]

  return enemies
}
