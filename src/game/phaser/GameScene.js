import Phaser from 'phaser'
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  SIMULATION_TICK_MS,
  TILE_SIZE,
  UNIT_RENDER_OFFSET_Y,
} from '../config/constants.js'
import { renderGrid } from './renderers/renderGrid.js'
import { syncBuildings } from './renderers/syncBuildings.js'
import { syncResources } from './renderers/syncResources.js'
import { syncUnits } from './renderers/syncUnits.js'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.worldStore = null
    this.unitSprites = new Map()
  }

  preload() {
    this.load.spritesheet('pawn_idle', '/assets/units/blue/pawn/pawn-idle.png', {
      frameWidth: 192,
      frameHeight: 192,
    })

    this.load.spritesheet('pawn_run', '/assets/units/blue/pawn/pawn-run.png', {
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
    const unitSprites = syncUnits(this, this.worldStore)
    this.unitSprites = new Map(
      unitSprites.map((sprite) => [sprite.getData('entityId'), sprite]),
    )
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
        frames: this.anims.generateFrameNumbers('pawn_idle'),
        frameRate: 10,
        repeat: -1,
      })
    }

    if (!this.anims.exists('pawn_run_anim')) {
      this.anims.create({
        key: 'pawn_run_anim',
        frames: this.anims.generateFrameNumbers('pawn_run'),
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

  update(time, delta) {
    this.syncUnitSprites(delta)
  }

  syncUnitSprites(delta) {
    if (!this.worldStore || this.unitSprites.size === 0) {
      return
    }

    for (const pawn of this.worldStore.units) {
      if (pawn.role !== 'pawn') {
        continue
      }

      const sprite = this.unitSprites.get(pawn.id)

      if (!sprite) {
        continue
      }

      const position = pawn.pos ?? {
        x: pawn.gridPos.x * TILE_SIZE + TILE_SIZE / 2,
        y: pawn.gridPos.y * TILE_SIZE + TILE_SIZE / 2,
      }

      const targetX = position.x
      const targetY = position.y + UNIT_RENDER_OFFSET_Y
      const storedTargetX = sprite.getData('targetX')
      const storedTargetY = sprite.getData('targetY')

      if (storedTargetX !== targetX || storedTargetY !== targetY) {
        sprite.setData('movementStartX', sprite.x)
        sprite.setData('movementStartY', sprite.y)
        sprite.setData('movementElapsed', 0)
        sprite.setData('targetX', targetX)
        sprite.setData('targetY', targetY)
      }

      const startX = sprite.getData('movementStartX') ?? sprite.x
      const startY = sprite.getData('movementStartY') ?? sprite.y
      const elapsed = (sprite.getData('movementElapsed') ?? 0) + delta
      const progress = SIMULATION_TICK_MS > 0 ? Math.min(1, elapsed / SIMULATION_TICK_MS) : 1
      const nextX = Phaser.Math.Linear(startX, targetX, progress)
      const nextY = Phaser.Math.Linear(startY, targetY, progress)
      const animationKey = pawn.state === 'moving' ? 'pawn_run_anim' : 'pawn_idle_anim'
      const facingLeft = pawn.facing === 'left'

      sprite.setData('movementElapsed', elapsed)
      sprite.setPosition(nextX, nextY)
      sprite.setFlipX(facingLeft)
      sprite.setDepth(nextY)
      sprite.anims.play(animationKey, true)
    }
  }
}
