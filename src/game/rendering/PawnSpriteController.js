import Phaser from 'phaser'
import {
  DEBUG_MODE,
  SIMULATION_TICK_MS,
  TILE_SIZE,
  UNIT_RENDER_OFFSET_Y,
} from '../config/constants.js'
import { resolvePawnAnimation } from './resolvePawnAnimation.js'

const PAWN_DISPLAY_SIZE = 192
const TALK_BUBBLE_TEXTURE_KEY = 'pawn-talk-bubble'
const TALK_BUBBLE_WIDTH = 98
const TALK_BUBBLE_HEIGHT = 104
const TALK_BUBBLE_OFFSET_Y = 170
const TALK_BUBBLE_SIDE_OFFSET_X = 34
const TALK_BUBBLE_SWITCH_MS = 1000
const TALK_BUBBLE_SWITCH_TICKS = Math.max(
  1,
  Math.ceil(TALK_BUBBLE_SWITCH_MS / SIMULATION_TICK_MS),
)
const TALK_EMOJIS = ['🙂', '😐', '🤔', '🍖', '👑','🔥','😭','🍎','🍕','🍷','🌎','🏰']
const DEBUG_UNIT_BORDER_COLOR = 0x5ad8ff
const TALK_EMOJI_STYLE = {
  fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
  fontSize: '38px',
  color: '#2b241f',
  align: 'center',
}

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
    state === 'preparing_to_gold' ||
    state === 'preparing_to_gather' ||
    state === 'gathering' ||
    state === 'waiting_to_talk' ||
    state === 'talking'
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
    this.bubbleContainer = null
    this.bubbleImage = null
    this.bubbleText = null
    this.bubbleKey = null
    this.bubbleSlotKey = null
    this.bubbleEmoji = null
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
    const animationKey = resolvePawnAnimation(this.pawn)

    if (this.isVisuallyTraveling() && this.currentAnimationKey?.startsWith('pawn-run')) {
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
    const facing = resolveFacing(this.pawn)

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

    const { key } = bubbleState

    if (!this.bubbleContainer) {
      this.createTalkBubble()
    }

    if (!this.bubbleContainer || !this.bubbleImage || !this.bubbleText) {
      return
    }

    if (this.bubbleSlotKey !== key) {
      this.bubbleSlotKey = key
      this.bubbleEmoji =
        bubbleState.emoji ?? TALK_EMOJIS[Math.floor(Math.random() * TALK_EMOJIS.length)] ?? TALK_EMOJIS[0]
    }

    this.bubbleContainer.setVisible(true)
    const offsetX = this.isRightSideSpeaker() ? -TALK_BUBBLE_SIDE_OFFSET_X : TALK_BUBBLE_SIDE_OFFSET_X
    this.bubbleContainer.setPosition(
      this.sprite.x + offsetX,
      this.sprite.y - TALK_BUBBLE_OFFSET_Y,
    )
    this.bubbleContainer.setDepth(this.sprite.depth + 50)
    this.updateBubbleFlip(bubbleState)
    this.bubbleText.setText(this.bubbleEmoji ?? TALK_EMOJIS[0])
    this.bubbleKey = key
  }

  isRightSideSpeaker() {
    const partnerId = this.pawn.talkPartner?.id

    if (!partnerId) {
      return false
    }

    return this.pawn.id > partnerId
  }

  updateBubbleFlip(bubbleState) {
    if (!this.bubbleImage || !this.bubbleText) {
      return
    }

    const partner = this.pawn.talkPartner
    const partnerId = partner?.id

    if (!partnerId) {
      this.bubbleImage.setFlipX(false)
      this.bubbleText.setFlipX(false)
      return
    }

    const isRightSide = this.isRightSideSpeaker()
    this.bubbleImage.setFlipX(isRightSide)
    this.bubbleText.setFlipX(isRightSide)
  }

  resolveTalkBubbleState() {
    if (
      this.pawn?.idleAction !== 'talk' ||
      (this.pawn?.state !== 'talking' && this.pawn?.state !== 'waiting_to_talk')
    ) {
      return null
    }

    const partner = this.pawn.talkPartner

    if (!partner || !partner.id) {
      return null
    }

    const startedTick = Number.isFinite(this.pawn.talkStartedTick) ? this.pawn.talkStartedTick : null

    if (startedTick == null) {
      return null
    }

    const currentTick = this.scene.worldStore?.tick ?? 0
    const turnIndex = Math.floor(Math.max(0, currentTick - startedTick) / TALK_BUBBLE_SWITCH_TICKS)
    const partnerId = partner.id
    const leadId = this.pawn.id <= partnerId ? this.pawn.id : partnerId
    const activeSpeakerId = turnIndex % 2 === 0 ? leadId : (leadId === this.pawn.id ? partnerId : this.pawn.id)

    if (activeSpeakerId !== this.pawn.id) {
      return null
    }

    const pairKey = [this.pawn.id, partnerId].sort().join(':')
    const emojiIndex = Math.floor(Math.random() * TALK_EMOJIS.length)
    const emoji = TALK_EMOJIS[emojiIndex] ?? TALK_EMOJIS[0]
    const key = `${pairKey}:${turnIndex}:${activeSpeakerId}`

    return {
      emoji,
      key,
      type: 'talk',
    }
  }

  resolveBubbleState() {
    const reactionState = this.resolveKingSpeechReactionState()

    if (reactionState) {
      return reactionState
    }

    return this.resolveTalkBubbleState()
  }

  resolveKingSpeechReactionState() {
    const emoji = typeof this.pawn?.talkEmoji === 'string' ? this.pawn.talkEmoji.trim() : ''

    if (!emoji) {
      return null
    }

    const untilAt = Number.isFinite(this.pawn.talkEmojiUntilAt)
      ? this.pawn.talkEmojiUntilAt
      : null

    if (untilAt == null) {
      return null
    }

    const now = Date.now()

    if (now >= untilAt) {
      return null
    }

    return {
      emoji,
      key: `king-speech:${this.pawn.talkEmojiKey ?? this.pawn.id}:${untilAt}`,
      type: 'reaction',
    }
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
    this.bubbleEmoji = null
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
