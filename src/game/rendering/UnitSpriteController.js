import Phaser from 'phaser'
import {
  DEBUG_MODE,
  SIMULATION_TICK_MS,
  TILE_SIZE,
  UNIT_RENDER_OFFSET_Y,
} from '../config/constants.js'
import { resolveUnitAnimation } from './resolveUnitAnimation.js'

const VILLAGER_DISPLAY_SIZE = 192
const CHILD_UNIT_SCALE = 0.6
const UNIT_INTERACTION_SIZE = 64
const UNIT_INTERACTION_OFFSET_Y = VILLAGER_DISPLAY_SIZE * 0.4
const TALK_BUBBLE_TEXTURE_KEY = 'villager-talk-bubble'
const TALK_BUBBLE_WIDTH = 98
const TALK_BUBBLE_HEIGHT = 104
const TALK_BUBBLE_OFFSET_Y = 170
const TALK_BUBBLE_SIDE_OFFSET_X = 34
const DEBUG_UNIT_LABEL_FONT_SIZE = '14px'
const DEBUG_UNIT_LABEL_OFFSET_Y = 10
const DEBUG_UNIT_BORDER_COLOR = 0x5ad8ff
const SHEEP_HIT_TINT_COLOR = 0xff6b6b
const UNIT_HIT_TINT_COLOR = 0xff6b6b
const UNIT_HIT_FLASH_MS = 90
const SHEEP_HIT_FRAME_INDEX = 2
const TALK_EMOJI_STYLE = {
  fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
  fontSize: '38px',
  color: '#2b241f',
  align: 'center',
}

function getUnitWorldPosition(unit) {
  if (
    (unit?.state === 'reproducing' || unit?.state === 'spawning') &&
    unit?.visualPos &&
    Number.isFinite(unit.visualPos.x) &&
    Number.isFinite(unit.visualPos.y)
  ) {
    return unit.visualPos
  }

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
    state === 'preparing_to_construction_site' ||
    state === 'gathering' ||
    state === 'building' ||
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
    this.debugLabel = null
    this.debugLabelKey = null
    this.debugBorder = DEBUG_MODE ? scene.add.graphics() : null
    this.interactionZone = null
    this.healthFlashTimer = null
    this.lastHealth = this.getCurrentHealth()

    const initialPosition = this.getRenderPosition()
    const initialAnimationKey = resolveUnitAnimation(unit)

    this.startPosition = { ...initialPosition }
    this.targetPosition = { ...initialPosition }

    this.sprite = scene.add.sprite(initialPosition.x, initialPosition.y, initialAnimationKey)
    this.sprite.setOrigin(0.5, 0.9)
    this.sprite.setDisplaySize(VILLAGER_DISPLAY_SIZE, VILLAGER_DISPLAY_SIZE)
    this.sprite.setScale(this.getUnitScale())
    this.sprite.setDepth(initialPosition.y)
    this.sprite.play(initialAnimationKey, true)

    this.interactionZone = scene.add.zone(
      initialPosition.x,
      initialPosition.y - UNIT_INTERACTION_OFFSET_Y,
      UNIT_INTERACTION_SIZE,
      UNIT_INTERACTION_SIZE,
    )
    this.interactionZone.setOrigin(0.5, 0.5)
    this.interactionZone.setInteractive({ useHandCursor: false })
    this.interactionZone.on('pointerover', this.handlePointerOver, this)
    this.interactionZone.on('pointerout', this.handlePointerOut, this)
    this.interactionZone.on('pointerdown', this.handlePointerDown, this)

    this.currentAnimationKey = initialAnimationKey
    this.updateDirection()

    if (this.debugBorder) {
      this.updateDebugBorder()
    }
  }

  update() {
    this.updateHealthFlash()
    this.updateScale()
    this.updatePosition()
    this.updateDirection()
    this.updateAnimation()
    this.updateImpactFlash()
    this.updateTalkBubble()
    this.updateDebugLabel()
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
    if (this.interactionZone) {
      this.interactionZone.setPosition(nextX, nextY - UNIT_INTERACTION_OFFSET_Y)
      this.interactionZone.setDepth(nextY + 0.01)
    }

    if (this.debugBorder) {
      this.updateDebugBorder()
    }
  }

  updateScale() {
    if (!this.sprite) {
      return
    }

    const nextScale = this.getUnitScale()

    if (this.sprite.scaleX === nextScale && this.sprite.scaleY === nextScale) {
      return
    }

    this.sprite.setScale(nextScale)
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

  updateImpactFlash() {
    if (!this.isSheepInteractionImpactFrame()) {
      return
    }

    const resourceSprite = this.scene.resourceSprites?.get(this.unit.workTargetId ?? this.unit.targetId)

    if (!resourceSprite?.active) {
      return
    }

    resourceSprite.setTint(SHEEP_HIT_TINT_COLOR)
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

    this.sprite.setTint(UNIT_HIT_TINT_COLOR)

    this.healthFlashTimer = this.scene.time.delayedCall(UNIT_HIT_FLASH_MS, () => {
      if (this.sprite?.active) {
        this.sprite.clearTint()
      }

      this.healthFlashTimer = null
    })
  }

  isSheepInteractionImpactFrame() {
    if (this.currentAnimationKey !== 'villager-interact-knife') {
      return false
    }

    if ((this.unit?.workTargetType ?? this.unit?.target?.type) !== 'sheep') {
      return false
    }

    const currentFrameIndex = this.sprite?.anims?.currentFrame?.index

    return currentFrameIndex === SHEEP_HIT_FRAME_INDEX
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

  updateDebugLabel() {
    if (!DEBUG_MODE) {
      return
    }

    if (!this.debugLabel) {
      this.debugLabel = this.scene.add.text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: DEBUG_UNIT_LABEL_FONT_SIZE,
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
      })
      this.debugLabel.setOrigin(0.5, 1)
    }

    const key = `${this.unit.id}:${this.unit.state ?? 'unknown'}`
    const labelText = this.unit?.id ?? ''
    const labelX = this.sprite.x
    const labelY = this.sprite.y - DEBUG_UNIT_LABEL_OFFSET_Y - (this.sprite.displayHeight ?? 0) / 2

    this.debugLabelKey = key
    this.debugLabel.setText(labelText)
    this.debugLabel.setPosition(labelX, labelY)
    this.debugLabel.setDepth(this.sprite.depth + 60)
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

  destroyDebugLabel() {
    if (!this.debugLabel) {
      return
    }

    this.debugLabel.destroy()
    this.debugLabel = null
    this.debugLabelKey = null
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

  getUnitScale() {
    return this.unit?.isChild ? CHILD_UNIT_SCALE : 1
  }

  handlePointerOver() {
    this.scene?.handleUnitPointerOver?.(this.unit?.id)
  }

  handlePointerOut() {
    this.scene?.handleUnitPointerOut?.(this.unit?.id)
  }

  handlePointerDown(pointer, _localX, _localY, event) {
    if (event?.stopPropagation) {
      event.stopPropagation()
    }

    if (pointer?.button !== 0) {
      return
    }

    this.scene?.handleUnitPointerDown?.(this.unit?.id)
  }

  getRenderPosition() {
    const worldPosition = getUnitWorldPosition(this.unit)

    return {
      x: worldPosition.x,
      y: worldPosition.y + UNIT_RENDER_OFFSET_Y,
    }
  }

  getCurrentHealth() {
    return Number(this.unit?.status?.health ?? 100)
  }

  destroy() {
    this.destroyTalkBubble()
    this.destroyDebugLabel()

    if (this.healthFlashTimer) {
      this.healthFlashTimer.remove(false)
      this.healthFlashTimer = null
    }

    if (this.debugBorder) {
      this.debugBorder.destroy()
      this.debugBorder = null
    }

    if (this.sprite) {
      this.sprite.destroy()
      this.sprite = null
    }

    if (this.interactionZone) {
      this.interactionZone.off('pointerover', this.handlePointerOver, this)
      this.interactionZone.off('pointerout', this.handlePointerOut, this)
      this.interactionZone.off('pointerdown', this.handlePointerDown, this)
      this.interactionZone.destroy()
      this.interactionZone = null
    }
  }
}
