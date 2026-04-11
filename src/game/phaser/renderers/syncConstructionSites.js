import { TILE_SIZE } from '../../config/constants.js'
import {
  HOUSE_DISPLAY_HEIGHT,
  HOUSE_DISPLAY_WIDTH,
  HOUSE_VARIANT_CONFIGS,
} from '../../config/buildingVariants.js'

const CONSTRUCTION_SITE_ALPHA = 0.2
const CONSTRUCTION_SITE_DEPTH_EPSILON = 0.08
const WOOD_RESOURCE_TEXTURE_KEY = 'construction-site-wood-resource'
const INDICATOR_ICON_SCALE = 0.58
const INDICATOR_TEXT_STYLE = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '18px',
  color: '#f4e9c7',
  stroke: '#1d1408',
  strokeThickness: 4,
}

const INDICATOR_TEXT_OFFSET_X = 10
const INDICATOR_ICON_OFFSET_X = 25
const INDICATOR_UI_DEPTH = 10000

function ensureConstructionSiteCache(scene) {
  if (!scene.constructionSiteSprites) {
    scene.constructionSiteSprites = new Map()
  }

  if (!scene.constructionSiteIndicators) {
    scene.constructionSiteIndicators = new Map()
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

function updateConstructionSiteIndicator(scene, site) {
  const existingIndicator = scene.constructionSiteIndicators.get(site.id)
  const { x, y } = getConstructionSiteWorldPosition(site)
  const delivered = Math.max(0, Number(site.woodDelivered ?? 0))
  const required = Math.max(0, Number(site.woodRequired ?? 0))
  const labelText = `${delivered}/${required}`

  if (existingIndicator) {
    existingIndicator.setPosition(x, y)
    existingIndicator.setDepth(INDICATOR_UI_DEPTH)

    const icon = existingIndicator.getByName('wood-icon')
    const label = existingIndicator.getByName('wood-label')

    if (icon) {
      icon.setTexture(WOOD_RESOURCE_TEXTURE_KEY)
    }

    if (label) {
      label.setText(labelText)
    }

    return existingIndicator
  }

  const container = scene.add.container(x, y)
  container.setDepth(INDICATOR_UI_DEPTH)

  const icon = scene.add.image(INDICATOR_ICON_OFFSET_X, 0, WOOD_RESOURCE_TEXTURE_KEY)
  icon.setName('wood-icon')
  icon.setScale(INDICATOR_ICON_SCALE)
  icon.setOrigin(0.5, 0.5)

  const label = scene.add.text(INDICATOR_TEXT_OFFSET_X, 0, labelText, INDICATOR_TEXT_STYLE)
  label.setName('wood-label')
  label.setOrigin(1, 0.5)

  container.add([icon, label])
  scene.constructionSiteIndicators.set(site.id, container)

  return container
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
    updateConstructionSiteIndicator(scene, site)
  }

  for (const [siteId, sprite] of scene.constructionSiteSprites.entries()) {
    if (activeConstructionSiteIds.has(siteId)) {
      continue
    }

    sprite.destroy()
    scene.constructionSiteSprites.delete(siteId)
  }

  for (const [siteId, indicator] of scene.constructionSiteIndicators.entries()) {
    if (activeConstructionSiteIds.has(siteId)) {
      continue
    }

    indicator.destroy()
    scene.constructionSiteIndicators.delete(siteId)
  }

  return [
    ...scene.constructionSiteSprites.values(),
    ...scene.constructionSiteIndicators.values(),
  ]
}
