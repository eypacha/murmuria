import { getEnemyTypeConfig } from '../../config/enemyVariants.js'

function createCryptoUUID() {
  return globalThis.crypto?.randomUUID?.() ?? `enemy-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function resolveFacing(x, y, targetX, targetY) {
  const dx = Number(targetX) - Number(x)

  if (dx < 0) {
    return 'left'
  }

  if (dx > 0) {
    return 'right'
  }

  return Number(targetY) < Number(y) ? 'up' : 'down'
}

export function createEnemy(type, x = 0, y = 0, overrides = {}) {
  const config = getEnemyTypeConfig(type)
  const nextX = Number.isFinite(Number(overrides.x)) ? Number(overrides.x) : x
  const nextY = Number.isFinite(Number(overrides.y)) ? Number(overrides.y) : y
  const targetX = Number.isFinite(Number(overrides.targetX)) ? Number(overrides.targetX) : nextX
  const targetY = Number.isFinite(Number(overrides.targetY)) ? Number(overrides.targetY) : nextY

  return {
    id: overrides.id ?? createCryptoUUID(),
    type,
    x: nextX,
    y: nextY,
    hp: Number.isFinite(Number(overrides.hp)) ? Number(overrides.hp) : config.maxHp,
    maxHp: Number.isFinite(Number(overrides.maxHp)) ? Number(overrides.maxHp) : config.maxHp,
    speed: Number.isFinite(Number(overrides.speed)) ? Number(overrides.speed) : config.speed,
    state: overrides.state ?? 'spawning',
    targetX,
    targetY,
    spawnSide: overrides.spawnSide ?? null,
    entryX: Number.isFinite(Number(overrides.entryX)) ? Number(overrides.entryX) : null,
    entryY: Number.isFinite(Number(overrides.entryY)) ? Number(overrides.entryY) : null,
    spawnedTick: Number.isFinite(Number(overrides.spawnedTick)) ? Number(overrides.spawnedTick) : 0,
    facing: overrides.facing ?? resolveFacing(nextX, nextY, targetX, targetY),
    path: Array.isArray(overrides.path) ? [...overrides.path] : [],
    pathGoalKey: overrides.pathGoalKey ?? null,
  }
}
