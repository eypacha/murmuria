import Phaser from 'phaser'
import { GameScene } from './GameScene.js'

export function createPhaserGame(containerId, worldStore) {
  const parentElement =
    typeof containerId === 'string' ? document.getElementById(containerId) : containerId
  const width = parentElement?.clientWidth ?? window.innerWidth
  const height = parentElement?.clientHeight ?? window.innerHeight

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentElement ?? containerId,
    backgroundColor: '#0f172a',
    width,
    height,
    scene: [],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    callbacks: {
      postBoot: (bootedGame) => {
        bootedGame.scene.add('GameScene', GameScene, true, { worldStore })
      },
    },
  })

  return game
}
