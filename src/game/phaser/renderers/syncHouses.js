import { TILE_SIZE } from '../../config/constants.js'
import {
  HOUSE_DISPLAY_HEIGHT,
  HOUSE_DISPLAY_WIDTH,
  HOUSE_VARIANT_CONFIGS,
} from '../../config/buildingVariants.js'

const HOUSE_DEPTH_EPSILON = 0.1

function ensureHouseCache(scene) {
  if (!scene.houseSprites) {
    scene.houseSprites = new Map()
  }
}

function getHouseVariantConfig(house) {
  const variantIndex = Number.isInteger(house?.variant) ? house.variant : 0
  const clampedIndex = Math.max(0, Math.min(HOUSE_VARIANT_CONFIGS.length - 1, variantIndex))

  return HOUSE_VARIANT_CONFIGS[clampedIndex] ?? HOUSE_VARIANT_CONFIGS[0]
}

function getHouseWorldPosition(house) {
  const position = house.gridPos ?? { x: house.x ?? 0, y: house.y ?? 0 }
  const footprint = house.footprint ?? { w: 2, h: 2 }

  return {
    x: (position.x + footprint.w / 2) * TILE_SIZE,
    y: (position.y + footprint.h) * TILE_SIZE,
  }
}

function updateHouseSprite(scene, house) {
  const variantConfig = getHouseVariantConfig(house)
  const existingSprite = scene.houseSprites.get(house.id)
  const { x, y } = getHouseWorldPosition(house)
  const depth = y + HOUSE_DEPTH_EPSILON

  if (existingSprite) {
    existingSprite.setTexture(variantConfig.key)
    existingSprite.setPosition(x, y)
    existingSprite.setDisplaySize(HOUSE_DISPLAY_WIDTH, HOUSE_DISPLAY_HEIGHT)
    existingSprite.setDepth(depth)
    return existingSprite
  }

  const sprite = scene.add.image(x, y, variantConfig.key)
  sprite.setOrigin(0.5, 1)
  sprite.setDisplaySize(HOUSE_DISPLAY_WIDTH, HOUSE_DISPLAY_HEIGHT)
  sprite.setDepth(depth)

  scene.houseSprites.set(house.id, sprite)

  return sprite
}

export function syncHouses(scene, worldStore) {
  ensureHouseCache(scene)

  const houses = worldStore.houses ?? []
  const activeHouseIds = new Set()

  for (const house of houses) {
    activeHouseIds.add(house.id)
    updateHouseSprite(scene, house)
  }

  for (const [houseId, sprite] of scene.houseSprites.entries()) {
    if (activeHouseIds.has(houseId)) {
      continue
    }

    sprite.destroy()
    scene.houseSprites.delete(houseId)
  }

  return Array.from(scene.houseSprites.values())
}
