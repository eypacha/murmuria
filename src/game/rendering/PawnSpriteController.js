import Phaser from 'phaser'
import {
  DEBUG_MODE,
  SIMULATION_TICK_MS,
  TILE_SIZE,
  UNIT_RENDER_OFFSET_Y,
} from '../config/constants.js'
import { resolvePawnAnimation } from './resolvePawnAnimation.js'

const PAWN_DISPLAY_SIZE = 192
const DEBUG_UNIT_BORDER_COLOR = 0x5ad8ff

function getPawnWorldPosition(pawn) {
  if (pawn?.pos) {
    return pawn.pos
  }

  if (!pawn?.gridPos) {
    return { x: 0, y: 0 }
  }

  return {
    x: pawn.gridPos.x * TILE_SIZE + TILE_SIZE / 2,
    y: pawn.gridPos.y * TILE_SIZE + TILE_SIZE / 2,
  }
}

function resolveFacing(pawn) {
  const state = typeof pawn?.state === 'string' ? pawn.state : 'idle'

  if (
    state === 'preparing_to_tree' ||
    state === 'preparing_to_gather' ||
    state === 'gathering'
  ) {
    if (pawn?.interactionFacing === 'left' || pawn?.interactionFacing === 'right') {
      return pawn.interactionFacing
    }
  }

  if (pawn?.facing === 'left' || pawn?.facing === 'right') {
    return pawn.facing
  }

  const worldPosition = getPawnWorldPosition(pawn)
  const targetTile = pawn?.target?.tile

  if (targetTile) {
    const targetX = targetTile.x * TILE_SIZE + TILE_SIZE / 2

    if (targetX < worldPosition.x) {
      return 'left'
    }

    if (targetX > worldPosition.x) {
      return 'right'
    }
  }

  return 'right'
}

function getDebugTileRect(pawn) {
  if (!pawn?.gridPos) {
    return null
  }

  return {
    x: pawn.gridPos.x * TILE_SIZE,
    y: pawn.gridPos.y * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
  }
}

export class PawnSpriteController {
  constructor(scene, pawn) {
    this.scene = scene
    this.pawn = pawn
    this.currentAnimationKey = null
    this.currentFacing = null
    this.startPosition = null
    this.targetPosition = null
    this.elapsed = SIMULATION_TICK_MS
    this.debugBorder = DEBUG_MODE ? scene.add.graphics() : null

    const initialPosition = this.getRenderPosition()
    const initialAnimationKey = resolvePawnAnimation(pawn)

    this.startPosition = { ...initialPosition }
    this.targetPosition = { ...initialPosition }

    this.sprite = scene.add.sprite(initialPosition.x, initialPosition.y, initialAnimationKey)
    this.sprite.setOrigin(0.5, 0.9)
    this.sprite.setDisplaySize(PAWN_DISPLAY_SIZE, PAWN_DISPLAY_SIZE)
    this.sprite.setDepth(initialPosition.y)
    this.sprite.play(initialAnimationKey, true)

    this.currentAnimationKey = initialAnimationKey
    this.updateDirection()

    if (this.debugBorder) {
      this.updateDebugBorder()
    }
  }

  update() {
    this.updatePosition()
    this.updateDirection()
    this.updateAnimation()
  }

  updatePosition() {
    const targetPosition = this.getRenderPosition()
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

    const delta = this.scene.game.loop.delta ?? 0
    this.elapsed = Math.min(SIMULATION_TICK_MS, this.elapsed + delta)

    const progress = SIMULATION_TICK_MS > 0 ? this.elapsed / SIMULATION_TICK_MS : 1
    const nextX = Phaser.Math.Linear(this.startPosition.x, this.targetPosition.x, progress)
    const nextY = Phaser.Math.Linear(this.startPosition.y, this.targetPosition.y, progress)

    this.sprite.setPosition(nextX, nextY)
    this.sprite.setDepth(nextY)

    if (this.debugBorder) {
      this.updateDebugBorder()
    }
  }

  updateAnimation() {
    const animationKey = resolvePawnAnimation(this.pawn)

    if (animationKey === this.currentAnimationKey) {
      return
    }

    this.sprite.anims.play(animationKey, true)
    this.currentAnimationKey = animationKey
  }

  updateDirection() {
    const facing = resolveFacing(this.pawn)

    if (facing === this.currentFacing) {
      return
    }

    this.sprite.setFlipX(facing === 'left')
    this.currentFacing = facing
  }

  updateDebugBorder() {
    if (!this.debugBorder) {
      return
    }

    const rect = getDebugTileRect(this.pawn)

    this.debugBorder.clear()

    if (!rect) {
      return
    }

    this.debugBorder.lineStyle(2, DEBUG_UNIT_BORDER_COLOR, 1)
    this.debugBorder.strokeRect(rect.x, rect.y, rect.width, rect.height)
    this.debugBorder.setDepth(this.sprite.depth - 1)
  }

  getRenderPosition() {
    const worldPosition = getPawnWorldPosition(this.pawn)

    return {
      x: worldPosition.x,
      y: worldPosition.y + UNIT_RENDER_OFFSET_Y,
    }
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
