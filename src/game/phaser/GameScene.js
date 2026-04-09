import Phaser from 'phaser'
import {
  DEPTH_HUD,
  GRID_HEIGHT,
  GRID_WIDTH,
  HUD_GAP,
  HUD_ICON_SIZE,
  HUD_MARGIN,
  HUD_ROW_GAP,
  HUD_TEXT_SIZE,
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
    this.woodHudIcon = null
    this.woodHudText = null
    this.woodHudValue = null
    this.goldHudIcon = null
    this.goldHudText = null
    this.goldHudValue = null
  }

  preload() {
    for (const asset of PAWN_ASSETS) {
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: 192,
        frameHeight: 192,
      })
    }

    this.load.image('castle_blue', '/assets/buildings/blue/castle.png')
    this.load.image('wood_resource_icon', '/assets/terrain/resources/wood/resource.png')
    this.load.image('gold_resource_icon', '/assets/terrain/resources/gold/resource.png')

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

    this.load.spritesheet('terrain_tileset', '/assets/terrain/tileset/tilemap-color-0.png', {
      frameWidth: 64,
      frameHeight: 64,
    })
  }

  init(data = {}) {
    this.worldStore = data.worldStore ?? null
  }

  create() {
    if (!this.worldStore) {
      return
    }

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

    this.cameras.main.setBounds(0, 0, GRID_WIDTH * TILE_SIZE, GRID_HEIGHT * TILE_SIZE)
    this.ensureAnimations()
    this.centerCameraOnCastle()
    this.createWoodHud()
    this.createGoldHud()

    renderGrid(this, this.worldStore)
    syncBuildings(this, this.worldStore)
    syncResources(this, this.worldStore)
    this.syncPawnControllers()
    this.syncWoodHud()
    this.syncGoldHud()
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
  }

  ensureAnimations() {
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

  update() {
    syncResources(this, this.worldStore)
    this.syncPawnControllers()
    this.syncWoodHud()
    this.syncGoldHud()
  }

  createWoodHud() {
    if (this.woodHudIcon) {
      this.woodHudIcon.destroy()
      this.woodHudIcon = null
    }

    if (this.woodHudText) {
      this.woodHudText.destroy()
      this.woodHudText = null
    }

    this.woodHudIcon = this.add.image(0, 0, 'wood_resource_icon')
    this.woodHudIcon.setOrigin(0, 0.5)
    this.woodHudIcon.setScrollFactor(0)
    this.woodHudIcon.setDepth(DEPTH_HUD)
    this.woodHudIcon.setDisplaySize(HUD_ICON_SIZE, HUD_ICON_SIZE)

    this.woodHudText = this.add.text(0, 0, '0', {
      fontFamily: 'monospace',
      fontSize: `${HUD_TEXT_SIZE}px`,
      color: '#f8fafc',
      align: 'left',
    })
    this.woodHudText.setOrigin(0, 0.5)
    this.woodHudText.setScrollFactor(0)
    this.woodHudText.setDepth(DEPTH_HUD)
  }

  syncWoodHud() {
    if (!this.worldStore || !this.woodHudIcon || !this.woodHudText) {
      return
    }

    const wood = this.worldStore.kingdom?.resources?.wood ?? 0
    const woodText = String(wood)

    if (woodText !== this.woodHudValue) {
      this.woodHudText.setText(woodText)
      this.woodHudValue = woodText
    }

    const iconX = HUD_MARGIN
    const textX = iconX + HUD_ICON_SIZE + HUD_GAP
    const textY = HUD_MARGIN + HUD_ICON_SIZE / 2

    this.woodHudIcon.setPosition(iconX, textY)
    this.woodHudText.setPosition(textX, textY)
  }

  createGoldHud() {
    if (this.goldHudIcon) {
      this.goldHudIcon.destroy()
      this.goldHudIcon = null
    }

    if (this.goldHudText) {
      this.goldHudText.destroy()
      this.goldHudText = null
    }

    this.goldHudIcon = this.add.image(0, 0, 'gold_resource_icon')
    this.goldHudIcon.setOrigin(0, 0.5)
    this.goldHudIcon.setScrollFactor(0)
    this.goldHudIcon.setDepth(DEPTH_HUD)
    this.goldHudIcon.setDisplaySize(HUD_ICON_SIZE, HUD_ICON_SIZE)

    this.goldHudText = this.add.text(0, 0, '0', {
      fontFamily: 'monospace',
      fontSize: `${HUD_TEXT_SIZE}px`,
      color: '#f8fafc',
      align: 'left',
    })
    this.goldHudText.setOrigin(0, 0.5)
    this.goldHudText.setScrollFactor(0)
    this.goldHudText.setDepth(DEPTH_HUD)
  }

  syncGoldHud() {
    if (!this.worldStore || !this.goldHudIcon || !this.goldHudText) {
      return
    }

    const gold = this.worldStore.kingdom?.resources?.gold ?? 0
    const goldText = String(gold)

    if (goldText !== this.goldHudValue) {
      this.goldHudText.setText(goldText)
      this.goldHudValue = goldText
    }

    const iconX = HUD_MARGIN
    const textX = iconX + HUD_ICON_SIZE + HUD_GAP
    const textY = HUD_MARGIN + HUD_ICON_SIZE / 2 + HUD_ICON_SIZE + HUD_ROW_GAP

    this.goldHudIcon.setPosition(iconX, textY)
    this.goldHudText.setPosition(textX, textY)
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
