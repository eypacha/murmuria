import { TILE_SIZE } from '../../config/constants.js'

const TREE_SCALE = TILE_SIZE / 192

export function syncResources(scene, worldStore) {
  const trees = worldStore.resources.filter((resource) => resource.type === 'tree')

  return trees.map((tree) => {
    const x = tree.gridPos.x * TILE_SIZE + TILE_SIZE / 2
    const y = tree.gridPos.y * TILE_SIZE + TILE_SIZE
    const depth = y

    const sprite = scene.add.sprite(x, y, 'tree_0')
    sprite.setOrigin(0.5, 1)
    sprite.setScale(TREE_SCALE)
    sprite.setDepth(depth)
    sprite.play('tree_idle_anim')

    return sprite
  })
}
