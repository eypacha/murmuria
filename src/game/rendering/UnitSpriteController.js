import Phaser from 'phaser'
import {
  DEBUG_MODE,
  SIMULATION_TICK_MS,
  TILE_SIZE,
  UNIT_RENDER_OFFSET_Y,
} from '../config/constants.js'
import { resolveUnitAnimation } from './resolveUnitAnimation.js'

const VILLAGER_DISPLAY_SIZE = 192
const TALK_BUBBLE_TEXTURE_KEY = 'villager-talk-bubble'
const TALK_BUBBLE_WIDTH = 98
const TALK_BUBBLE_HEIGHT = 104
const TALK_BUBBLE_OFFSET_Y = 170
const TALK_BUBBLE_SIDE_OFFSET_X = 34
const DEBUG_UNIT_BORDER_COLOR = 0x5ad8ff
const TALK_EMOJI_STYLE = {
  fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
  fontSize: '38px',
  color: '#2b241f',
  align: 'center',
}

function getUnitWorldPosition(unit) {
  if (unit?.pos) {
    return unit.pos
  }

  if (!unit?.gridPos) {
    return { x: 0, y: 0 }
  }

  return {
    x: unit.gridPos.x * TILE_SIZE + TILE_SIZE / 2,
    y: unit.gridPos.y * TILE_SIZE + TILE_SIZE / 2,
  }
}

function resolveFacing(unit) {
  const state = typeof unit?.state === 'string' ? unit.state : 'idle'

  if (
    state === 'preparing_to_tree' ||
    state === 'preparing_to_gold' ||
    state === 'preparing_to_gather' ||
    state === 'gathering' ||
    state === 'waiting_to_talk' ||
    state === 'talking'
  ) {
    if (unit?.interactionFacing === 'left' || unit?.interactionFacing === 'right') {
      return unit.interactionFacing
    }
  }

  if (unit?.facing === 'left' || unit?.facing === 'right') {
    return unit.facing
  }

  const worldPosition = getUnitWorldPosition(unit)
  const targetTile = unit?.target?.tile

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

function getDebugTileRect(unit) {
  if (!unit?.gridPos) {
    return null
  }

  return {
    x: unit.gridPos.x * TILE_SIZE,
    y: unit.gridPos.y * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
  }
}

export class UnitSpriteController {
  constructor(scene, unit) {
    this.scene = scene
    this.unit = unit
    this.currentAnimationKey = null
    this.currentFacing = null
    this.startPosition = null
    this.targetPosition = null
    this.elapsed = SIMULATION_TICK_MS
    this.bubbleContainer = null
    this.bubbleImage = null
    this.bubbleText = null
    this.bubbleKey = null
    this.bubbleSlotKey = null
    this.debugBorder = DEBUG_MODE ? scene.add.graphics() : null

    const initialPosition = this.getRenderPosition()
    const initialAnimationKey = resolveUnitAnimation(unit)

    this.startPosition = { ...initialPosition }
    this.targetPosition = { ...initialPosition }

    this.sprite = scene.add.sprite(initialPosition.x, initialPosition.y, initialAnimationKey)
    this.sprite.setOrigin(0.5, 0.9)
    this.sprite.setDisplaySize(VILLAGER_DISPLAY_SIZE, VILLAGER_DISPLAY_SIZE)
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
    this.updateTalkBubble()
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
    const animationKey = resolveUnitAnimation(this.unit)

    if (this.isVisuallyTraveling() && this.currentAnimationKey?.startsWith('villager-run')) {
      return
    }

    if (animationKey === this.currentAnimationKey) {
      return
    }

    this.sprite.anims.play(animationKey, true)
    this.currentAnimationKey = animationKey
  }

  isVisuallyTraveling() {
    if (!this.targetPosition || !this.sprite) {
      return false
    }

    const distance = Math.hypot(
      this.sprite.x - this.targetPosition.x,
      this.sprite.y - this.targetPosition.y,
    )

    return distance > 1
  }

  updateDirection() {
    const facing = resolveFacing(this.unit)

    if (facing === this.currentFacing) {
      return
    }

    this.sprite.setFlipX(facing === 'left')
    this.currentFacing = facing
  }

  updateTalkBubble() {
    const bubbleState = this.resolveBubbleState()

    if (!bubbleState) {
      this.destroyTalkBubble()
      return
    }

    const key = `${bubbleState.untilTick}:${bubbleState.text ?? ''}`

    if (!this.bubbleContainer) {
      this.createTalkBubble()
    }

    if (!this.bubbleContainer || !this.bubbleImage || !this.bubbleText) {
      return
    }

    if (this.bubbleSlotKey !== key) {
      this.bubbleSlotKey = key
    }

    this.bubbleContainer.setVisible(true)
    const facing = resolveFacing(this.unit)
    const offsetX = facing === 'left' ? -TALK_BUBBLE_SIDE_OFFSET_X : TALK_BUBBLE_SIDE_OFFSET_X
    this.bubbleContainer.setPosition(
      this.sprite.x + offsetX,
      this.sprite.y - TALK_BUBBLE_OFFSET_Y,
    )
    this.bubbleContainer.setDepth(this.sprite.depth + 50)
    this.updateBubbleFlip(bubbleState)
    this.bubbleText.setText(bubbleState.text ?? '')
    this.bubbleKey = key
  }

  updateBubbleFlip(bubbleState) {
    if (!this.bubbleImage || !this.bubbleText) {
      return
    }

    const facing = resolveFacing(this.unit)
    const flipX = facing === 'left'
    this.bubbleImage.setFlipX(flipX)
    this.bubbleText.setFlipX(flipX)
  }

  resolveBubbleState() {
    const bubble = this.unit?.bubble

    if (!bubble || typeof bubble !== 'object') {
      return null
    }

    const currentTick = this.scene.worldStore?.tick ?? 0

    if (Number.isFinite(bubble.appearAtTick) && currentTick < bubble.appearAtTick) {
      return null
    }

    if (!Number.isFinite(bubble.untilTick)) {
      return null
    }

    return bubble
  }

  createTalkBubble() {
    const bubbleImage = this.scene.add.image(0, 0, TALK_BUBBLE_TEXTURE_KEY)
    bubbleImage.setDisplaySize(TALK_BUBBLE_WIDTH, TALK_BUBBLE_HEIGHT)
    bubbleImage.setOrigin(0.5, 0.5)

    const bubbleText = this.scene.add.text(0, -10, '', TALK_EMOJI_STYLE)
    bubbleText.setOrigin(0.5, 0.5)

    this.bubbleContainer = this.scene.add.container(this.sprite.x, this.sprite.y - TALK_BUBBLE_OFFSET_Y)
    this.bubbleContainer.add([bubbleImage, bubbleText])
    this.bubbleContainer.setDepth(this.sprite.depth + 50)

    this.bubbleImage = bubbleImage
    this.bubbleText = bubbleText
  }

  destroyTalkBubble() {
    if (!this.bubbleContainer) {
      return
    }

    this.bubbleContainer.destroy(true)
    this.bubbleContainer = null
    this.bubbleImage = null
    this.bubbleText = null
    this.bubbleKey = null
    this.bubbleSlotKey = null
  }

  updateDebugBorder() {
    if (!this.debugBorder) {
      return
    }

    const rect = getDebugTileRect(this.unit)

    this.debugBorder.clear()

    if (!rect) {
      return
    }

    this.debugBorder.lineStyle(2, DEBUG_UNIT_BORDER_COLOR, 1)
    this.debugBorder.strokeRect(rect.x, rect.y, rect.width, rect.height)
    this.debugBorder.setDepth(this.sprite.depth - 1)
  }

  getRenderPosition() {
    const worldPosition = getUnitWorldPosition(this.unit)

    return {
      x: worldPosition.x,
      y: worldPosition.y + UNIT_RENDER_OFFSET_Y,
    }
  }

  destroy() {
    this.destroyTalkBubble()

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
