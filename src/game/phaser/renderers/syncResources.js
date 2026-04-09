import { DEPTH_RESOURCES, TILE_SIZE } from '../../config/constants.js'

const TREE_FILL = 0x166534
const TREE_STROKE = 0x0f3d23

export function syncResources(scene, worldStore) {
  const trees = worldStore.resources.filter((resource) => resource.type === 'tree')

  return trees.map((tree) => {
    const centerX = tree.gridPos.x * TILE_SIZE + TILE_SIZE / 2
    const centerY = tree.gridPos.y * TILE_SIZE + TILE_SIZE / 2

    const shape = scene.add.circle(centerX, centerY, TILE_SIZE * 0.24, TREE_FILL)

    shape.setStrokeStyle(2, TREE_STROKE, 1)
    shape.setDepth(DEPTH_RESOURCES)

    return shape
  })
}
