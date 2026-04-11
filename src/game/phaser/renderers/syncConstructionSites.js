import { TILE_SIZE } from '../../config/constants.js'
import {
  HOUSE_DISPLAY_HEIGHT,
  HOUSE_DISPLAY_WIDTH,
  HOUSE_VARIANT_CONFIGS,
} from '../../config/buildingVariants.js'

const CONSTRUCTION_SITE_ALPHA = 0.2
const CONSTRUCTION_SITE_DEPTH_EPSILON = 0.08

function ensureConstructionSiteCache(scene) {
  if (!scene.constructionSiteSprites) {
    scene.constructionSiteSprites = new Map()
  }
}

function getConstructionSiteVariantConfig(site) {
  const variantIndex = Number.isInteger(site?.variant) ? site.variant : 0
  const clampedIndex = Math.max(0, Math.min(HOUSE_VARIANT_CONFIGS.length - 1, variantIndex))

  return HOUSE_VARIANT_CONFIGS[clampedIndex] ?? HOUSE_VARIANT_CONFIGS[0]
}

function getConstructionSiteWorldPosition(site) {
  const position = site.gridPos ?? { x: site.x ?? 0, y: site.y ?? 0 }
  const footprint = site.footprint ?? { w: 2, h: 2 }

  return {
    x: (position.x + footprint.w / 2) * TILE_SIZE,
    y: (position.y + footprint.h) * TILE_SIZE,
  }
}

function updateConstructionSiteSprite(scene, site) {
  const variantConfig = getConstructionSiteVariantConfig(site)
  const existingSprite = scene.constructionSiteSprites.get(site.id)
  const { x, y } = getConstructionSiteWorldPosition(site)
  const depth = y + CONSTRUCTION_SITE_DEPTH_EPSILON

  if (existingSprite) {
    existingSprite.setTexture(variantConfig.key)
    existingSprite.setPosition(x, y)
    existingSprite.setDisplaySize(HOUSE_DISPLAY_WIDTH, HOUSE_DISPLAY_HEIGHT)
    existingSprite.setDepth(depth)
    existingSprite.setAlpha(CONSTRUCTION_SITE_ALPHA)
    return existingSprite
  }

  const sprite = scene.add.image(x, y, variantConfig.key)
  sprite.setOrigin(0.5, 1)
  sprite.setDisplaySize(HOUSE_DISPLAY_WIDTH, HOUSE_DISPLAY_HEIGHT)
  sprite.setDepth(depth)
  sprite.setAlpha(CONSTRUCTION_SITE_ALPHA)

  scene.constructionSiteSprites.set(site.id, sprite)

  return sprite
}

export function syncConstructionSites(scene, worldStore) {
  ensureConstructionSiteCache(scene)

  const constructionSites = worldStore.constructionSites ?? []
  const activeConstructionSiteIds = new Set()

  for (const site of constructionSites) {
    if (site.revealed === false) {
      continue
    }

    activeConstructionSiteIds.add(site.id)
    updateConstructionSiteSprite(scene, site)
  }

  for (const [siteId, sprite] of scene.constructionSiteSprites.entries()) {
    if (activeConstructionSiteIds.has(siteId)) {
      continue
    }

    sprite.destroy()
    scene.constructionSiteSprites.delete(siteId)
  }

  return Array.from(scene.constructionSiteSprites.values())
}
