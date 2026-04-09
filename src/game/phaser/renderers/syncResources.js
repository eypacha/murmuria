import {
  DEBUG_MODE,
  TILE_SIZE,
  TREE_VARIANT_CONFIGS,
} from '../../config/constants.js'

const TREE_DISPLAY_WIDTH = 192
const STUMP_DISPLAY_WIDTH = 192
const STUMP_DISPLAY_HEIGHT = 256
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
  const variantConfig = getTreeVariantConfig(tree)

  return (tree.amount ?? 0) > 0 ? variantConfig.key : variantConfig.stumpKey
}

function getResourceAnimationKey(tree) {
  const variantConfig = getTreeVariantConfig(tree)

  if ((tree.amount ?? 0) <= 0) {
    return null
  }

  return `${variantConfig.key}_idle_anim`
}

function getTreeVariantConfig(tree) {
  const variantIndex = Number.isInteger(tree?.variant) ? tree.variant : 0
  const clampedIndex = Math.max(0, Math.min(TREE_VARIANT_CONFIGS.length - 1, variantIndex))

  return TREE_VARIANT_CONFIGS[clampedIndex] ?? TREE_VARIANT_CONFIGS[0]
}

function isTreeBeingHarvested(tree, worldStore) {
  return (worldStore.units ?? []).some((pawn) => {
    if (pawn.role !== 'pawn') {
      return false
    }

    if (pawn.state !== 'gathering') {
      return false
    }

    return pawn.targetId === tree.id || pawn.workTargetId === tree.id
  })
}

function updateTreeSprite(scene, tree) {
  const x = tree.gridPos.x * TILE_SIZE + TILE_SIZE / 2
  const y = tree.gridPos.y * TILE_SIZE + TILE_SIZE
  const depth = y
  const variantConfig = getTreeVariantConfig(tree)
  const textureKey = getResourceTextureKey(tree)
  const isTreeTexture = (tree.amount ?? 0) > 0
  const isHarvested = isTreeTexture && isTreeBeingHarvested(tree, scene.worldStore)
  const animationKey = getResourceAnimationKey(tree)
  const displayWidth = isTreeTexture ? TREE_DISPLAY_WIDTH : STUMP_DISPLAY_WIDTH
  const displayHeight = isTreeTexture ? variantConfig.displayHeight : STUMP_DISPLAY_HEIGHT

  let sprite = scene.resourceSprites.get(tree.id)

  if (!sprite) {
    sprite = scene.add.sprite(x, y, textureKey)
    scene.resourceSprites.set(tree.id, sprite)
    sprite.setData('resourceTextureKey', textureKey)
    sprite.setOrigin(0.5, 1)
    sprite.setDisplaySize(displayWidth, displayHeight)
    sprite.setDepth(depth)

    if (animationKey && isHarvested) {
      sprite.play(animationKey, true)
    } else {
      sprite.anims?.stop()
      sprite.setFrame(0)
    }
  } else if (sprite.getData('resourceTextureKey') !== textureKey) {
    sprite.anims?.stop()
    sprite.setTexture(textureKey)
    sprite.setData('resourceTextureKey', textureKey)
    sprite.setOrigin(0.5, 1)
    sprite.setDisplaySize(displayWidth, displayHeight)
    sprite.setDepth(depth)

    if (animationKey && isHarvested) {
      sprite.play(animationKey, true)
    } else {
      sprite.anims?.stop()
      sprite.setFrame(0)
    }
  } else if (isTreeTexture && isHarvested) {
    if (animationKey && sprite.anims.currentAnim?.key !== animationKey) {
      sprite.play(animationKey, true)
    }
  } else {
    sprite.anims?.stop()
    sprite.setFrame(0)
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
