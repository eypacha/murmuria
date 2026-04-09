import { DEBUG_MODE, TILE_SIZE } from '../../config/constants.js'

const TREE_DISPLAY_SIZE = 192
const STUMP_DISPLAY_SIZE = 192
const DEBUG_TREE_BORDER_COLOR = 0x58d96f

function drawDebugTileBorder(scene, gridX, gridY, depth) {
  const border = scene.add.graphics()

  border.lineStyle(2, DEBUG_TREE_BORDER_COLOR, 1)
  border.setDepth(depth)
  border.strokeRect(gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE)

  return border
}

function ensureResourceCaches(scene) {
  if (!scene.resourceSprites) {
    scene.resourceSprites = new Map()
  }

  if (!scene.resourceDebugBorders) {
    scene.resourceDebugBorders = new Map()
  }
}

function getResourceTextureKey(tree) {
  return (tree.amount ?? 0) > 0 ? 'tree_0' : 'stump_0'
}

function updateTreeSprite(scene, tree) {
  const x = tree.gridPos.x * TILE_SIZE + TILE_SIZE / 2
  const y = tree.gridPos.y * TILE_SIZE + TILE_SIZE
  const depth = y
  const textureKey = getResourceTextureKey(tree)
  const hasWood = textureKey === 'tree_0'
  const displaySize = hasWood ? TREE_DISPLAY_SIZE : STUMP_DISPLAY_SIZE

  let sprite = scene.resourceSprites.get(tree.id)

  if (!sprite) {
    sprite = scene.add.sprite(x, y, textureKey)
    scene.resourceSprites.set(tree.id, sprite)
    sprite.setData('resourceTextureKey', textureKey)
    sprite.setOrigin(0.5, 1)
    sprite.setDisplaySize(displaySize, displaySize)
    sprite.setDepth(depth)

    if (hasWood) {
      sprite.play('tree_idle_anim', true)
    }
  } else if (sprite.getData('resourceTextureKey') !== textureKey) {
    sprite.anims?.stop()
    sprite.setTexture(textureKey)
    sprite.setData('resourceTextureKey', textureKey)
    sprite.setOrigin(0.5, 1)
    sprite.setDisplaySize(displaySize, displaySize)
    sprite.setDepth(depth)

    if (hasWood) {
      sprite.play('tree_idle_anim', true)
    }
  }

  if (DEBUG_MODE) {
    let border = scene.resourceDebugBorders.get(tree.id)

    if (!border) {
      border = drawDebugTileBorder(scene, tree.gridPos.x, tree.gridPos.y, depth - 1)
      scene.resourceDebugBorders.set(tree.id, border)
    } else {
      border.setDepth(depth - 1)
    }
  } else {
    const border = scene.resourceDebugBorders.get(tree.id)

    if (border) {
      border.destroy()
      scene.resourceDebugBorders.delete(tree.id)
    }
  }
}

export function syncResources(scene, worldStore) {
  ensureResourceCaches(scene)

  const trees = worldStore.resources.filter((resource) => resource.type === 'tree')
  const activeTreeIds = new Set()

  for (const tree of trees) {
    activeTreeIds.add(tree.id)
    updateTreeSprite(scene, tree)
  }

  for (const [treeId, sprite] of scene.resourceSprites.entries()) {
    if (activeTreeIds.has(treeId)) {
      continue
    }

    sprite.destroy()
    scene.resourceSprites.delete(treeId)
  }

  for (const [treeId, border] of scene.resourceDebugBorders.entries()) {
    if (activeTreeIds.has(treeId)) {
      continue
    }

    border.destroy()
    scene.resourceDebugBorders.delete(treeId)
  }

  return Array.from(scene.resourceSprites.values())
}
