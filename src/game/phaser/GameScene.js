import Phaser from 'phaser'
import { GRID_HEIGHT, GRID_WIDTH, TILE_SIZE } from '../config/constants.js'
import { PawnSpriteController } from '../rendering/PawnSpriteController.js'
import { renderGrid } from './renderers/renderGrid.js'
import { syncBuildings } from './renderers/syncBuildings.js'
import { syncResources } from './renderers/syncResources.js'

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
    key: 'pawn-interact-axe',
    path: '/assets/units/blue/pawn/pawn-interact-axe.png',
    frameCount: 6,
  },
  {
    key: 'pawn-run-wood',
    path: '/assets/units/blue/pawn/pawn-run-wood.png',
    frameCount: 6,
  },
]

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.worldStore = null
    this.pawnControllers = new Map()
  }

  preload() {
    for (const asset of PAWN_ASSETS) {
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: 192,
        frameHeight: 192,
      })
    }

    this.load.image('castle_blue', '/assets/buildings/blue/castle.png')

    this.load.spritesheet('tree_0', '/assets/terrain/resources/wood/trees/tree-0.png', {
      frameWidth: 192,
      frameHeight: 256,
    })

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

    this.cameras.main.setBounds(0, 0, GRID_WIDTH * TILE_SIZE, GRID_HEIGHT * TILE_SIZE)
    this.ensureAnimations()
    this.centerCameraOnCastle()

    renderGrid(this, this.worldStore)
    syncBuildings(this, this.worldStore)
    syncResources(this, this.worldStore)
    this.syncPawnControllers()
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

    if (!this.anims.exists('tree_idle_anim')) {
      this.anims.create({
        key: 'tree_idle_anim',
        frames: this.anims.generateFrameNumbers('tree_0', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1,
      })
    }
  }

  update() {
    this.syncPawnControllers()
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
