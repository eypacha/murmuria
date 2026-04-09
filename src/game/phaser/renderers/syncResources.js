import { DEBUG_MODE, TILE_SIZE } from '../../config/constants.js'

const TREE_DISPLAY_SIZE = 192
const DEBUG_TREE_BORDER_COLOR = 0x58d96f

function drawDebugTileBorder(scene, gridX, gridY, depth) {
  const border = scene.add.graphics()

  border.lineStyle(2, DEBUG_TREE_BORDER_COLOR, 1)
  border.setDepth(depth)
  border.strokeRect(gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE)
}

export function syncResources(scene, worldStore) {
  const trees = worldStore.resources.filter((resource) => resource.type === 'tree')

  return trees.map((tree) => {
    const x = tree.gridPos.x * TILE_SIZE + TILE_SIZE / 2
    const y = tree.gridPos.y * TILE_SIZE + TILE_SIZE
    const depth = y

    const sprite = scene.add.sprite(x, y, 'tree_0')
    sprite.setOrigin(0.5, 1)
    sprite.setDisplaySize(TREE_DISPLAY_SIZE, TREE_DISPLAY_SIZE)
    sprite.setDepth(depth)
    sprite.play('tree_idle_anim')

    if (DEBUG_MODE) {
      drawDebugTileBorder(scene, tree.gridPos.x, tree.gridPos.y, depth - 1)
    }

    return sprite
  })
}
