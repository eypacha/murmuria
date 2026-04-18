import Phaser from 'phaser'
import { DEBUG_MODE, SIMULATION_TICK_MS, TILE_SIZE, UNIT_RENDER_OFFSET_Y } from '../config/constants.js'
import { getEnemyTypeConfig } from '../config/enemyVariants.js'

const DEBUG_ENEMY_BORDER_COLOR = 0xff4d4d

function getEnemyRenderPosition(enemy) {
  return {
    x: enemy.x * TILE_SIZE + TILE_SIZE / 2,
    y: enemy.y * TILE_SIZE + TILE_SIZE / 2 + UNIT_RENDER_OFFSET_Y,
  }
}

function resolveEnemyAnimationKey(enemy) {
  const config = getEnemyTypeConfig(enemy?.type)

  return enemy?.state === 'marching' ? config.runKey : config.idleKey
}

function getDebugTileRect(enemy) {
  if (enemy?.gridPos && Number.isFinite(enemy.gridPos.x) && Number.isFinite(enemy.gridPos.y)) {
    return {
      x: enemy.gridPos.x * TILE_SIZE,
      y: enemy.gridPos.y * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
    }
  }

  if (Number.isFinite(enemy?.x) && Number.isFinite(enemy?.y)) {
    return {
      x: Math.round(enemy.x) * TILE_SIZE,
      y: Math.round(enemy.y) * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
    }
  }

  return null
}

export class EnemySpriteController {
  constructor(scene, enemy) {
    this.scene = scene
    this.enemy = enemy
    this.currentAnimationKey = null
    this.startPosition = null
    this.targetPosition = null
    this.elapsed = 0
    this.debugBorder = DEBUG_MODE ? scene.add.graphics() : null

    const initialPosition = getEnemyRenderPosition(enemy)
    const initialAnimationKey = resolveEnemyAnimationKey(enemy)
    const config = getEnemyTypeConfig(enemy?.type)

    this.startPosition = { ...initialPosition }
    this.targetPosition = { ...initialPosition }

    this.sprite = scene.add.sprite(initialPosition.x, initialPosition.y, initialAnimationKey)
    this.sprite.setOrigin(0.5, 0.9)
    this.sprite.setDisplaySize(config.displayWidth, config.displayHeight)
    this.sprite.setDepth(initialPosition.y)
    this.sprite.setFlipX(this.enemy?.facing === 'left')
    this.sprite.play(initialAnimationKey, true)

    this.currentAnimationKey = initialAnimationKey

    if (this.debugBorder) {
      this.updateDebugBorder()
    }
  }

  update() {
    if (!this.sprite || !this.enemy) {
      return
    }

    this.updatePosition()
    this.updateAnimation()
    this.updateFacing()
    this.updateDebugBorder()
  }

  updatePosition() {
    const targetPosition = getEnemyRenderPosition(this.enemy)
    const targetChanged =
      !this.targetPosition ||
      targetPosition.x !== this.targetPosition.x ||
      targetPosition.y !== this.targetPosition.y

    if (targetChanged) {
      this.startPosition = {
        x: this.sprite.x,
        y: this.sprite.y,
      }
      this.targetPosition = {
        x: targetPosition.x,
        y: targetPosition.y,
      }
      this.elapsed = 0
    }

    const delta = this.scene.getVisualDelta?.(this.scene.game.loop.delta ?? 0) ?? 0
    this.elapsed = Math.min(SIMULATION_TICK_MS, this.elapsed + delta)

    const progress = SIMULATION_TICK_MS > 0 ? this.elapsed / SIMULATION_TICK_MS : 1
    const nextX = Phaser.Math.Linear(this.startPosition.x, this.targetPosition.x, progress)
    const nextY = Phaser.Math.Linear(this.startPosition.y, this.targetPosition.y, progress)

    this.sprite.setPosition(nextX, nextY)
    this.sprite.setDepth(nextY)
  }

  updateAnimation() {
    const nextAnimationKey = resolveEnemyAnimationKey(this.enemy)

    if (this.currentAnimationKey === nextAnimationKey) {
      return
    }

    this.currentAnimationKey = nextAnimationKey
    this.sprite.play(nextAnimationKey, true)
  }

  updateFacing() {
    if (this.enemy?.facing !== 'left' && this.enemy?.facing !== 'right') {
      return
    }

    this.sprite.setFlipX(this.enemy.facing === 'left')
  }

  updateDebugBorder() {
    if (!this.debugBorder) {
      return
    }

    const rect = getDebugTileRect(this.enemy)

    this.debugBorder.clear()

    if (!rect) {
      return
    }

    this.debugBorder.lineStyle(2, DEBUG_ENEMY_BORDER_COLOR, 1)
    this.debugBorder.strokeRect(rect.x, rect.y, rect.width, rect.height)
    this.debugBorder.setDepth((this.sprite?.y ?? 0) - 0.01)
  }

  destroy() {
    if (this.debugBorder) {
      this.debugBorder.destroy()
      this.debugBorder = null
    }

    if (this.sprite) {
      this.sprite.destroy()
      this.sprite = null
    }
  }
}
