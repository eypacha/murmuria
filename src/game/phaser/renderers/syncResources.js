import {
  DEBUG_MODE,
  TILE_SIZE,
} from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import {
  GOLD_VARIANT_CONFIGS,
  TREE_VARIANT_CONFIGS,
} from '../../config/resourceVariants.js'

const TREE_DISPLAY_WIDTH = 192
const STUMP_DISPLAY_WIDTH = 192
const STUMP_DISPLAY_HEIGHT = 256
const DEBUG_TREE_BORDER_COLOR = 0x58d96f
const DEBUG_GOLD_BORDER_COLOR = 0xf2c94c

function drawDebugOccupiedTiles(scene, resource, depth) {
  const border = scene.add.graphics()
  const color = resource.type === 'gold' ? DEBUG_GOLD_BORDER_COLOR : DEBUG_TREE_BORDER_COLOR

  border.lineStyle(2, color, 1)
  border.setDepth(depth)

  for (const tile of getOccupiedTiles(resource)) {
    border.strokeRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
  }

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
  if (tree.type === 'gold') {
    const variantConfig = getGoldVariantConfig(tree)
    return variantConfig.key
  }

  const variantConfig = getTreeVariantConfig(tree)
  return (tree.amount ?? 0) > 0 ? variantConfig.key : variantConfig.stumpKey
}

function getResourceAnimationKey(tree) {
  if (tree.type === 'gold') {
    const variantConfig = getGoldVariantConfig(tree)

    if ((tree.amount ?? 0) <= 0) {
      return null
    }

    return `${variantConfig.key}_harvest_anim`
  }

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

function getGoldVariantConfig(resource) {
  const variantIndex = Number.isInteger(resource?.variant) ? resource.variant : 0
  const clampedIndex = Math.max(0, Math.min(GOLD_VARIANT_CONFIGS.length - 1, variantIndex))

  return GOLD_VARIANT_CONFIGS[clampedIndex] ?? GOLD_VARIANT_CONFIGS[0]
}

function getResourceDisplaySize(resource) {
  const variantConfig =
    resource.type === 'gold' ? getGoldVariantConfig(resource) : getTreeVariantConfig(resource)

  return {
    width: variantConfig.displayWidth ?? TREE_DISPLAY_WIDTH,
    height: variantConfig.displayHeight ?? TREE_DISPLAY_WIDTH,
  }
}

function getResourceWorldPosition(resource) {
  if (resource.type === 'gold') {
    return {
      x: resource.gridPos.x * TILE_SIZE + TILE_SIZE / 2,
      y: resource.gridPos.y * TILE_SIZE + TILE_SIZE / 2,
    }
  }

  const footprint = resource.footprint ?? { w: 1, h: 1 }
  const centerX = (resource.gridPos.x + footprint.w / 2) * TILE_SIZE
  const baseY = (resource.gridPos.y + footprint.h) * TILE_SIZE

  return {
    x: centerX,
    y: baseY,
  }
}

function isResourceBeingHarvested(resource, worldStore) {
  return (worldStore.units ?? []).some((pawn) => {
    if (pawn.role !== 'pawn') {
      return false
    }

    if (pawn.state !== 'gathering') {
      return false
    }

    return pawn.targetId === resource.id || pawn.workTargetId === resource.id
  })
}

function updateResourceSprite(scene, resource) {
  if (resource.type === 'gold' && (resource.amount ?? 0) <= 0) {
    const existingSprite = scene.resourceSprites.get(resource.id)

    if (existingSprite) {
      existingSprite.destroy()
      scene.resourceSprites.delete(resource.id)
    }

    const existingBorder = scene.resourceDebugBorders.get(resource.id)

    if (existingBorder) {
      existingBorder.destroy()
      scene.resourceDebugBorders.delete(resource.id)
    }

    return
  }

  const position = getResourceWorldPosition(resource)
  const x = position.x
  const y = position.y
  const depth = y
  const textureKey = getResourceTextureKey(resource)
  const isTreeTexture = resource.type === 'tree' && (resource.amount ?? 0) > 0
  const isHarvested = (resource.amount ?? 0) > 0 && isResourceBeingHarvested(resource, scene.worldStore)
  const animationKey = getResourceAnimationKey(resource)
  const displaySize = getResourceDisplaySize(resource)
  const displayWidth = resource.type === 'gold' ? displaySize.width : (isTreeTexture ? TREE_DISPLAY_WIDTH : STUMP_DISPLAY_WIDTH)
  const displayHeight = resource.type === 'gold'
    ? displaySize.height
    : (isTreeTexture ? getTreeVariantConfig(resource).displayHeight : STUMP_DISPLAY_HEIGHT)
  const originX = 0.5
  const originY = resource.type === 'gold' ? 0.5 : 1

  let sprite = scene.resourceSprites.get(resource.id)

  if (!sprite) {
    sprite = scene.add.sprite(x, y, textureKey)
    scene.resourceSprites.set(resource.id, sprite)
    sprite.setData('resourceTextureKey', textureKey)
    sprite.setOrigin(originX, originY)
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
    sprite.setOrigin(originX, originY)
    sprite.setDisplaySize(displayWidth, displayHeight)
    sprite.setDepth(depth)

    if (animationKey && isHarvested) {
      sprite.play(animationKey, true)
    } else {
      sprite.anims?.stop()
      sprite.setFrame(0)
    }
  } else if ((resource.type === 'gold' || isTreeTexture) && isHarvested) {
    if (animationKey && sprite.anims.currentAnim?.key !== animationKey) {
      sprite.play(animationKey, true)
    }
  } else {
    sprite.anims?.stop()
    sprite.setFrame(0)
  }

  sprite.setPosition(x, y)
  sprite.setDepth(depth)

  if (DEBUG_MODE) {
    let border = scene.resourceDebugBorders.get(resource.id)

    if (!border) {
      border = drawDebugOccupiedTiles(scene, resource, depth - 1)
      scene.resourceDebugBorders.set(resource.id, border)
    } else {
      border.setDepth(depth - 1)
    }
  } else {
    const border = scene.resourceDebugBorders.get(resource.id)

    if (border) {
      border.destroy()
      scene.resourceDebugBorders.delete(resource.id)
    }
  }
}

export function syncResources(scene, worldStore) {
  ensureResourceCaches(scene)

  const resources = worldStore.resources ?? []
  const activeResourceIds = new Set()

  for (const resource of resources) {
    activeResourceIds.add(resource.id)
    updateResourceSprite(scene, resource)
  }

  for (const [treeId, sprite] of scene.resourceSprites.entries()) {
    if (activeResourceIds.has(treeId)) {
      continue
    }

    sprite.destroy()
    scene.resourceSprites.delete(treeId)
  }

  for (const [treeId, border] of scene.resourceDebugBorders.entries()) {
    if (activeResourceIds.has(treeId)) {
      continue
    }

    border.destroy()
    scene.resourceDebugBorders.delete(treeId)
  }

  return Array.from(scene.resourceSprites.values())
}
