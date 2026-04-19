import Phaser from 'phaser'
import { DEBUG_MODE, SIMULATION_TICK_MS, TILE_SIZE, UNIT_RENDER_OFFSET_Y } from '../config/constants.js'
import { getEnemyTypeConfig } from '../config/enemyVariants.js'

const DEBUG_ENEMY_BORDER_COLOR = 0xff4d4d
const DEBUG_ENEMY_HEALTH_LABEL_FONT_SIZE = '14px'
const DEBUG_ENEMY_HEALTH_LABEL_OFFSET_Y = 50
const ENEMY_HIT_TINT_COLOR = 0xff6b6b
const ENEMY_HIT_FLASH_MS = 90
const CASTLE_DEPTH_EPSILON = 0.1

function getEnemyRenderPosition(enemy) {
  return {
    x: enemy.x * TILE_SIZE + TILE_SIZE / 2,
    y: enemy.y * TILE_SIZE + TILE_SIZE / 2 + UNIT_RENDER_OFFSET_Y,
  }
}

function getCastle(worldStore) {
  return (worldStore?.buildings ?? []).find((building) => building?.type === 'castle') ?? null
}

function getCastleDepth(castle) {
  const footprint = castle?.footprint ?? { w: 1, h: 1 }
  const castleBaseY = (castle?.gridPos?.y ?? 0) + footprint.h

  return castleBaseY * TILE_SIZE + CASTLE_DEPTH_EPSILON
}

function getEnemyRenderDepth(scene, enemy, positionY) {
  const worldStore = scene?.worldStore
  const castle = getCastle(worldStore)

  if (enemy?.type === 'knight' && enemy?.combatTargetType === 'castle' && castle) {
    return getCastleDepth(castle) + 1
  }

  return positionY
}

function resolveEnemyVisual(enemy, currentTick) {
  const config = getEnemyTypeConfig(enemy?.type)
  const attackUntilTick = Number(enemy?.combatAttackUntilTick ?? -1)

  if (config.attackKey && Number.isFinite(attackUntilTick) && currentTick <= attackUntilTick) {
    return {
      key: config.attackKey,
      isStatic: false,
    }
  }

  return {
    key: enemy?.state === 'marching' ? config.runKey : config.idleKey,
    isStatic: false,
  }
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
    this.currentVisualIsStatic = false
    this.healthFlashTimer = null
    this.lastHealth = this.getCurrentHealth()
    this.healthLabel = null
    this.startPosition = null
    this.targetPosition = null
    this.elapsed = 0
    this.debugBorder = DEBUG_MODE ? scene.add.graphics() : null

    const initialPosition = getEnemyRenderPosition(enemy)
    const initialVisual = resolveEnemyVisual(enemy, scene.worldStore?.tick ?? 0)
    const config = getEnemyTypeConfig(enemy?.type)

    this.startPosition = { ...initialPosition }
    this.targetPosition = { ...initialPosition }

    this.sprite = scene.add.sprite(initialPosition.x, initialPosition.y, initialVisual.key)
    this.sprite.setOrigin(0.5, 0.9)
    this.sprite.setDisplaySize(config.displayWidth, config.displayHeight)
    this.sprite.setDepth(getEnemyRenderDepth(scene, enemy, initialPosition.y))
    this.sprite.setFlipX(this.enemy?.facing === 'left')
    if (!initialVisual.isStatic) {
      this.sprite.play(initialVisual.key, true)
    }

    this.currentAnimationKey = initialVisual.key
    this.currentVisualIsStatic = initialVisual.isStatic

    if (this.debugBorder) {
      this.updateDebugBorder()
    }
    if (DEBUG_MODE) {
      this.updateHealthLabel()
    }
  }

  update() {
    if (!this.sprite || !this.enemy) {
      return
    }

    this.updateHealthFlash()
    this.updatePosition()
    this.updateAnimation()
    this.updateFacing()
    this.updateDebugBorder()
    this.updateHealthLabel()
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
    const depth = getEnemyRenderDepth(this.scene, this.enemy, nextY)

    this.sprite.setPosition(nextX, nextY)
    this.sprite.setDepth(depth)
  }

  updateAnimation() {
    const currentTick = Number(this.scene?.worldStore?.tick ?? 0)
    const nextVisual = resolveEnemyVisual(this.enemy, currentTick)

    if (this.currentAnimationKey === nextVisual.key && this.currentVisualIsStatic === nextVisual.isStatic) {
      return
    }

    this.currentAnimationKey = nextVisual.key
    this.currentVisualIsStatic = nextVisual.isStatic

    if (nextVisual.isStatic) {
      this.sprite.anims?.stop?.()
      this.sprite.setTexture(nextVisual.key)
      return
    }

    this.sprite.play(nextVisual.key, true)
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

  updateHealthLabel() {
    if (!DEBUG_MODE || !this.sprite) {
      this.destroyHealthLabel()
      return
    }

    if (!this.healthLabel) {
      this.healthLabel = this.scene.add.text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: DEBUG_ENEMY_HEALTH_LABEL_FONT_SIZE,
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
        align: 'center',
      })
      this.healthLabel.setOrigin(0.5, 1)
      this.healthLabel.setScrollFactor(1, 1)
    }

    const health = this.getCurrentHealth()
    const spriteOriginY = Number.isFinite(this.sprite?.originY) ? this.sprite.originY : 0.5
    const spriteTopY = this.sprite.y - (this.sprite.displayHeight ?? 0) * spriteOriginY
    const labelY = spriteTopY + DEBUG_ENEMY_HEALTH_LABEL_OFFSET_Y
    this.healthLabel.setText(`HP: ${health}`)
    this.healthLabel.setPosition(this.sprite.x, labelY)
    this.healthLabel.setDepth(this.sprite.depth + 60)
  }

  destroyHealthLabel() {
    if (!this.healthLabel) {
      return
    }

    this.healthLabel.destroy()
    this.healthLabel = null
  }

  getCurrentHealth() {
    return Number(this.enemy?.hp ?? 0)
  }

  updateHealthFlash() {
    const currentHealth = this.getCurrentHealth()

    if (currentHealth < this.lastHealth) {
      this.flashDamageTint()
    }

    this.lastHealth = currentHealth
  }

  flashDamageTint() {
    if (!this.sprite) {
      return
    }

    if (this.healthFlashTimer) {
      this.healthFlashTimer.remove(false)
      this.healthFlashTimer = null
    }

    this.sprite.setTint(ENEMY_HIT_TINT_COLOR)

    this.healthFlashTimer = this.scene.time.delayedCall(ENEMY_HIT_FLASH_MS, () => {
      if (this.sprite?.active) {
        this.sprite.clearTint()
      }

      this.healthFlashTimer = null
    })
  }

  destroy() {
    if (this.debugBorder) {
      this.debugBorder.destroy()
      this.debugBorder = null
    }

    this.destroyHealthLabel()

    if (this.healthFlashTimer) {
      this.healthFlashTimer.remove(false)
      this.healthFlashTimer = null
    }

    if (this.sprite) {
      this.sprite.destroy()
      this.sprite = null
    }
  }
}
