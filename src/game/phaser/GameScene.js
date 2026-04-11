import Phaser from 'phaser'
import {
  CAMERA_DEFAULT_ZOOM,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_WHEEL_ZOOM_RATE,
  TILE_SIZE,
} from '../config/constants.js'
import { UnitSpriteController } from '../rendering/UnitSpriteController.js'
import { renderGrid } from './renderers/renderGrid.js'
import { syncBuildings } from './renderers/syncBuildings.js'
import { syncResources } from './renderers/syncResources.js'
import {
  GOLD_FRAME_COUNT,
  GOLD_VARIANT_CONFIGS,
  BUSH_VARIANT_CONFIGS,
  ROCK_VARIANT_CONFIGS,
  SHEEP_VARIANT_CONFIGS,
  TREE_FRAME_COUNT,
  TREE_VARIANT_CONFIGS,
} from '../config/resourceVariants.js'

const WATER_FOAM_TEXTURE_KEY = 'water-foam'
const WATER_FOAM_ANIMATION_KEY = 'water-foam_anim'
const WATER_FOAM_FRAME_COUNT = 16
const PLATEAU_TERRAIN_TEXTURE_KEY = 'terrain_tileset_plateau'

const VILLAGER_ASSETS = [
  {
    key: 'villager-idle',
    path: '/assets/units/blue/villager/villager-idle.png',
    frameCount: 8,
  },
  {
    key: 'villager-idle-axe',
    path: '/assets/units/blue/villager/villager-idle-axe.png',
    frameCount: 8,
  },
  {
    key: 'villager-idle-pickaxe',
    path: '/assets/units/blue/villager/villager-idle-pickaxe.png',
    frameCount: 8,
  },
  {
    key: 'villager-idle-wood',
    path: '/assets/units/blue/villager/villager-idle-wood.png',
    frameCount: 8,
  },
  {
    key: 'villager-idle-knife',
    path: '/assets/units/blue/villager/villager-idle-knife.png',
    frameCount: 8,
  },
  {
    key: 'villager-run',
    path: '/assets/units/blue/villager/villager-run.png',
    frameCount: 6,
  },
  {
    key: 'villager-run-axe',
    path: '/assets/units/blue/villager/villager-run-axe.png',
    frameCount: 6,
  },
  {
    key: 'villager-run-pickaxe',
    path: '/assets/units/blue/villager/villager-run-pickaxe.png',
    frameCount: 6,
  },
  {
    key: 'villager-run-knife',
    path: '/assets/units/blue/villager/villager-run-knife.png',
    frameCount: 6,
  },
  {
    key: 'villager-interact-knife',
    path: '/assets/units/blue/villager/villager-interact-knife.png',
    frameCount: 4,
  },
  {
    key: 'villager-interact-axe',
    path: '/assets/units/blue/villager/villager-interact-axe.png',
    frameCount: 4,
  },
  {
    key: 'villager-interact-pickaxe',
    path: '/assets/units/blue/villager/villager-interact-pickaxe.png',
    frameCount: 4,
  },
  {
    key: 'villager-run-wood',
    path: '/assets/units/blue/villager/villager-run-wood.png',
    frameCount: 6,
  },
  {
    key: 'villager-idle-meat',
    path: '/assets/units/blue/villager/villager-idle-meat.png',
    frameCount: 8,
  },
  {
    key: 'villager-idle-gold',
    path: '/assets/units/blue/villager/villager-idle-gold.png',
    frameCount: 8,
  },
  {
    key: 'villager-run-gold',
    path: '/assets/units/blue/villager/villager-run-gold.png',
    frameCount: 6,
  },
  {
    key: 'villager-run-meat',
    path: '/assets/units/blue/villager/villager-run-meat.png',
    frameCount: 6,
  },
]

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.worldStore = null
    this.unitControllers = new Map()
    this.resourceSprites = new Map()
    this.resourceDebugBorders = new Map()
    this.targetZoom = CAMERA_DEFAULT_ZOOM
    this.zoomAnchor = null
    this.isCameraDragging = false
    this.lastDragPointerX = 0
    this.lastDragPointerY = 0
    this.handleCameraWheel = this.handleCameraWheel.bind(this)
    this.handleCameraPointerDown = this.handleCameraPointerDown.bind(this)
    this.handleCameraPointerMove = this.handleCameraPointerMove.bind(this)
    this.handleCameraPointerUp = this.handleCameraPointerUp.bind(this)
    this.handleResize = this.handleResize.bind(this)
  }

  preload() {
    for (const asset of VILLAGER_ASSETS) {
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

    for (const sheepVariant of SHEEP_VARIANT_CONFIGS) {
      this.load.spritesheet(sheepVariant.idleKey, sheepVariant.idlePath, {
        frameWidth: sheepVariant.displayWidth,
        frameHeight: sheepVariant.frameHeight,
      })

      this.load.spritesheet(sheepVariant.moveKey, sheepVariant.movePath, {
        frameWidth: sheepVariant.displayWidth,
        frameHeight: sheepVariant.frameHeight,
      })

      this.load.spritesheet(sheepVariant.grassKey, sheepVariant.grassPath, {
        frameWidth: sheepVariant.displayWidth,
        frameHeight: sheepVariant.frameHeight,
      })
    }

    for (const rockVariant of ROCK_VARIANT_CONFIGS) {
      this.load.image(rockVariant.key, rockVariant.path)
    }

    for (const bushVariant of BUSH_VARIANT_CONFIGS) {
      this.load.spritesheet(bushVariant.key, bushVariant.path, {
        frameWidth: bushVariant.frameWidth,
        frameHeight: bushVariant.frameHeight,
      })
    }

    this.load.spritesheet('terrain_tileset', '/assets/terrain/tileset/tilemap-color-2.png', {
      frameWidth: 64,
      frameHeight: 64,
    })
    this.load.spritesheet(PLATEAU_TERRAIN_TEXTURE_KEY, '/assets/terrain/tileset/tilemap-color-0.png', {
      frameWidth: 64,
      frameHeight: 64,
    })
    this.load.spritesheet(WATER_FOAM_TEXTURE_KEY, '/assets/terrain/tileset/water-foam.png', {
      frameWidth: 192,
      frameHeight: 192,
    })
    this.load.image('villager-talk-bubble', '/assets/ui/elements/papers/bubble-0.png')
  }

  init(data = {}) {
    this.worldStore = data.worldStore ?? null
  }

  create() {
    if (!this.worldStore) {
      return
    }

    this.cleanupCameraControls()

    for (const controller of this.unitControllers.values()) {
      controller.destroy()
    }
    this.unitControllers.clear()

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
    this.targetZoom = CAMERA_DEFAULT_ZOOM
    this.zoomAnchor = null
    this.isCameraDragging = false
    this.ensureAnimations()
    this.setupCameraControls()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.centerCameraOnCastle()
    this.setCanvasCursor('grab')

    renderGrid(this, this.worldStore)
    syncBuildings(this, this.worldStore)
    syncResources(this, this.worldStore)
    this.syncUnitControllers()
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
    this.input.on('wheel', this.handleCameraWheel)
    this.input.on('pointerdown', this.handleCameraPointerDown)
    this.input.on('pointermove', this.handleCameraPointerMove)
    this.input.on('pointerup', this.handleCameraPointerUp)
    this.input.on('pointerupoutside', this.handleCameraPointerUp)
    this.input.on('gameout', this.handleCameraPointerUp)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupCameraControls, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupCameraControls, this)
  }

  cleanupCameraControls() {
    if (this.input) {
      this.input.off('wheel', this.handleCameraWheel)
      this.input.off('pointerdown', this.handleCameraPointerDown)
      this.input.off('pointermove', this.handleCameraPointerMove)
      this.input.off('pointerup', this.handleCameraPointerUp)
      this.input.off('pointerupoutside', this.handleCameraPointerUp)
      this.input.off('gameout', this.handleCameraPointerUp)
    }

    if (this.scale) {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    }

    this.isCameraDragging = false
    this.setCanvasCursor('')
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

  handleResize(gameSize) {
    const camera = this.cameras.main
    const width = gameSize?.width ?? camera.width
    const height = gameSize?.height ?? camera.height

    camera.setViewport(0, 0, width, height)
    this.clampCameraToWorld()
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

    const centerX = camera.width / 2
    const centerY = camera.height / 2
    if (!this.zoomAnchor) {
      this.zoomAnchor = camera.getWorldPoint(centerX, centerY)
    }

    this.targetZoom = nextZoom
  }

  handleCameraPointerDown(pointer) {
    if (!pointer || pointer.button !== 0 || !this.cameras.main) {
      return
    }

    this.isCameraDragging = true
    this.lastDragPointerX = pointer.x
    this.lastDragPointerY = pointer.y
    this.zoomAnchor = null
    this.targetZoom = this.cameras.main.zoom
    this.setCanvasCursor('grabbing')
  }

  handleCameraPointerMove(pointer) {
    if (!this.isCameraDragging || !pointer || !this.cameras.main) {
      return
    }

    const camera = this.cameras.main
    const deltaX = pointer.x - this.lastDragPointerX
    const deltaY = pointer.y - this.lastDragPointerY

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    camera.scrollX -= deltaX / camera.zoom
    camera.scrollY -= deltaY / camera.zoom
    this.lastDragPointerX = pointer.x
    this.lastDragPointerY = pointer.y
    this.clampCameraToWorld()
  }

  handleCameraPointerUp() {
    if (!this.isCameraDragging) {
      return
    }

    this.isCameraDragging = false
    this.setCanvasCursor('grab')
  }

  setCanvasCursor(cursor) {
    const canvas = this.game?.canvas

    if (!canvas) {
      return
    }

    canvas.style.cursor = cursor
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

    for (const asset of VILLAGER_ASSETS) {
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

    for (const sheepVariant of SHEEP_VARIANT_CONFIGS) {
      const sheepAnimations = [
        [sheepVariant.idleKey, sheepVariant.idleFrameCount],
        [sheepVariant.moveKey, sheepVariant.moveFrameCount],
        [sheepVariant.grassKey, sheepVariant.grassFrameCount],
      ]

      for (const [textureKey, frameCount] of sheepAnimations) {
        const animationKey = `${textureKey}_anim`

        if (this.anims.exists(animationKey)) {
          continue
        }

        this.anims.create({
          key: animationKey,
          frames: this.anims.generateFrameNumbers(textureKey, {
            start: 0,
            end: frameCount - 1,
          }),
          frameRate: 10,
          repeat: -1,
        })
      }
    }
  }

  update(_time, delta) {
    this.updateCameraZoom(delta)
    syncResources(this, this.worldStore)
    this.syncUnitControllers()
  }

  updateCameraZoom(delta) {
    const camera = this.cameras.main

    if (!camera || !this.zoomAnchor) {
      return
    }

    const currentZoom = camera.zoom
    const distance = Math.abs(this.targetZoom - currentZoom)

    if (distance < 0.001) {
      camera.setZoom(this.targetZoom)
      this.centerZoomAnchor(camera)
      this.clampCameraToWorld()
      this.zoomAnchor = null
      return
    }

    const smoothing = 1 - Math.exp(-delta * 0.01)
    const nextZoom = Phaser.Math.Linear(currentZoom, this.targetZoom, smoothing)
    camera.setZoom(nextZoom)
    this.centerZoomAnchor(camera)
    this.clampCameraToWorld()
  }

  centerZoomAnchor(camera) {
    if (!this.zoomAnchor) {
      return
    }

    const centerX = camera.width / 2
    const centerY = camera.height / 2

    camera.scrollX = this.zoomAnchor.x - centerX / camera.zoom
    camera.scrollY = this.zoomAnchor.y - centerY / camera.zoom
  }

  syncUnitControllers() {
    if (!this.worldStore) {
      return
    }

    const activeUnitIds = new Set()

    for (const unit of this.worldStore.units) {
      if (unit.role !== 'villager') {
        continue
      }

      activeUnitIds.add(unit.id)

      let controller = this.unitControllers.get(unit.id)

      if (!controller) {
        controller = new UnitSpriteController(this, unit)
        this.unitControllers.set(unit.id, controller)
      } else {
        controller.unit = unit
      }

      controller.update()
    }

    for (const [unitId, controller] of this.unitControllers.entries()) {
      if (activeUnitIds.has(unitId)) {
        continue
      }

      controller.destroy()
      this.unitControllers.delete(unitId)
    }
  }
}
