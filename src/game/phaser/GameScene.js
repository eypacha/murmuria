import Phaser from 'phaser'
import {
  CAMERA_DEFAULT_ZOOM,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_WHEEL_ZOOM_RATE,
  WAVE_WARNING_DURATION_TICKS,
  TILE_SIZE,
} from '../config/constants.js'
import { UnitSpriteController } from '../rendering/UnitSpriteController.js'
import { renderGrid } from './renderers/renderGrid.js'
import { syncBuildings } from './renderers/syncBuildings.js'
import { syncConstructionSites } from './renderers/syncConstructionSites.js'
import { syncEnemies } from './renderers/syncEnemies.js'
import { syncHouses } from './renderers/syncHouses.js'
import { syncResources } from './renderers/syncResources.js'
import { SelectionCameraSystem } from './systems/SelectionCameraSystem.js'
import {
  GOLD_FRAME_COUNT,
  GOLD_VARIANT_CONFIGS,
  BUSH_VARIANT_CONFIGS,
  MEAT_RESOURCE_CONFIG,
  ROCK_VARIANT_CONFIGS,
  SHEEP_VARIANT_CONFIGS,
  TREE_FRAME_COUNT,
  TREE_VARIANT_CONFIGS,
} from '../config/resourceVariants.js'
import { CASTLE_FIRE_VARIANTS, HOUSE_VARIANT_CONFIGS } from '../config/buildingVariants.js'
import { ENEMY_TYPE_CONFIGS } from '../config/enemyVariants.js'

const WATER_FOAM_TEXTURE_KEY = 'water-foam'
const WATER_FOAM_ANIMATION_KEY = 'water-foam_anim'
const WATER_FOAM_FRAME_COUNT = 16
const PLATEAU_TERRAIN_TEXTURE_KEY = 'terrain_tileset_plateau'
const WOOD_RESOURCE_TEXTURE_KEY = 'construction-site-wood-resource'
const CURSOR_TEXTURE_KEY = 'ui-cursor-default'
const POINTER_TEXTURE_KEY = 'ui-cursor-pointer'
const SPEED_BUTTON_TEXTURE_KEY = 'ui-button-tiny-round-blue'
const RESOURCE_ICON_KEYS = {
  wood: 'ui-resource-wood',
  gold: 'ui-resource-gold',
  meat: 'ui-resource-meat',
}
const CURSOR_HOTSPOT_X = 22
const CURSOR_HOTSPOT_Y = 17
const CURSOR_DEPTH = 100000
const SKULL_HOLD_FRAME_INDEX = 6
const SKULL_HOLD_DURATION_MS = 5000
const SPEED_STEPS = [1, 2, 4, 8]
const SPEED_BUTTON_MARGIN_X = 16
const SPEED_BUTTON_MARGIN_Y = 16
const SPEED_BUTTON_DISPLAY_WIDTH = 48
const SPEED_BUTTON_DISPLAY_HEIGHT = 48
const RESOURCE_HUD_MARGIN_X = 16
const RESOURCE_HUD_MARGIN_Y = 16
const RESOURCE_HUD_ROW_GAP = 12
const RESOURCE_HUD_ICON_SIZE = 32
const RESOURCE_HUD_TEXT_OFFSET_X = 32
const RESOURCE_HUD_DEPTH = 99999
const RESOURCE_HUD_EMOJI_FONT_FAMILY = 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Arial, sans-serif'
const VILLAGER_ASSET_BASE_PATH = '/assets/units/blue/villager'
const VILLAGER_DEAD_ASSET_PATH = '/assets/units/dead.png'
const WAVE_ANNOUNCEMENT_BANNER_KEY = 'ui-wave-ribbon-red'
const WAVE_ANNOUNCEMENT_BANNER_PATH = '/assets/ui/banners/ribbon/ribbon-wave-red.png'
const WAVE_ANNOUNCEMENT_BANNER_WIDTH = 384
const WAVE_ANNOUNCEMENT_BANNER_HEIGHT = 128
const WAVE_ANNOUNCEMENT_TEXT_OFFSET_Y = -8
const WAVE_ANNOUNCEMENT_TEXT = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '28px',
  fontStyle: '700',
  color: '#fff1f1',
  stroke: '#2a0f0f',
  strokeThickness: 4,
  padding: {
    left: 12,
    right: 12,
    top: 8,
    bottom: 8,
  },
}
const WAVE_ANNOUNCEMENT_Y = 64

const VILLAGER_ASSETS = [
  {
    key: 'villager-idle',
    frameCount: 8,
  },
  {
    key: 'villager-idle-axe',
    frameCount: 8,
  },
  {
    key: 'villager-idle-pickaxe',
    frameCount: 8,
  },
  {
    key: 'villager-idle-wood',
    frameCount: 8,
  },
  {
    key: 'villager-idle-hammer',
    frameCount: 8,
  },
  {
    key: 'villager-idle-knife',
    frameCount: 8,
  },
  {
    key: 'villager-run',
    frameCount: 6,
  },
  {
    key: 'villager-run-axe',
    frameCount: 6,
  },
  {
    key: 'villager-run-pickaxe',
    frameCount: 6,
  },
  {
    key: 'villager-run-knife',
    frameCount: 6,
  },
  {
    key: 'villager-interact-knife',
    frameCount: 4,
  },
  {
    key: 'villager-interact-axe',
    frameCount: 4,
  },
  {
    key: 'villager-interact-pickaxe',
    frameCount: 4,
  },
  {
    key: 'villager-run-wood',
    frameCount: 6,
  },
  {
    key: 'villager-run-hammer',
    frameCount: 6,
  },
  {
    key: 'villager-idle-meat',
    frameCount: 8,
  },
  {
    key: 'villager-idle-gold',
    frameCount: 8,
  },
  {
    key: 'villager-run-gold',
    frameCount: 6,
  },
  {
    key: 'villager-run-meat',
    frameCount: 6,
  },
  {
    key: 'villager-dead',
    path: VILLAGER_DEAD_ASSET_PATH,
    frameCount: 14,
    frameWidth: 128,
    frameHeight: 128,
  },
  {
    key: 'villager-interact-hammer',
    frameCount: 3,
  },
]

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.worldStore = null
    this.unitControllers = new Map()
    this.buildingSprites = new Map()
    this.castleFireSprites = new Map()
    this.houseSprites = new Map()
    this.constructionSiteSprites = new Map()
    this.resourceSprites = new Map()
    this.resourceDebugBorders = new Map()
    this.skullEffects = new Map()
    this.targetZoom = CAMERA_DEFAULT_ZOOM
    this.zoomAnchor = null
    this.isCameraDragging = false
    this.cursorSprite = null
    this.cursorMode = 'default'
    this.speedButtonSprite = null
    this.speedButtonText = null
    this.speedButtonInteractive = null
    this.waveAnnouncementBanner = null
    this.waveAnnouncementText = null
    this.lastAnnouncedWave = 0
    this.waveAnnouncementUntilTick = 0
    this.visualSpeedMultiplier = 1
    this.resourceHudRows = new Map()
    this.lastPointerPosition = null
    this.uiCamera = null
    this.uiObjects = new Set()
    this.selectionCameraSystem = new SelectionCameraSystem(this)
    this.lastDragPointerX = 0
    this.lastDragPointerY = 0
    this.handleCameraWheel = this.handleCameraWheel.bind(this)
    this.handleCameraPointerDown = this.handleCameraPointerDown.bind(this)
    this.handleCameraPointerMove = this.handleCameraPointerMove.bind(this)
    this.handleCameraPointerUp = this.handleCameraPointerUp.bind(this)
    this.handleScenePointerDown = this.handleScenePointerDown.bind(this)
    this.handlePointerMove = this.handlePointerMove.bind(this)
    this.handleResize = this.handleResize.bind(this)
  }

  preload() {
    this.load.image(CURSOR_TEXTURE_KEY, '/assets/ui/elements/cursors/cursor.png')
    this.load.image(POINTER_TEXTURE_KEY, '/assets/ui/elements/cursors/pointer.png')
    this.load.image(SPEED_BUTTON_TEXTURE_KEY, '/assets/ui/elements/buttons/tiny-round-blue.png')
    this.load.image(RESOURCE_ICON_KEYS.wood, '/assets/ui/elements/icons/wood.png')
    this.load.image(RESOURCE_ICON_KEYS.gold, '/assets/ui/elements/icons/coin.png')
    this.load.image(RESOURCE_ICON_KEYS.meat, '/assets/ui/elements/icons/meat.png')
    this.load.image(WAVE_ANNOUNCEMENT_BANNER_KEY, WAVE_ANNOUNCEMENT_BANNER_PATH)

    for (const asset of VILLAGER_ASSETS) {
      this.load.spritesheet(asset.key, asset.path ?? `${VILLAGER_ASSET_BASE_PATH}/${asset.key}.png`, {
        frameWidth: asset.frameWidth ?? 192,
        frameHeight: asset.frameHeight ?? 192,
      })
    }

    for (const asset of ENEMY_TYPE_CONFIGS) {
      this.load.spritesheet(asset.idleKey, asset.idlePath, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      })

      this.load.spritesheet(asset.runKey, asset.runPath, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      })

      if (asset.attackKey && asset.attackPath) {
        this.load.spritesheet(asset.attackKey, asset.attackPath, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        })
      }
    }

    this.load.image('castle_blue', '/assets/buildings/blue/castle.png')
    this.load.image('castle_destroyed', '/assets/buildings/castle-destroyed.png')

    for (const fireVariant of CASTLE_FIRE_VARIANTS) {
      this.load.spritesheet(fireVariant.key, fireVariant.path, {
        frameWidth: fireVariant.frameWidth,
        frameHeight: fireVariant.frameHeight,
      })
    }

    for (const houseVariant of HOUSE_VARIANT_CONFIGS) {
      this.load.image(houseVariant.key, houseVariant.path)
    }

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

    this.load.spritesheet(MEAT_RESOURCE_CONFIG.key, MEAT_RESOURCE_CONFIG.path, {
      frameWidth: MEAT_RESOURCE_CONFIG.frameWidth ?? 128,
      frameHeight: MEAT_RESOURCE_CONFIG.frameHeight ?? 128,
    })

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
    this.load.image(WOOD_RESOURCE_TEXTURE_KEY, '/assets/terrain/resources/wood/resource.png')
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

    for (const sprite of this.houseSprites.values()) {
      sprite.destroy()
    }
    this.houseSprites.clear()

    for (const sprite of this.buildingSprites.values()) {
      sprite.destroy()
    }
    this.buildingSprites.clear()

    for (const fireSprites of this.castleFireSprites.values()) {
      for (const sprite of fireSprites.values()) {
        sprite.destroy()
      }
    }
    this.castleFireSprites.clear()

    if (this.buildingDebugOverlays) {
      for (const overlay of this.buildingDebugOverlays.values()) {
        for (const object of overlay) {
          object.destroy()
        }
      }
      this.buildingDebugOverlays.clear()
    }

    if (this.buildingHealthLabels) {
      for (const label of this.buildingHealthLabels.values()) {
        label.destroy()
      }
      this.buildingHealthLabels.clear()
    }

    for (const sprite of this.constructionSiteSprites.values()) {
      sprite.destroy()
    }
    this.constructionSiteSprites.clear()

    for (const sprite of this.resourceSprites.values()) {
      sprite.destroy()
    }
    this.resourceSprites.clear()

    for (const border of this.resourceDebugBorders.values()) {
      border.destroy()
    }
    this.resourceDebugBorders.clear()

    for (const effect of this.skullEffects.values()) {
      effect.destroy()
    }
    this.skullEffects.clear()

    const { width, height } = this.getWorldPixelSize()
    const camera = this.cameras.main

    camera.setBounds(0, 0, width, height)
    camera.setZoom(CAMERA_DEFAULT_ZOOM)
    this.targetZoom = CAMERA_DEFAULT_ZOOM
    this.zoomAnchor = null
    this.isCameraDragging = false
    if (this.uiCamera) {
      this.uiCamera.destroy()
      this.uiCamera = null
    }
    this.uiObjects.clear()
    this.ensureAnimations()
    this.setupCameraControls()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.centerCameraOnCastle()
    this.setupUiCamera(width, height)
    this.setupCursor()
    this.setupResourceHud()
    this.setupSpeedButton()
    this.lastAnnouncedWave = 0
    this.waveAnnouncementUntilTick = 0
    this.setupWaveAnnouncement()
    this.syncVisualTimeScale()
    this.syncUiOverlay()
    this.syncUiCameraIgnores()

    renderGrid(this, this.worldStore)
    syncBuildings(this, this.worldStore)
    syncConstructionSites(this, this.worldStore)
    syncHouses(this, this.worldStore)
    syncResources(this, this.worldStore)
    this.syncUnitControllers()
    syncEnemies(this, this.worldStore)
    this.syncUiCameraIgnores()
    this.selectionCameraSystem.update()
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
    this.input.setTopOnly(true)
    this.input.on('wheel', this.handleCameraWheel)
    this.input.on('pointerdown', this.handleCameraPointerDown)
    this.input.on('pointermove', this.handleCameraPointerMove)
    this.input.on('pointerup', this.handleCameraPointerUp)
    this.input.on('pointerupoutside', this.handleCameraPointerUp)
    this.input.on('gameout', this.handleCameraPointerUp)
    this.input.on('pointerdown', this.handleScenePointerDown)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupCameraControls, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupCameraControls, this)
  }

  setupCursor() {
    if (this.cursorSprite) {
      this.cursorSprite.destroy()
    }

    this.cursorSprite = this.add.image(0, 0, CURSOR_TEXTURE_KEY)
    this.cursorSprite.setScrollFactor(0)
    this.cursorSprite.setDepth(CURSOR_DEPTH)
    this.cursorSprite.setOrigin(0, 0)
    this.cursorSprite.setVisible(false)
    this.registerUiObject(this.cursorSprite)

    if (this.game?.canvas) {
      this.game.canvas.style.cursor = 'none'
    }

    if (this.input) {
      this.input.on('pointermove', this.handlePointerMove)
      this.handlePointerMove(this.input.activePointer)
    }

    this.setCursorMode('default')
  }

  setupUiCamera(width, height) {
    if (this.uiCamera) {
      this.uiCamera.destroy()
    }

    this.uiCamera = this.cameras.add(0, 0, width, height)
    this.uiCamera.setScroll(0, 0)
    this.uiCamera.setZoom(1)
    this.uiCamera.ignore(
      this.children.list.filter((child) => !this.uiObjects.has(child)),
    )
  }

  cleanupCameraControls() {
    if (this.input) {
      this.input.off('wheel', this.handleCameraWheel)
      this.input.off('pointerdown', this.handleCameraPointerDown)
      this.input.off('pointermove', this.handleCameraPointerMove)
      this.input.off('pointerup', this.handleCameraPointerUp)
      this.input.off('pointerupoutside', this.handleCameraPointerUp)
      this.input.off('gameout', this.handleCameraPointerUp)
      this.input.off('pointerdown', this.handleScenePointerDown)
      this.input.off('pointermove', this.handlePointerMove)
    }

    if (this.scale) {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    }

    this.isCameraDragging = false
    this.clearSelectedUnit()
    if (this.cursorSprite) {
      this.cursorSprite.destroy()
      this.cursorSprite = null
    }

    if (this.speedButtonText) {
      this.speedButtonText.destroy()
      this.speedButtonText = null
    }

    if (this.speedButtonSprite) {
      this.speedButtonSprite.off('pointerdown', this.handleSpeedButtonClick, this)
      this.speedButtonSprite.off('pointerover', this.handleSpeedButtonOver, this)
      this.speedButtonSprite.off('pointerout', this.handleSpeedButtonOut, this)
      this.speedButtonSprite.destroy()
      this.speedButtonSprite = null
    }

    if (this.waveAnnouncementBanner) {
      this.waveAnnouncementBanner.destroy()
      this.waveAnnouncementBanner = null
    }

    if (this.waveAnnouncementText) {
      this.waveAnnouncementText.destroy()
      this.waveAnnouncementText = null
    }

    this.destroyResourceHud()

    if (this.uiCamera) {
      this.uiCamera.destroy()
      this.uiCamera = null
    }

    if (this.game?.canvas) {
      this.game.canvas.style.cursor = ''
    }
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
    this.setCursorMode('default')
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
    this.setCursorMode('default')
  }

  handleScenePointerDown(pointer, currentlyOver = []) {
    if (!pointer || pointer.button !== 0) {
      return
    }

    if (Array.isArray(currentlyOver) && currentlyOver.length > 0) {
      return
    }

    this.clearSelectedUnit()
  }

  handleUnitPointerOver() {
    this.setCursorMode('pointer')
  }

  handleUnitPointerOut() {
    this.setCursorMode('default')
  }

  handleUnitPointerDown(unitId) {
    if (!unitId) {
      return
    }

    this.selectUnit(unitId)
  }

  setupSpeedButton() {
    if (this.speedButtonSprite) {
      this.speedButtonSprite.destroy()
      this.speedButtonSprite = null
    }

    if (this.speedButtonText) {
      this.speedButtonText.destroy()
      this.speedButtonText = null
    }

    const buttonX = this.scale.width - SPEED_BUTTON_MARGIN_X - SPEED_BUTTON_DISPLAY_WIDTH / 2
    const buttonY = SPEED_BUTTON_MARGIN_Y + SPEED_BUTTON_DISPLAY_HEIGHT / 2

    this.speedButtonSprite = this.add.image(buttonX, buttonY, SPEED_BUTTON_TEXTURE_KEY)
    this.speedButtonSprite.setScrollFactor(0)
    this.speedButtonSprite.setDepth(10001)
    this.speedButtonSprite.setDisplaySize(SPEED_BUTTON_DISPLAY_WIDTH, SPEED_BUTTON_DISPLAY_HEIGHT)
    this.speedButtonSprite.setInteractive({ useHandCursor: false })
    this.speedButtonSprite.on('pointerdown', this.handleSpeedButtonClick, this)
    this.speedButtonSprite.on('pointerover', this.handleSpeedButtonOver, this)
    this.speedButtonSprite.on('pointerout', this.handleSpeedButtonOut, this)
    this.registerUiObject(this.speedButtonSprite)

    this.speedButtonText = this.add.text(buttonX, buttonY, this.getSpeedLabel(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#16304f',
      strokeThickness: 3,
    })
    this.speedButtonText.setOrigin(0.5, 0.5)
    this.speedButtonText.setScrollFactor(0)
    this.speedButtonText.setDepth(10002)
    this.registerUiObject(this.speedButtonText)
  }

  setupWaveAnnouncement() {
    if (this.waveAnnouncementBanner) {
      this.waveAnnouncementBanner.destroy()
      this.waveAnnouncementBanner = null
    }

    if (this.waveAnnouncementText) {
      this.waveAnnouncementText.destroy()
      this.waveAnnouncementText = null
    }

    this.waveAnnouncementBanner = this.add.image(
      this.scale.width / 2,
      WAVE_ANNOUNCEMENT_Y,
      WAVE_ANNOUNCEMENT_BANNER_KEY,
    )
    this.waveAnnouncementBanner.setDisplaySize(
      WAVE_ANNOUNCEMENT_BANNER_WIDTH,
      WAVE_ANNOUNCEMENT_BANNER_HEIGHT,
    )
    this.waveAnnouncementBanner.setOrigin(0.5, 0.5)
    this.waveAnnouncementBanner.setScrollFactor(0)
    this.waveAnnouncementBanner.setDepth(10002)
    this.waveAnnouncementBanner.setVisible(false)
    this.registerUiObject(this.waveAnnouncementBanner)

    this.waveAnnouncementText = this.add.text(
      this.scale.width / 2,
      WAVE_ANNOUNCEMENT_Y + WAVE_ANNOUNCEMENT_TEXT_OFFSET_Y,
      '',
      WAVE_ANNOUNCEMENT_TEXT,
    )
    this.waveAnnouncementText.setOrigin(0.5, 0.5)
    this.waveAnnouncementText.setScrollFactor(0)
    this.waveAnnouncementText.setDepth(10003)
    this.waveAnnouncementText.setVisible(false)
    this.registerUiObject(this.waveAnnouncementText)
  }

  setupResourceHud() {
    this.destroyResourceHud()

    const resourceEntries = [
      { key: 'wood', iconKey: RESOURCE_ICON_KEYS.wood },
      { key: 'gold', iconKey: RESOURCE_ICON_KEYS.gold },
      { key: 'meat', iconKey: RESOURCE_ICON_KEYS.meat },
      { key: 'population', iconText: '👤' },
    ]

    resourceEntries.forEach((entry, index) => {
      const rowY = RESOURCE_HUD_MARGIN_Y + index * (RESOURCE_HUD_ICON_SIZE + RESOURCE_HUD_ROW_GAP)
      const icon = entry.iconKey
        ? this.add.image(
            RESOURCE_HUD_MARGIN_X + RESOURCE_HUD_ICON_SIZE / 2,
            rowY + RESOURCE_HUD_ICON_SIZE / 2,
            entry.iconKey,
          )
        : this.add.text(
            RESOURCE_HUD_MARGIN_X + RESOURCE_HUD_ICON_SIZE / 2,
            rowY + RESOURCE_HUD_ICON_SIZE / 2,
            entry.iconText ?? '',
            {
              fontFamily: RESOURCE_HUD_EMOJI_FONT_FAMILY,
              fontSize: '24px',
              color: '#f8fafc',
            },
          )
      const valueText = this.add.text(
        RESOURCE_HUD_MARGIN_X + RESOURCE_HUD_TEXT_OFFSET_X,
        rowY + RESOURCE_HUD_ICON_SIZE / 2,
        '0',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          fontStyle: '700',
          color: '#f8fafc',
          stroke: '#0f172a',
          strokeThickness: 4,
          align: 'left',
        },
      )

      icon.setScrollFactor(0)
      icon.setDepth(RESOURCE_HUD_DEPTH)
      if (entry.iconKey) {
        icon.setDisplaySize(RESOURCE_HUD_ICON_SIZE, RESOURCE_HUD_ICON_SIZE)
      } else {
        icon.setOrigin(0.5, 0.5)
      }
      this.registerUiObject(icon)

      valueText.setOrigin(0, 0.5)
      valueText.setScrollFactor(0)
      valueText.setDepth(RESOURCE_HUD_DEPTH + 1)
      this.registerUiObject(valueText)

      this.resourceHudRows.set(entry.key, {
        icon,
        valueText,
      })
    })
  }

  destroyResourceHud() {
    for (const row of this.resourceHudRows.values()) {
      row.icon?.destroy()
      row.valueText?.destroy()
    }

    this.resourceHudRows.clear()
  }

  handleSpeedButtonClick(pointer, _localX, _localY, event) {
    if (event?.stopPropagation) {
      event.stopPropagation()
    }

    this.cycleSimulationSpeed()
  }

  handleSpeedButtonOver() {
    if (this.speedButtonSprite) {
      this.speedButtonSprite.setTint(0xd7ecff)
    }

    this.setCursorMode('pointer')
  }

  handleSpeedButtonOut() {
    if (this.speedButtonSprite) {
      this.speedButtonSprite.clearTint()
    }

    this.setCursorMode('default')
  }

  cycleSimulationSpeed() {
    if (!this.worldStore) {
      return
    }

    const currentIndex = SPEED_STEPS.indexOf(this.worldStore.simulationSpeed)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % SPEED_STEPS.length
    this.worldStore.simulationSpeed = SPEED_STEPS[nextIndex]
    this.syncVisualTimeScale()
    this.syncSpeedButtonLabel()
  }

  getSpeedLabel() {
    return `x${this.worldStore?.simulationSpeed ?? 1}`
  }

  getVisualSpeedMultiplier() {
    const multiplier = Number(this.worldStore?.simulationSpeed)

    return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1
  }

  getVisualDelta(delta = 0) {
    const baseDelta = Number.isFinite(delta) ? delta : 0

    return baseDelta * this.visualSpeedMultiplier
  }

  syncVisualTimeScale() {
    const nextMultiplier = this.getVisualSpeedMultiplier()

    if (this.visualSpeedMultiplier === nextMultiplier) {
      return
    }

    this.visualSpeedMultiplier = nextMultiplier

    if (this.time) {
      this.time.timeScale = nextMultiplier
    }

    if (this.anims) {
      this.anims.globalTimeScale = nextMultiplier
    }

    if (this.tweens) {
      this.tweens.timeScale = nextMultiplier
    }
  }

  registerUiObject(gameObject) {
    if (!gameObject) {
      return
    }

    this.uiObjects.add(gameObject)

    if (this.cameras?.main) {
      this.cameras.main.ignore(gameObject)
    }
  }

  syncUiCameraIgnores() {
    if (!this.uiCamera) {
      return
    }

    this.uiCamera.ignore(
      this.children.list.filter((child) => !this.uiObjects.has(child)),
    )
  }

  syncSpeedButtonLabel() {
    if (this.speedButtonText) {
      this.speedButtonText.setText(this.getSpeedLabel())
    }
  }

  applyUiTransform(gameObject, screenX, screenY) {
    if (!gameObject) {
      return
    }

    gameObject.setScrollFactor(0)
    gameObject.setPosition(screenX, screenY)
  }

  syncCursorOverlay() {
    if (!this.cursorSprite || !this.lastPointerPosition) {
      return
    }

    this.applyUiTransform(
      this.cursorSprite,
      this.lastPointerPosition.x - CURSOR_HOTSPOT_X,
      this.lastPointerPosition.y - CURSOR_HOTSPOT_Y,
    )
  }

  syncSpeedButtonOverlay() {
    if (!this.speedButtonSprite || !this.speedButtonText) {
      return
    }

    const buttonX = this.scale.width - SPEED_BUTTON_MARGIN_X - SPEED_BUTTON_DISPLAY_WIDTH / 2
    const buttonY = SPEED_BUTTON_MARGIN_Y + SPEED_BUTTON_DISPLAY_HEIGHT / 2

    this.applyUiTransform(this.speedButtonSprite, buttonX, buttonY)
    this.applyUiTransform(this.speedButtonText, buttonX, buttonY)
  }

  syncWaveAnnouncementOverlay() {
    if (!this.waveAnnouncementBanner || !this.waveAnnouncementText) {
      return
    }

    this.applyUiTransform(this.waveAnnouncementBanner, this.scale.width / 2, WAVE_ANNOUNCEMENT_Y)
    this.applyUiTransform(
      this.waveAnnouncementText,
      this.scale.width / 2,
      WAVE_ANNOUNCEMENT_Y + WAVE_ANNOUNCEMENT_TEXT_OFFSET_Y,
    )
  }

  syncResourceHudOverlay() {
    for (const [index, row] of Array.from(this.resourceHudRows.values()).entries()) {
      const rowY = RESOURCE_HUD_MARGIN_Y + index * (RESOURCE_HUD_ICON_SIZE + RESOURCE_HUD_ROW_GAP)
      this.applyUiTransform(
        row.icon,
        RESOURCE_HUD_MARGIN_X + RESOURCE_HUD_ICON_SIZE / 2,
        rowY + RESOURCE_HUD_ICON_SIZE / 2,
      )
      this.applyUiTransform(
        row.valueText,
        RESOURCE_HUD_MARGIN_X + RESOURCE_HUD_TEXT_OFFSET_X,
        rowY + RESOURCE_HUD_ICON_SIZE / 2,
      )
    }
  }

  syncUiOverlay() {
    this.syncCursorOverlay()
    this.syncSpeedButtonOverlay()
    this.syncWaveAnnouncementOverlay()
    this.syncResourceHudOverlay()
    this.syncSpeedButtonLabel()
  }

  syncResourceHud() {
    if (!this.worldStore?.kingdom?.resources) {
      return
    }

    const values = this.worldStore.kingdom.resources
    const population = (this.worldStore.units ?? []).length

    for (const [key, row] of this.resourceHudRows.entries()) {
      const value =
        key === 'population'
          ? population
          : Math.round(Number(values?.[key] ?? 0))
      row.valueText?.setText(String(value))
    }
  }

  syncWaveAnnouncement() {
    if (!this.worldStore || !this.waveAnnouncementBanner || !this.waveAnnouncementText) {
      return
    }

    const waves = this.worldStore.waves
    const currentWave = Number.isFinite(Number(waves?.current)) ? Number(waves.current) : 0
    const currentTick = Number.isFinite(Number(this.worldStore.tick)) ? Number(this.worldStore.tick) : 0

    if (currentWave > 0 && this.lastAnnouncedWave !== currentWave) {
      this.lastAnnouncedWave = currentWave
      this.waveAnnouncementUntilTick = currentTick + WAVE_WARNING_DURATION_TICKS
      this.waveAnnouncementText.setText(`WAVE ${currentWave}`)
      this.waveAnnouncementBanner.setVisible(true)
      this.waveAnnouncementText.setVisible(true)
    }

    const shouldShow = currentWave > 0 && currentTick <= this.waveAnnouncementUntilTick

    this.waveAnnouncementBanner.setVisible(shouldShow)
    this.waveAnnouncementText.setVisible(shouldShow)
  }

  selectUnit(unitId) {
    if (!unitId || this.selectionCameraSystem.selectedUnitId === unitId) {
      return
    }

    this.selectionCameraSystem.selectUnit(unitId)
  }

  clearSelectedUnit() {
    this.selectionCameraSystem.clearSelection()
  }

  handlePointerMove(pointer) {
    if (!pointer || !this.cursorSprite) {
      return
    }

    this.lastPointerPosition = {
      x: pointer.x,
      y: pointer.y,
    }

    this.cursorSprite.setVisible(true)
    this.syncCursorOverlay()
  }

  setCursorMode(mode) {
    if (!this.cursorSprite || this.cursorMode === mode) {
      return
    }

    this.cursorMode = mode
    this.cursorSprite.setTexture(mode === 'pointer' ? POINTER_TEXTURE_KEY : CURSOR_TEXTURE_KEY)
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

    for (const asset of ENEMY_TYPE_CONFIGS) {
      if (!this.anims.exists(asset.idleKey) && this.textures.exists(asset.idleKey)) {
        this.anims.create({
          key: asset.idleKey,
          frames: this.anims.generateFrameNumbers(asset.idleKey, {
            start: 0,
            end: asset.idleFrameCount - 1,
          }),
          frameRate: 10,
          repeat: -1,
        })
      }

      if (!this.anims.exists(asset.runKey) && this.textures.exists(asset.runKey)) {
        this.anims.create({
          key: asset.runKey,
          frames: this.anims.generateFrameNumbers(asset.runKey, {
            start: 0,
            end: asset.runFrameCount - 1,
          }),
          frameRate: 10,
          repeat: -1,
        })
      }

      if (
        asset.attackKey &&
        asset.attackFrameCount &&
        !this.anims.exists(asset.attackKey) &&
        this.textures.exists(asset.attackKey)
      ) {
        this.anims.create({
          key: asset.attackKey,
          frames: this.anims.generateFrameNumbers(asset.attackKey, {
            start: 0,
            end: asset.attackFrameCount - 1,
          }),
          frameRate: 8,
          repeat: 0,
        })
      }
    }

    if (!this.anims.exists('villager-dead_anim') && this.textures.exists('villager-dead')) {
      this.anims.create({
        key: 'villager-dead_anim',
        frames: this.anims.generateFrameNumbers('villager-dead', {
          start: 0,
          end: 13,
        }),
        frameRate: 10,
        repeat: 0,
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

    for (const fireVariant of CASTLE_FIRE_VARIANTS) {
      const animationKey = `${fireVariant.key}_anim`

      if (this.anims.exists(animationKey)) {
        continue
      }

      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(fireVariant.key, {
          start: 0,
          end: fireVariant.frameCount - 1,
        }),
        frameRate: 12,
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

    for (const bushVariant of BUSH_VARIANT_CONFIGS) {
      const animationKey = `${bushVariant.key}_anim`

      if (this.anims.exists(animationKey)) {
        continue
      }

      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(bushVariant.key, {
          start: 0,
          end: 7,
        }),
        frameRate: 10,
        repeat: 0,
      })
    }

    if (!this.anims.exists(`${MEAT_RESOURCE_CONFIG.key}_anim`) && this.textures.exists(MEAT_RESOURCE_CONFIG.key)) {
      this.anims.create({
        key: `${MEAT_RESOURCE_CONFIG.key}_anim`,
        frames: this.anims.generateFrameNumbers(MEAT_RESOURCE_CONFIG.key, {
          start: 0,
          end: (MEAT_RESOURCE_CONFIG.frameCount ?? 7) - 1,
        }),
        frameRate: 10,
        repeat: 0,
      })
    }
  }

  update(_time, delta) {
    this.syncVisualTimeScale()
    this.updateCameraZoom(delta)
    this.syncSkullEffects()
    this.syncResourceHud()
    this.syncWaveAnnouncement()
    this.syncUiOverlay()
    syncBuildings(this, this.worldStore)
    syncConstructionSites(this, this.worldStore)
    syncHouses(this, this.worldStore)
    syncResources(this, this.worldStore)
    syncEnemies(this, this.worldStore)
    this.syncUnitControllers()
    this.syncUiCameraIgnores()
    this.selectionCameraSystem.update(delta)
  }

  syncSkullEffects() {
    if (!this.worldStore) {
      return
    }

    const effects = Array.isArray(this.worldStore.pendingSkullEffects)
      ? this.worldStore.pendingSkullEffects
      : []

    for (const effect of effects) {
      if (!effect?.id || this.skullEffects.has(effect.id)) {
        continue
      }

      const x = effect.x * TILE_SIZE + TILE_SIZE / 2
      const y = effect.y * TILE_SIZE + TILE_SIZE / 2
      const sprite = this.add.sprite(x, y, 'villager-dead')
      let skullHoldTriggered = false

      sprite.setOrigin(0.5, 0.5)
      sprite.setDisplaySize(128, 128)
      sprite.setDepth(y)
      sprite.setFlipX(effect.facing === 'left')
      sprite.play('villager-dead_anim', true)

      const handleAnimationUpdate = (animation, frame, gameObject) => {
        if (animation?.key !== 'villager-dead_anim' || skullHoldTriggered) {
          return
        }

        const currentFrame = gameObject?.anims?.currentFrame ?? frame

        if (currentFrame?.index !== SKULL_HOLD_FRAME_INDEX) {
          return
        }

        skullHoldTriggered = true
        sprite.anims.pause()

        this.time.delayedCall(SKULL_HOLD_DURATION_MS, () => {
          if (sprite.active && sprite.anims?.isPaused) {
            sprite.anims.resume()
          }
        })
      }

      const handleAnimationComplete = (animation) => {
        if (animation?.key !== 'villager-dead_anim') {
          return
        }

        if (sprite.active) {
          sprite.destroy()
        }
      }

      sprite.on('animationupdate', handleAnimationUpdate)
      sprite.on('animationcomplete', handleAnimationComplete)
      sprite.once('destroy', () => {
        sprite.off('animationupdate', handleAnimationUpdate)
        sprite.off('animationcomplete', handleAnimationComplete)
        this.skullEffects.delete(effect.id)
      })

      this.skullEffects.set(effect.id, sprite)
    }

    if (effects.length > 0) {
      this.worldStore.pendingSkullEffects = []
    }
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

      if (this.selectionCameraSystem.selectedUnitId === unitId) {
        this.clearSelectedUnit()
      }

      controller.destroy()
      this.unitControllers.delete(unitId)
    }
  }

  handleResize(gameSize) {
    const camera = this.cameras.main
    const width = gameSize?.width ?? camera.width
    const height = gameSize?.height ?? camera.height

    camera.setViewport(0, 0, width, height)
    this.clampCameraToWorld()
    if (this.uiCamera) {
      this.uiCamera.setViewport(0, 0, width, height)
      this.uiCamera.setScroll(0, 0)
      this.uiCamera.setZoom(1)
    }
    this.syncUiOverlay()
    this.syncUiCameraIgnores()
  }
}
