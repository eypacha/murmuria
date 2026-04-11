import {
  VILLAGER_ARRIVAL_THRESHOLD,
  VILLAGER_PREPARE_TO_GATHER_MS,
  SIMULATION_TICK_MS,
  TILE_SIZE,
} from '../../config/constants.js'
import { findPath } from '../../core/findPath.js'
import { UnitStateSystem } from './UnitStateSystem.js'

export class MovementSystem {
  static update(worldStore) {
    const units = worldStore.units ?? []

    for (const unit of units) {
      if (unit.role !== 'villager') {
        continue
      }

      if (
        unit.state !== 'moving_to_tree' &&
        unit.state !== 'moving_to_gold' &&
        unit.state !== 'moving_to_meat' &&
        unit.state !== 'returning_to_castle' &&
        unit.state !== 'moving'
      ) {
        continue
      }

      const targetTile = this.getLiveTargetTile(worldStore, unit)

      if (!targetTile) {
        continue
      }

      this.moveUnitTowardTile(unit, targetTile, worldStore)
    }
  }

  static moveUnitTowardTile(unit, targetTile, worldStore) {
    const currentPosition = this.getCurrentWorldPosition(unit)
    const currentTile = unit.gridPos ?? this.getGridTileFromWorldPosition(currentPosition)

    if (!currentPosition || !currentTile) {
      return
    }

    const targetKey = this.getTileKey(targetTile)

    if (unit.pathGoalKey !== targetKey || !Array.isArray(unit.path) || unit.path.length === 0) {
      unit.path = findPath(worldStore, currentTile, targetTile)
      unit.pathGoalKey = targetKey
    }

    if (!Array.isArray(unit.path) || unit.path.length === 0) {
      if (currentTile.x === targetTile.x && currentTile.y === targetTile.y) {
        this.arriveAtTarget(unit, worldStore)
      } else if (unit.idleAction === 'talk' || unit.idleAction === 'wander') {
        UnitStateSystem.cancelIdleBehavior(unit, worldStore, worldStore.tick ?? 0)
      }

      return
    }

    const speed = unit.stats?.moveSpeed ?? 0

    if (speed <= 0) {
      return
    }

    const deltaTime = SIMULATION_TICK_MS / 1000
    let remainingStep = speed * deltaTime
    let nextPosition = { ...currentPosition }

    while (remainingStep > 0 && unit.path.length > 0) {
      const nextTile = unit.path[0]
      const targetPosition = this.gridTileToWorldPosition(nextTile)
      const dx = targetPosition.x - nextPosition.x
      const dy = targetPosition.y - nextPosition.y
      const distance = Math.hypot(dx, dy)

      if (distance <= VILLAGER_ARRIVAL_THRESHOLD || remainingStep >= distance) {
        nextPosition = {
          x: targetPosition.x,
          y: targetPosition.y,
        }
        unit.pos = nextPosition
        unit.gridPos = {
          x: nextTile.x,
          y: nextTile.y,
        }
        unit.path.shift()

        if (dx > 0) {
          unit.facing = 'right'
        } else if (dx < 0) {
          unit.facing = 'left'
        }

        remainingStep -= Math.min(distance, remainingStep)

        if (unit.path.length === 0) {
          unit.pathGoalKey = null
          this.arriveAtTarget(unit, worldStore)
          return
        }

        continue
      }

      const step = Math.min(remainingStep, distance)
      nextPosition = {
        x: nextPosition.x + (dx / distance) * step,
        y: nextPosition.y + (dy / distance) * step,
      }

      unit.pos = nextPosition

      if (dx > 0) {
        unit.facing = 'right'
      } else if (dx < 0) {
        unit.facing = 'left'
      }

      return
    }
  }

  static getLiveTargetTile(worldStore, unit) {
    const target = unit.target

    if (!target?.id || !target?.type) {
      return target?.tile ?? null
    }

    if (target.type === 'sheep') {
      return target.tile ?? null
    }

    if (target.type !== 'tree' && target.type !== 'gold') {
      return target.tile ?? null
    }

    const resource = (worldStore.resources ?? []).find((entity) => entity.id === target.id)

    if (!resource) {
      return target.tile ?? null
    }

    const liveTile =
      resource.type === 'sheep'
        ? this.getResourceTileFromWorldPosition(resource.pos ?? null) ?? resource.gridPos ?? null
        : resource.gridPos ?? null

    if (!liveTile) {
      return target.tile ?? null
    }

    if (
      !target.tile ||
      target.tile.x !== liveTile.x ||
      target.tile.y !== liveTile.y
    ) {
      target.tile = liveTile
      unit.path = []
      unit.pathGoalKey = null
    }

    return target.tile
  }

  static getCurrentWorldPosition(unit) {
    if (!unit.pos && unit.gridPos) {
      unit.pos = this.gridTileToWorldPosition(unit.gridPos)
    }

    return unit.pos ?? null
  }

  static arriveAtTarget(unit, worldStore) {
    unit.path = []
    unit.pathGoalKey = null

    if (unit.idleAction === 'wander') {
      unit.state = 'idle'
      unit.idleAction = null
      unit.talkPartner = null
      unit.talkTargetTile = null
      unit.talkStartedTick = null
      unit.talkUntilTick = null
      unit.target = null
      unit.idleSince = worldStore.tick ?? 0
      return
    }

    if (unit.idleAction === 'talk') {
      if (unit.interactionFacing === 'left' || unit.interactionFacing === 'right') {
        unit.facing = unit.interactionFacing
      }

      unit.state = 'waiting_to_talk'
      return
    }

    if (unit.target?.type === 'castle') {
      // Keep the carry animation active for one more tick so the unit reaches the castle visually
      // before the delivery state clears the resource.
      UnitStateSystem.queueTimedTransition(
        unit,
        worldStore,
        this.resolveDeliveryState(unit),
        SIMULATION_TICK_MS,
      )
      return
    }

    if (unit.target?.type === 'constructionSite') {
      unit.target = null
      unit.targetId = null
      unit.state = 'idle'
      unit.idleSince = worldStore.tick ?? 0
      return
    }

    if (unit.interactionFacing === 'left' || unit.interactionFacing === 'right') {
      unit.facing = unit.interactionFacing
    }

    unit.state = 'preparing_to_gather'
    UnitStateSystem.queueTimedTransition(unit, worldStore, 'gathering', VILLAGER_PREPARE_TO_GATHER_MS)
  }

  static resolveDeliveryState(unit) {
    if ((unit.inventory?.meat ?? 0) > 0 || unit.workTargetType === 'sheep') {
      return 'delivering_meat'
    }

    if ((unit.inventory?.gold ?? 0) > 0 || unit.workTargetType === 'gold') {
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

  static getResourceTileFromWorldPosition(position) {
    if (!position) {
      return null
    }

    return {
      x: Math.round((position.x - TILE_SIZE / 2) / TILE_SIZE),
      y: Math.round((position.y - TILE_SIZE / 2) / TILE_SIZE),
    }
  }

  static getTileKey(tile) {
    return `${tile.x}:${tile.y}`
  }
}
