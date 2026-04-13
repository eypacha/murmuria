import {
  DEBUG_MODE,
  SIMULATION_TICK_MS,
  TILE_SIZE,
} from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import {
  BUSH_VARIANT_CONFIGS,
  GOLD_VARIANT_CONFIGS,
  MEAT_RESOURCE_CONFIG,
  ROCK_VARIANT_CONFIGS,
  SHEEP_VARIANT_CONFIGS,
  TREE_VARIANT_CONFIGS,
} from '../../config/resourceVariants.js'

const TREE_DISPLAY_WIDTH = 192
const STUMP_DISPLAY_WIDTH = 192
const STUMP_DISPLAY_HEIGHT = 256
const DEBUG_TREE_BORDER_COLOR = 0x58d96f
const DEBUG_GOLD_BORDER_COLOR = 0xf2c94c
const DEBUG_SHEEP_BORDER_COLOR = 0xe7a07f
const DEBUG_ROCK_BORDER_COLOR = 0x8a8f98
const DEBUG_BUSH_BORDER_COLOR = 0x5f8f47
const SHEEP_HIT_TINT_COLOR = 0xff6b6b
const SHEEP_HIT_FLASH_MS = 90
const SHEEP_HIT_FLASH_FRAME_INDEX = 2
const SKULL_ANIMATION_BOUND_KEY = 'skullAnimationBound'
const SKULL_ANIMATION_COMPLETE_KEY = 'skullAnimationComplete'
const BUSH_ANIMATION_BOUND_KEY = 'bushAnimationBound'
const BUSH_WAS_OCCUPIED_KEY = 'bushWasOccupied'
const SHEEP_HIT_FLASH_BOUND_KEY = 'sheepHitFlashBound'
const SHEEP_HIT_FLASH_TIMER_KEY = 'sheepHitFlashTimer'
const RESOURCE_RENDER_START_X_KEY = 'resourceRenderStartX'
const RESOURCE_RENDER_START_Y_KEY = 'resourceRenderStartY'
const RESOURCE_RENDER_TARGET_X_KEY = 'resourceRenderTargetX'
const RESOURCE_RENDER_TARGET_Y_KEY = 'resourceRenderTargetY'
const RESOURCE_RENDER_ELAPSED_KEY = 'resourceRenderElapsed'
const RESOURCE_DEBUG_LABEL_FONT_SIZE = '16px'
const RESOURCE_DEBUG_LABEL_OFFSET_Y = 18

function getResourceDebugAmountText(resource) {
  if (resource.type !== 'tree' && resource.type !== 'gold' && resource.type !== 'meat') {
    return null
  }

  return String(Math.max(0, Math.floor(Number(resource.amount ?? 0))))
}

function getResourceDebugLabelText(resource) {
  if (resource.type !== 'tree' && resource.type !== 'gold' && resource.type !== 'meat') {
    return null
  }

  const amountText = getResourceDebugAmountText(resource)

  if (resource.type === 'tree' || resource.type === 'gold' || resource.type === 'sheep' || resource.type === 'meat') {
    return amountText
  }

  return amountText
}

function ensureResourceDebugLabels(scene) {
  if (!scene.resourceDebugLabels) {
    scene.resourceDebugLabels = new Map()
  }

  return scene.resourceDebugLabels
}

function getResourceDebugLabelPosition(sprite, resource) {
  return {
    x: sprite?.x ?? 0,
    y: sprite?.y ?? 0,
  }
}

function drawDebugOccupiedTiles(scene, resource, depth) {
  const border = scene.add.graphics()
  const color =
    resource.type === 'gold'
      ? DEBUG_GOLD_BORDER_COLOR
      : resource.type === 'sheep'
        ? DEBUG_SHEEP_BORDER_COLOR
        : resource.type === 'rock'
          ? DEBUG_ROCK_BORDER_COLOR
          : resource.type === 'bush'
            ? DEBUG_BUSH_BORDER_COLOR
        : DEBUG_TREE_BORDER_COLOR

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

  ensureResourceDebugLabels(scene)
}

function getResourceTextureKey(tree, currentTick = 0) {
  if (tree.type === 'skull') {
    return 'villager-dead'
  }

  if (tree.type === 'meat') {
    return MEAT_RESOURCE_CONFIG.key
  }

  if (tree.type === 'sheep') {
    return getSheepVariantTextureKey(tree, currentTick)
  }

  if (tree.type === 'rock') {
    return getRockVariantConfig(tree).key
  }

  if (tree.type === 'bush') {
    return getBushVariantConfig(tree).key
  }

  if (tree.type === 'gold') {
    const variantConfig = getGoldVariantConfig(tree)
    return variantConfig.key
  }

  const variantConfig = getTreeVariantConfig(tree)
  return (tree.amount ?? 0) > 0 ? variantConfig.key : variantConfig.stumpKey
}

function getResourceAnimationKey(tree, currentTick = 0) {
  if (tree.type === 'skull') {
    return 'villager-dead_anim'
  }

  if (tree.type === 'meat') {
    return null
  }

  if (tree.type === 'sheep') {
    return getSheepAnimationKey(tree, currentTick)
  }

  if (tree.type === 'bush') {
    return getBushAnimationKey(tree)
  }

  if (tree.type === 'rock') {
    return null
  }

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

function getRockVariantConfig(resource) {
  const variantIndex = Number.isInteger(resource?.variant) ? resource.variant : 0
  const clampedIndex = Math.max(0, Math.min(ROCK_VARIANT_CONFIGS.length - 1, variantIndex))

  return ROCK_VARIANT_CONFIGS[clampedIndex] ?? ROCK_VARIANT_CONFIGS[0]
}

function getBushVariantConfig(resource) {
  const variantIndex = Number.isInteger(resource?.variant) ? resource.variant : 0
  const clampedIndex = Math.max(0, Math.min(BUSH_VARIANT_CONFIGS.length - 1, variantIndex))

  return BUSH_VARIANT_CONFIGS[clampedIndex] ?? BUSH_VARIANT_CONFIGS[0]
}

function getBushAnimationKey(resource) {
  return `${getBushVariantConfig(resource).key}_anim`
}

function getSheepVariantConfig(resource) {
  const variantIndex = Number.isInteger(resource?.variant) ? resource.variant : 0
  const clampedIndex = Math.max(0, Math.min(SHEEP_VARIANT_CONFIGS.length - 1, variantIndex))

  return SHEEP_VARIANT_CONFIGS[clampedIndex] ?? SHEEP_VARIANT_CONFIGS[0]
}

function getSheepVariantTextureKey(resource, currentTick = 0) {
  const variantConfig = getSheepVariantConfig(resource)
  const state = getSheepRenderState(resource, currentTick)

  if (state === 'moving') {
    return variantConfig.moveKey
  }

  if (state === 'eating') {
    return variantConfig.grassKey
  }

  return variantConfig.idleKey
}

function getSheepRenderState(resource, currentTick) {
  const visualState = typeof resource?.visualState === 'string' ? resource.visualState : null
  const visualStateUntilTick = Number.isFinite(resource?.visualStateUntilTick)
    ? resource.visualStateUntilTick
    : null

  if (
    visualState &&
    visualStateUntilTick != null &&
    Number.isFinite(currentTick) &&
    currentTick <= visualStateUntilTick
  ) {
    return visualState
  }

  return typeof resource?.state === 'string' ? resource.state : 'idle'
}

function getSheepAnimationKey(resource, currentTick = 0) {
  return `${getSheepVariantTextureKey(resource, currentTick)}_anim`
}

function isResourceFacingLeft(resource) {
  return resource?.facing === 'left'
}

function isBushOccupied(worldStore, bush) {
  const bushTileKey = `${bush.gridPos?.x ?? -1}:${bush.gridPos?.y ?? -1}`
  const entities = [
    ...(worldStore.units ?? []),
    ...((worldStore.resources ?? []).filter((resource) => resource.type === 'sheep')),
  ]

  for (const entity of entities) {
    for (const tile of getOccupiedTiles(entity)) {
      if (`${tile.x}:${tile.y}` === bushTileKey) {
        return true
      }
    }
  }

  return false
}

function ensureBushAnimationBinding(sprite) {
  if (sprite.getData(BUSH_ANIMATION_BOUND_KEY)) {
    return
  }

  const handleAnimationComplete = (animation) => {
    if (animation?.key !== `${sprite.getData('resourceTextureKey')}_anim`) {
      return
    }

    if (sprite.active) {
      sprite.setFrame(0)
    }
  }

  sprite.on('animationcomplete', handleAnimationComplete)
  sprite.once('destroy', () => {
    sprite.off('animationcomplete', handleAnimationComplete)
  })
  sprite.setData(BUSH_ANIMATION_BOUND_KEY, true)
}

function clearSheepHitFlash(sprite) {
  const timer = sprite.getData(SHEEP_HIT_FLASH_TIMER_KEY)

  if (timer) {
    timer.remove(false)
    sprite.setData(SHEEP_HIT_FLASH_TIMER_KEY, null)
  }

  sprite.clearTint()
}

function flashSheepHit(scene, sprite) {
  if (!sprite?.active) {
    return
  }

  clearSheepHitFlash(sprite)
  sprite.setTint(SHEEP_HIT_TINT_COLOR)

  const timer = scene.time.delayedCall(SHEEP_HIT_FLASH_MS, () => {
    if (sprite.active) {
      sprite.clearTint()
    }

    sprite.setData(SHEEP_HIT_FLASH_TIMER_KEY, null)
  })

  sprite.setData(SHEEP_HIT_FLASH_TIMER_KEY, timer)
}

function ensureSheepHitFlashBinding(scene, sprite, resource) {
  if (sprite.getData(SHEEP_HIT_FLASH_BOUND_KEY)) {
    return
  }

  const handleAnimationUpdate = (_animation, frame) => {
    if (!isResourceBeingHarvested(resource, scene.worldStore)) {
      return
    }

    const frameIndex = Number.isInteger(frame?.index)
      ? frame.index
      : sprite.anims?.currentFrame?.index

    if (frameIndex !== SHEEP_HIT_FLASH_FRAME_INDEX) {
      return
    }

    flashSheepHit(scene, sprite)
  }

  sprite.on('animationupdate', handleAnimationUpdate)
  sprite.once('destroy', () => {
    clearSheepHitFlash(sprite)
  })
  sprite.setData(SHEEP_HIT_FLASH_BOUND_KEY, true)
}

function ensureSkullAnimationBinding(sprite) {
  if (sprite.getData(SKULL_ANIMATION_BOUND_KEY)) {
    return
  }

  const handleAnimationComplete = (animation) => {
    if (animation?.key !== 'villager-dead_anim') {
      return
    }

    if (sprite.active) {
      sprite.setFrame(6)
      sprite.anims?.stop()
    }

    sprite.setData(SKULL_ANIMATION_COMPLETE_KEY, true)
  }

  sprite.on('animationcomplete', handleAnimationComplete)
  sprite.once('destroy', () => {
    sprite.off('animationcomplete', handleAnimationComplete)
  })
  sprite.setData(SKULL_ANIMATION_BOUND_KEY, true)
}

function getResourceDisplaySize(resource) {
  if (resource.type === 'skull') {
    return {
      width: 128,
      height: 128,
    }
  }

  if (resource.type === 'meat') {
    return {
      width: MEAT_RESOURCE_CONFIG.displayWidth ?? 128,
      height: MEAT_RESOURCE_CONFIG.displayHeight ?? 128,
    }
  }

  if (resource.type === 'sheep') {
    const variantConfig = getSheepVariantConfig(resource)

    return {
      width: variantConfig.displayWidth ?? TREE_DISPLAY_WIDTH,
      height: variantConfig.displayHeight ?? TREE_DISPLAY_WIDTH,
    }
  }

  if (resource.type === 'rock') {
    const variantConfig = getRockVariantConfig(resource)

    return {
      width: variantConfig.displayWidth ?? 64,
      height: variantConfig.displayHeight ?? 64,
    }
  }

  if (resource.type === 'bush') {
    const variantConfig = getBushVariantConfig(resource)

    return {
      width: variantConfig.displayWidth ?? 128,
      height: variantConfig.displayHeight ?? 128,
    }
  }

  const variantConfig =
    resource.type === 'gold' ? getGoldVariantConfig(resource) : getTreeVariantConfig(resource)

  return {
    width: variantConfig.displayWidth ?? TREE_DISPLAY_WIDTH,
    height: variantConfig.displayHeight ?? TREE_DISPLAY_WIDTH,
  }
}

function getResourceWorldPosition(resource) {
  if (resource?.pos && Number.isFinite(resource.pos.x) && Number.isFinite(resource.pos.y)) {
    return resource.pos
  }

  if (
    resource.type === 'gold' ||
    resource.type === 'sheep' ||
    resource.type === 'meat' ||
    resource.type === 'rock' ||
    resource.type === 'bush' ||
    resource.type === 'skull'
  ) {
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

function updateInterpolatedResourcePosition(scene, sprite, targetPosition) {
  const currentTargetX = sprite.getData(RESOURCE_RENDER_TARGET_X_KEY)
  const currentTargetY = sprite.getData(RESOURCE_RENDER_TARGET_Y_KEY)
  const targetChanged =
    !Number.isFinite(currentTargetX) ||
    !Number.isFinite(currentTargetY) ||
    currentTargetX !== targetPosition.x ||
    currentTargetY !== targetPosition.y

  if (targetChanged) {
    sprite.setData(RESOURCE_RENDER_START_X_KEY, sprite.x)
    sprite.setData(RESOURCE_RENDER_START_Y_KEY, sprite.y)
    sprite.setData(RESOURCE_RENDER_TARGET_X_KEY, targetPosition.x)
    sprite.setData(RESOURCE_RENDER_TARGET_Y_KEY, targetPosition.y)
    sprite.setData(RESOURCE_RENDER_ELAPSED_KEY, 0)
  }

  const startX = sprite.getData(RESOURCE_RENDER_START_X_KEY) ?? targetPosition.x
  const startY = sprite.getData(RESOURCE_RENDER_START_Y_KEY) ?? targetPosition.y
  const targetX = sprite.getData(RESOURCE_RENDER_TARGET_X_KEY) ?? targetPosition.x
  const targetY = sprite.getData(RESOURCE_RENDER_TARGET_Y_KEY) ?? targetPosition.y
  const visualDelta = scene.getVisualDelta?.(scene.game.loop.delta ?? 0) ?? 0
  const elapsed = Math.min(
    SIMULATION_TICK_MS,
    (sprite.getData(RESOURCE_RENDER_ELAPSED_KEY) ?? 0) + visualDelta,
  )

  sprite.setData(RESOURCE_RENDER_ELAPSED_KEY, elapsed)

  const progress = SIMULATION_TICK_MS > 0 ? elapsed / SIMULATION_TICK_MS : 1
  const nextX = startX + (targetX - startX) * progress
  const nextY = startY + (targetY - startY) * progress

  sprite.setPosition(nextX, nextY)
}

function isResourceBeingHarvested(resource, worldStore) {
  return (worldStore.units ?? []).some((unit) => {
    if (unit.role !== 'villager') {
      return false
    }

    if (unit.state !== 'gathering') {
      return false
    }

    return unit.targetId === resource.id || unit.workTargetId === resource.id
  })
}

function updateResourceSprite(scene, resource) {
  if (
    (resource.type === 'gold' || resource.type === 'sheep' || resource.type === 'meat') &&
    (resource.amount ?? 0) <= 0
  ) {
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

    const existingLabel = scene.resourceDebugLabels?.get(resource.id)

    if (existingLabel) {
      existingLabel.destroy()
      scene.resourceDebugLabels.delete(resource.id)
    }

    return
  }

  const position = getResourceWorldPosition(resource)
  const x = position.x
  const y = position.y
  const depth = y
  const textureKey = getResourceTextureKey(resource)
  const animationKey = getResourceAnimationKey(resource)
  const isTreeTexture = resource.type === 'tree' && (resource.amount ?? 0) > 0
  const isHarvested = (resource.amount ?? 0) > 0 && isResourceBeingHarvested(resource, scene.worldStore)
  const isSheep = resource.type === 'sheep'
  const isMeat = resource.type === 'meat'
  const isSkull = resource.type === 'skull'
  const isRock = resource.type === 'rock'
  const isBush = resource.type === 'bush'
  const bushOccupied = isBush ? isBushOccupied(scene.worldStore, resource) : false
  let sprite = scene.resourceSprites.get(resource.id)
  const displaySize = getResourceDisplaySize(resource)
  const displayWidth = resource.type === 'gold' || isSheep || isMeat || isRock || isBush || isSkull
    ? displaySize.width
    : (isTreeTexture ? TREE_DISPLAY_WIDTH : STUMP_DISPLAY_WIDTH)
  const displayHeight = resource.type === 'gold' || isSheep || isMeat || isRock || isBush || isSkull
    ? displaySize.height
    : (isTreeTexture ? getTreeVariantConfig(resource).displayHeight : STUMP_DISPLAY_HEIGHT)
  const originX = 0.5
  const originY = resource.type === 'gold' || isSheep || isMeat || isRock || isBush || isSkull ? 0.5 : 1
  const shouldAnimate = isSheep || isSkull || ((resource.type === 'gold' || isTreeTexture) && isHarvested)
  const bushAnimationKey = isBush ? getBushAnimationKey(resource) : null
  const skullAnimationKey = isSkull ? getResourceAnimationKey(resource) : null
  const debugLabelText = getResourceDebugLabelText(resource)
  const currentTick = scene.worldStore?.tick ?? 0
  const sheepRenderState = isSheep ? getSheepRenderState(resource, currentTick) : null

  if (!sprite) {
    const renderTextureKey = isSheep
      ? getSheepVariantTextureKey({ ...resource, state: sheepRenderState }, currentTick)
      : isMeat
        ? getResourceTextureKey(resource)
      : isRock
        ? getRockVariantConfig(resource).key
        : isBush
          ? getBushVariantConfig(resource).key
          : isSkull
            ? getResourceTextureKey(resource)
          : textureKey
    const renderAnimationKey = isSheep
      ? getSheepAnimationKey({ ...resource, state: sheepRenderState }, currentTick)
      : isMeat
        ? null
      : isBush
        ? bushAnimationKey
        : isSkull
          ? skullAnimationKey
        : animationKey

    sprite = scene.add.sprite(x, y, renderTextureKey)
    scene.resourceSprites.set(resource.id, sprite)
    sprite.setData('resourceTextureKey', renderTextureKey)
    if (isBush) {
      sprite.setData(BUSH_WAS_OCCUPIED_KEY, bushOccupied)
    }
    sprite.setOrigin(originX, originY)
    sprite.setDisplaySize(displayWidth, displayHeight)
    sprite.setDepth(depth)

    if ((shouldAnimate || bushOccupied) && renderAnimationKey) {
      sprite.play(renderAnimationKey, true)
      if (isSkull) {
        ensureSkullAnimationBinding(sprite)
        sprite.setData(SKULL_ANIMATION_COMPLETE_KEY, false)
      }
    } else {
      sprite.anims?.stop()
      sprite.setFrame(0)
    }
  } else if (
    sprite.getData('resourceTextureKey') !==
    (isSheep
      ? getSheepVariantTextureKey({ ...resource, state: sheepRenderState }, currentTick)
      : isMeat
        ? getResourceTextureKey(resource)
      : isRock
        ? getRockVariantConfig(resource).key
        : isBush
          ? getBushVariantConfig(resource).key
          : isSkull
            ? getResourceTextureKey(resource)
          : textureKey)
  ) {
    const renderTextureKey = isSheep
      ? getSheepVariantTextureKey({ ...resource, state: sheepRenderState }, currentTick)
      : isMeat
        ? getResourceTextureKey(resource)
      : isRock
        ? getRockVariantConfig(resource).key
        : isBush
          ? getBushVariantConfig(resource).key
          : isSkull
            ? getResourceTextureKey(resource)
          : textureKey
    const renderAnimationKey = isSheep
      ? getSheepAnimationKey({ ...resource, state: sheepRenderState }, currentTick)
      : isMeat
        ? null
      : isBush
        ? bushAnimationKey
        : isSkull
          ? skullAnimationKey
        : animationKey

    sprite.anims?.stop()
    sprite.setTexture(renderTextureKey)
    sprite.setData('resourceTextureKey', renderTextureKey)
    sprite.setOrigin(originX, originY)
    sprite.setDisplaySize(displayWidth, displayHeight)
    sprite.setDepth(depth)

    if ((shouldAnimate || bushOccupied) && renderAnimationKey) {
      sprite.play(renderAnimationKey, true)
      if (isSkull) {
        ensureSkullAnimationBinding(sprite)
        sprite.setData(SKULL_ANIMATION_COMPLETE_KEY, false)
      }
    } else {
      sprite.anims?.stop()
      sprite.setFrame(0)
    }
  } else if (isBush) {
    const wasBushOccupied = Boolean(sprite.getData(BUSH_WAS_OCCUPIED_KEY))

    if (bushOccupied && !wasBushOccupied && bushAnimationKey) {
      sprite.play(bushAnimationKey, true)
    } else if (!bushOccupied && wasBushOccupied) {
      sprite.anims?.stop()
      sprite.setFrame(0)
    }

    sprite.setData(BUSH_WAS_OCCUPIED_KEY, bushOccupied)
  } else if (isSkull) {
    ensureSkullAnimationBinding(sprite)

    if (
      !sprite.getData(SKULL_ANIMATION_COMPLETE_KEY) &&
      skullAnimationKey &&
      (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== skullAnimationKey)
    ) {
      sprite.play(skullAnimationKey, true)
    } else if (sprite.getData(SKULL_ANIMATION_COMPLETE_KEY)) {
      sprite.anims?.stop()
      sprite.setFrame(6)
    }
  } else if (shouldAnimate) {
    const renderAnimationKey = isSheep
      ? getSheepAnimationKey({ ...resource, state: sheepRenderState }, currentTick)
      : animationKey

    if (
      renderAnimationKey &&
      (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== renderAnimationKey)
    ) {
      sprite.play(renderAnimationKey, true)
    }
  } else {
    sprite.anims?.stop()
    sprite.setFrame(0)
  }

  if (isSheep || isMeat || isSkull) {
    sprite.clearTint()
  }

  if (isBush) {
    ensureBushAnimationBinding(sprite)
  }

  if (isSheep) {
    updateInterpolatedResourcePosition(scene, sprite, { x, y })
  } else {
    sprite.setPosition(x, y)
  }

  sprite.setDepth(depth)
  sprite.setFlipX(isResourceFacingLeft(resource))

  if (DEBUG_MODE) {
    const existingBorder = scene.resourceDebugBorders.get(resource.id)

    if (existingBorder) {
      existingBorder.destroy()
    }

    const border = drawDebugOccupiedTiles(scene, resource, depth - 1)
    scene.resourceDebugBorders.set(resource.id, border)
  } else {
    const border = scene.resourceDebugBorders.get(resource.id)

    if (border) {
      border.destroy()
      scene.resourceDebugBorders.delete(resource.id)
    }
  }

  const labels = ensureResourceDebugLabels(scene)
  const existingLabel = labels.get(resource.id)

  if (DEBUG_MODE && debugLabelText) {
    const labelPosition = getResourceDebugLabelPosition(sprite, resource)
    const label =
      existingLabel ??
      scene.add.text(0, 0, debugLabelText, {
        fontFamily: 'monospace',
        fontSize: RESOURCE_DEBUG_LABEL_FONT_SIZE,
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
        align: 'center',
      })

    label.setText(debugLabelText)
    label.setOrigin(0.5, 1)
    label.setPosition(labelPosition.x, labelPosition.y)
    label.setDepth(depth + 1)
    label.setScrollFactor(1, 1)
    labels.set(resource.id, label)
  } else if (existingLabel) {
    existingLabel.destroy()
    labels.delete(resource.id)
  }
}

export function syncResources(scene, worldStore) {
  ensureResourceCaches(scene)

  const resources = [
    ...(worldStore.resources ?? []),
    ...(worldStore.decorations ?? []),
  ]
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

  for (const [resourceId, label] of scene.resourceDebugLabels.entries()) {
    if (activeResourceIds.has(resourceId)) {
      continue
    }

    label.destroy()
    scene.resourceDebugLabels.delete(resourceId)
  }

  return Array.from(scene.resourceSprites.values())
}
