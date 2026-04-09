import Phaser from 'phaser'
import { GRID_HEIGHT, GRID_WIDTH, TILE_SIZE } from '../config/constants.js'
import { renderGrid } from './renderers/renderGrid.js'
import { syncBuildings } from './renderers/syncBuildings.js'
import { syncResources } from './renderers/syncResources.js'
import { syncUnits } from './renderers/syncUnits.js'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.worldStore = null
  }

  preload() {
    this.load.spritesheet('pawn_idle', '/assets/units/blue/pawn/pawn-idle.png', {
      frameWidth: 192,
      frameHeight: 192,
    })

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

    this.cameras.main.setBounds(0, 0, GRID_WIDTH * TILE_SIZE, GRID_HEIGHT * TILE_SIZE)
    this.ensureAnimations()
    this.centerCameraOnCastle()

    renderGrid(this, this.worldStore)
    syncBuildings(this, this.worldStore)
    syncResources(this, this.worldStore)
    syncUnits(this, this.worldStore)
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
    if (!this.anims.exists('pawn_idle_anim')) {
      this.anims.create({
        key: 'pawn_idle_anim',
        frames: this.anims.generateFrameNumbers('pawn_idle', { start: 0, end: 7 }),
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

  update() {}
}
