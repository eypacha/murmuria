import Phaser from 'phaser'
import {
  CAMERA_DEFAULT_ZOOM,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_PAN_SPEED,
  CAMERA_WHEEL_ZOOM_RATE,
  TILE_SIZE,
} from '../config/constants.js'
import { PawnSpriteController } from '../rendering/PawnSpriteController.js'
import { renderGrid } from './renderers/renderGrid.js'
import { syncBuildings } from './renderers/syncBuildings.js'
import { syncResources } from './renderers/syncResources.js'
import {
  GOLD_FRAME_COUNT,
  GOLD_VARIANT_CONFIGS,
  TREE_FRAME_COUNT,
  TREE_VARIANT_CONFIGS,
} from '../config/resourceVariants.js'

const CAMERA_CAPTURE_KEYS = [
  Phaser.Input.Keyboard.KeyCodes.LEFT,
  Phaser.Input.Keyboard.KeyCodes.RIGHT,
  Phaser.Input.Keyboard.KeyCodes.UP,
  Phaser.Input.Keyboard.KeyCodes.DOWN,
]

const WATER_FOAM_TEXTURE_KEY = 'water-foam'
const WATER_FOAM_ANIMATION_KEY = 'water-foam_anim'
const WATER_FOAM_FRAME_COUNT = 16

const PAWN_ASSETS = [
  {
    key: 'pawn-idle',
    path: '/assets/units/blue/pawn/pawn-idle.png',
    frameCount: 8,
  },
  {
    key: 'pawn-idle-axe',
    path: '/assets/units/blue/pawn/pawn-idle-axe.png',
    frameCount: 8,
  },
  {
    key: 'pawn-idle-pickaxe',
    path: '/assets/units/blue/pawn/pawn-idle-pickaxe.png',
    frameCount: 8,
  },
  {
    key: 'pawn-idle-wood',
    path: '/assets/units/blue/pawn/pawn-idle-wood.png',
    frameCount: 8,
  },
  {
    key: 'pawn-run',
    path: '/assets/units/blue/pawn/pawn-run.png',
    frameCount: 6,
  },
  {
    key: 'pawn-run-axe',
    path: '/assets/units/blue/pawn/pawn-run-axe.png',
    frameCount: 6,
  },
  {
    key: 'pawn-run-pickaxe',
    path: '/assets/units/blue/pawn/pawn-run-pickaxe.png',
    frameCount: 6,
  },
  {
    key: 'pawn-interact-axe',
    path: '/assets/units/blue/pawn/pawn-interact-axe.png',
    frameCount: 6,
  },
  {
    key: 'pawn-interact-pickaxe',
    path: '/assets/units/blue/pawn/pawn-interact-pickaxe.png',
    frameCount: 6,
  },
  {
    key: 'pawn-run-wood',
    path: '/assets/units/blue/pawn/pawn-run-wood.png',
    frameCount: 6,
  },
  {
    key: 'pawn-idle-gold',
    path: '/assets/units/blue/pawn/pawn-idle-gold.png',
    frameCount: 8,
  },
  {
    key: 'pawn-run-gold',
    path: '/assets/units/blue/pawn/pawn-run-gold.png',
    frameCount: 6,
  },
]

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.worldStore = null
    this.pawnControllers = new Map()
    this.resourceSprites = new Map()
    this.resourceDebugBorders = new Map()
    this.cursors = null
    this.handleCameraWheel = this.handleCameraWheel.bind(this)
  }

  preload() {
    for (const asset of PAWN_ASSETS) {
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: 192,
        frameHeight: 192,
      })
    }

    this.load.image('castle_blue', '/assets/buildings/blue/castle.png')

    for (const goldVariant of GOLD_VARIANT_CONFIGS) {
      this.load.spritesheet(goldVariant.key, goldVariant.path, {
        frameWidth: 128,
        frameHeight: 128,
      })
    }

    for (const treeVariant of TREE_VARIANT_CONFIGS) {
      this.load.spritesheet(treeVariant.key, treeVariant.path, {
        frameWidth: 192,
        frameHeight: treeVariant.frameHeight,
      })

      this.load.image(treeVariant.stumpKey, treeVariant.stumpPath)
    }

    this.load.spritesheet('terrain_tileset', '/assets/terrain/tileset/tilemap-color-2.png', {
      frameWidth: 64,
      frameHeight: 64,
    })
    this.load.spritesheet(WATER_FOAM_TEXTURE_KEY, '/assets/terrain/tileset/water-foam.png', {
      frameWidth: 192,
      frameHeight: 192,
    })
  }

  init(data = {}) {
    this.worldStore = data.worldStore ?? null
  }

  create() {
    if (!this.worldStore) {
      return
    }

    this.cleanupCameraControls()

    for (const controller of this.pawnControllers.values()) {
      controller.destroy()
    }
    this.pawnControllers.clear()

    for (const sprite of this.resourceSprites.values()) {
      sprite.destroy()
    }
    this.resourceSprites.clear()

    for (const border of this.resourceDebugBorders.values()) {
      border.destroy()
    }
    this.resourceDebugBorders.clear()

    const { width, height } = this.getWorldPixelSize()
    const camera = this.cameras.main

    camera.setBounds(0, 0, width, height)
    camera.setZoom(CAMERA_DEFAULT_ZOOM)
    this.ensureAnimations()
    this.setupCameraControls()
    this.centerCameraOnCastle()

    renderGrid(this, this.worldStore)
    syncBuildings(this, this.worldStore)
    syncResources(this, this.worldStore)
    this.syncPawnControllers()
  }

  getWorldPixelSize() {
    const worldWidth = this.worldStore?.world?.width ?? 0
    const worldHeight = this.worldStore?.world?.height ?? 0

    return {
      width: worldWidth * TILE_SIZE,
      height: worldHeight * TILE_SIZE,
    }
  }

  setupCameraControls() {
    const keyboard = this.input.keyboard

    if (!keyboard) {
      return
    }

    this.cursors = keyboard.createCursorKeys()
    keyboard.addCapture(CAMERA_CAPTURE_KEYS)

    this.input.on('wheel', this.handleCameraWheel)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupCameraControls, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupCameraControls, this)
  }

  cleanupCameraControls() {
    const keyboard = this.input?.keyboard

    if (this.input) {
      this.input.off('wheel', this.handleCameraWheel)
    }

    if (keyboard) {
      keyboard.removeCapture(CAMERA_CAPTURE_KEYS)
    }

    this.cursors = null
  }

  centerCameraOnCastle() {
    const castle = this.worldStore.buildings.find((building) => building.type === 'castle')

    if (!castle) {
      return
    }

    const footprint = castle.footprint ?? { w: 1, h: 1 }
    const centerX = (castle.gridPos.x + footprint.w / 2) * TILE_SIZE
    const centerY = (castle.gridPos.y + footprint.h / 2) * TILE_SIZE

    this.cameras.main.centerOn(centerX, centerY)
    this.clampCameraToWorld()
  }

  clampCameraToWorld() {
    const camera = this.cameras.main
    const { width, height } = this.getWorldPixelSize()
    const visibleWidth = camera.width / camera.zoom
    const visibleHeight = camera.height / camera.zoom
    const maxScrollX = Math.max(0, width - visibleWidth)
    const maxScrollY = Math.max(0, height - visibleHeight)

    camera.scrollX = Phaser.Math.Clamp(camera.scrollX, 0, maxScrollX)
    camera.scrollY = Phaser.Math.Clamp(camera.scrollY, 0, maxScrollY)
  }

  handleCameraWheel(pointer, _currentlyOver, _deltaX, deltaY, _deltaZ, event) {
    if (!pointer || !this.cameras.main) {
      return
    }

    if (event?.preventDefault) {
      event.preventDefault()
    }

    const camera = this.cameras.main
    const previousZoom = camera.zoom
    const zoomFactor = Math.exp(-deltaY * CAMERA_WHEEL_ZOOM_RATE)
    const nextZoom = Phaser.Math.Clamp(previousZoom * zoomFactor, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM)

    if (nextZoom === previousZoom) {
      return
    }

    const worldPointBeforeZoom = camera.getWorldPoint(pointer.x, pointer.y)

    camera.setZoom(nextZoom)

    const worldPointAfterZoom = camera.getWorldPoint(pointer.x, pointer.y)
    camera.scrollX += worldPointBeforeZoom.x - worldPointAfterZoom.x
    camera.scrollY += worldPointBeforeZoom.y - worldPointAfterZoom.y

    this.clampCameraToWorld()
  }

  ensureAnimations() {
    const waterFoamTexture = this.textures.get(WATER_FOAM_TEXTURE_KEY)

    if (!this.anims.exists(WATER_FOAM_ANIMATION_KEY) && waterFoamTexture) {
      this.anims.create({
        key: WATER_FOAM_ANIMATION_KEY,
        frames: this.anims.generateFrameNumbers(WATER_FOAM_TEXTURE_KEY, {
          start: 0,
          end: WATER_FOAM_FRAME_COUNT - 1,
        }),
        frameRate: 10,
        repeat: -1,
      })
    }

    for (const asset of PAWN_ASSETS) {
      if (this.anims.exists(asset.key)) {
        continue
      }

      this.anims.create({
        key: asset.key,
        frames: this.anims.generateFrameNumbers(asset.key, {
          start: 0,
          end: asset.frameCount - 1,
        }),
        frameRate: 10,
        repeat: -1,
      })
    }

    for (const treeVariant of TREE_VARIANT_CONFIGS) {
      const animationKey = `${treeVariant.key}_idle_anim`

      if (this.anims.exists(animationKey)) {
        continue
      }

      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(treeVariant.key, {
          start: 0,
          end: TREE_FRAME_COUNT - 1,
        }),
        frameRate: 10,
        repeat: -1,
      })
    }

    for (const goldVariant of GOLD_VARIANT_CONFIGS) {
      const animationKey = `${goldVariant.key}_harvest_anim`

      if (this.anims.exists(animationKey)) {
        continue
      }

      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(goldVariant.key, {
          start: 0,
          end: GOLD_FRAME_COUNT - 1,
        }),
        frameRate: 10,
        repeat: -1,
      })
    }
  }

  update(_time, delta) {
    this.updateCamera(delta)
    syncResources(this, this.worldStore)
    this.syncPawnControllers()
  }

  updateCamera(delta) {
    if (!this.cursors) {
      return
    }

    const camera = this.cameras.main
    const moveX = (this.cursors.right?.isDown ? 1 : 0) - (this.cursors.left?.isDown ? 1 : 0)
    const moveY = (this.cursors.down?.isDown ? 1 : 0) - (this.cursors.up?.isDown ? 1 : 0)

    if (moveX === 0 && moveY === 0) {
      return
    }

    const directionLength = Math.hypot(moveX, moveY)
    const normalizedX = moveX / directionLength
    const normalizedY = moveY / directionLength
    const distance = (CAMERA_PAN_SPEED * delta) / 1000 / camera.zoom

    camera.scrollX += normalizedX * distance
    camera.scrollY += normalizedY * distance

    this.clampCameraToWorld()
  }

  syncPawnControllers() {
    if (!this.worldStore) {
      return
    }

    const activePawnIds = new Set()

    for (const pawn of this.worldStore.units) {
      if (pawn.role !== 'pawn') {
        continue
      }

      activePawnIds.add(pawn.id)

      let controller = this.pawnControllers.get(pawn.id)

      if (!controller) {
        controller = new PawnSpriteController(this, pawn)
        this.pawnControllers.set(pawn.id, controller)
      } else {
        controller.pawn = pawn
      }

      controller.update()
    }

    for (const [pawnId, controller] of this.pawnControllers.entries()) {
      if (activePawnIds.has(pawnId)) {
        continue
      }

      controller.destroy()
      this.pawnControllers.delete(pawnId)
    }
  }
}
