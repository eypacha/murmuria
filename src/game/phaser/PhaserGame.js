import Phaser from 'phaser'
import { GRID_HEIGHT, GRID_WIDTH, TILE_SIZE } from '../config/constants.js'
import { GameScene } from './GameScene.js'

export function createPhaserGame(containerId, worldStore) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: containerId,
    backgroundColor: '#0f172a',
    scene: [],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GRID_WIDTH * TILE_SIZE,
      height: GRID_HEIGHT * TILE_SIZE,
    },
    callbacks: {
      postBoot: (bootedGame) => {
        bootedGame.scene.add('GameScene', GameScene, true, { worldStore })
      },
    },
  })

  return game
}
