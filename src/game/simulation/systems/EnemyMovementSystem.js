import { SIMULATION_TICK_MS } from '../../config/constants.js'
import { findPath } from '../../core/findPath.js'

const ENEMY_ARRIVAL_THRESHOLD = 0.05

function getStepDistance(enemy) {
  const speed = Number(enemy?.speed)

  if (!Number.isFinite(speed) || speed <= 0) {
    return 0
  }

  return speed * (SIMULATION_TICK_MS / 1000)
}

function getTileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function getEnemyTile(enemy) {
  if (enemy?.gridPos && Number.isFinite(enemy.gridPos.x) && Number.isFinite(enemy.gridPos.y)) {
    return enemy.gridPos
  }

  if (Number.isFinite(enemy?.x) && Number.isFinite(enemy?.y)) {
    return {
      x: Math.round(enemy.x),
      y: Math.round(enemy.y),
    }
  }

  return null
}

function isInsideWorld(worldStore, tile) {
  const width = worldStore.world?.width ?? 0
  const height = worldStore.world?.height ?? 0

  return (
    Number.isFinite(tile?.x) &&
    Number.isFinite(tile?.y) &&
    tile.x >= 0 &&
    tile.y >= 0 &&
    tile.x < width &&
    tile.y < height
  )
}

function getEntryTile(worldStore, enemy) {
  const width = worldStore.world?.width ?? 0
  const height = worldStore.world?.height ?? 0
  const targetTile = {
    x: Number.isFinite(enemy?.targetX) ? Math.round(enemy.targetX) : Math.floor(width / 2),
    y: Number.isFinite(enemy?.targetY) ? Math.round(enemy.targetY) : Math.floor(height / 2),
  }
  const side = enemy?.spawnSide ?? 'left'

  if (side === 'left') {
    return {
      x: 0,
      y: Math.max(0, Math.min(height - 1, targetTile.y)),
    }
  }

  if (side === 'right') {
    return {
      x: Math.max(0, width - 1),
      y: Math.max(0, Math.min(height - 1, targetTile.y)),
    }
  }

  if (side === 'top') {
    return {
      x: Math.max(0, Math.min(width - 1, targetTile.x)),
      y: 0,
    }
  }

  return {
    x: Math.max(0, Math.min(width - 1, targetTile.x)),
    y: Math.max(0, height - 1),
  }
}

function getTargetTile(enemy) {
  if (!Number.isFinite(enemy?.targetX) || !Number.isFinite(enemy?.targetY)) {
    return null
  }

  return {
    x: Math.round(enemy.targetX),
    y: Math.round(enemy.targetY),
  }
}

function getWorldPosition(tile) {
  return {
    x: tile.x,
    y: tile.y,
  }
}

export class EnemyMovementSystem {
  static update(worldStore) {
    const enemies = worldStore.enemies ?? []

    for (const enemy of enemies) {
      if (!enemy || enemy.state === 'dead') {
        continue
      }

      if (enemy.state === 'spawning') {
        enemy.state = 'marching'
      }

      if (enemy.state !== 'marching') {
        continue
      }

      this.moveEnemy(worldStore, enemy)
    }

    worldStore.enemies = enemies
  }

  static moveEnemy(worldStore, enemy) {
    const step = getStepDistance(enemy)

    if (step <= 0) {
      return
    }

    const targetTile = getTargetTile(enemy)

    if (!targetTile) {
      return
    }

    if (!Array.isArray(enemy.path)) {
      enemy.path = []
    }

    const currentTile = getEnemyTile(enemy)
    const insideWorld = isInsideWorld(worldStore, currentTile)

    if (!insideWorld) {
      const entryTile = getEntryTile(worldStore, enemy)
      const entryPosition = getWorldPosition(entryTile)
      const dx = entryPosition.x - enemy.x
      const dy = entryPosition.y - enemy.y
      const distance = Math.hypot(dx, dy)

      if (distance <= ENEMY_ARRIVAL_THRESHOLD) {
        enemy.x = entryPosition.x
        enemy.y = entryPosition.y
        enemy.gridPos = { ...entryTile }
        enemy.path = []
        enemy.pathGoalKey = null
        return
      }

      const stepRatio = Math.min(1, step / distance)
      enemy.x += dx * stepRatio
      enemy.y += dy * stepRatio
      enemy.facing = dx < 0 ? 'left' : 'right'

      const nextTile = getEnemyTile(enemy)
      if (isInsideWorld(worldStore, nextTile)) {
        enemy.gridPos = { ...nextTile }
      }

      return
    }

    const targetKey = getTileKey(targetTile)

    if (enemy.pathGoalKey !== targetKey || enemy.path.length === 0) {
      enemy.path = findPath(worldStore, currentTile ?? targetTile, targetTile)
      enemy.pathGoalKey = targetKey
    }

    if (enemy.path.length === 0) {
      if (currentTile && currentTile.x === targetTile.x && currentTile.y === targetTile.y) {
        enemy.x = targetTile.x
        enemy.y = targetTile.y
        enemy.gridPos = { ...targetTile }
        enemy.state = 'idle'
      }

      return
    }

    let remainingStep = step

    while (remainingStep > 0 && enemy.path.length > 0) {
      const nextTile = enemy.path[0]
      const nextPosition = getWorldPosition(nextTile)
      const dx = nextPosition.x - enemy.x
      const dy = nextPosition.y - enemy.y
      const distance = Math.hypot(dx, dy)

      if (distance <= ENEMY_ARRIVAL_THRESHOLD || remainingStep >= distance) {
        enemy.x = nextPosition.x
        enemy.y = nextPosition.y
        enemy.gridPos = { ...nextTile }
        enemy.path.shift()
        enemy.facing = dx < 0 ? 'left' : 'right'
        remainingStep -= Math.min(distance, remainingStep)

        if (enemy.path.length === 0) {
          enemy.state = 'idle'
          enemy.pathGoalKey = null
          return
        }

        continue
      }

      const ratio = remainingStep / distance
      enemy.x += dx * ratio
      enemy.y += dy * ratio
      enemy.facing = dx < 0 ? 'left' : 'right'
      return
    }
  }
}
