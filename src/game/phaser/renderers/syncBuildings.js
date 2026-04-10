import { DEBUG_MODE, TILE_SIZE } from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'

const CASTLE_DISPLAY_WIDTH = 320
const CASTLE_DISPLAY_HEIGHT = 256
const CASTLE_DEPTH_EPSILON = 0.1
const CONSTRUCTION_SITE_ALPHA = 0.4
const DEBUG_CASTLE_FILL = 0x5ad8ff
const DEBUG_CASTLE_STROKE = 0x5ad8ff

function drawDebugCastleTiles(scene, castle, depth) {
  for (const tile of getOccupiedTiles(castle)) {
    const centerX = tile.x * TILE_SIZE + TILE_SIZE / 2
    const centerY = tile.y * TILE_SIZE + TILE_SIZE / 2

    const debugTile = scene.add.rectangle(
      centerX,
      centerY,
      TILE_SIZE,
      TILE_SIZE,
      DEBUG_CASTLE_FILL,
      0.12,
    )

    debugTile.setStrokeStyle(2, DEBUG_CASTLE_STROKE, 1)
    debugTile.setDepth(depth - 0.01)
  }
}

export function syncBuildings(scene, worldStore) {
  const castles = worldStore.buildings.filter((building) => building.type === 'castle')

  return castles.map((castle) => {
    const footprint = castle.footprint ?? { w: 1, h: 1 }
    const centerX = (castle.gridPos.x + footprint.w / 2) * TILE_SIZE
    const groundY = (castle.gridPos.y + footprint.h) * TILE_SIZE
    const depth = groundY + CASTLE_DEPTH_EPSILON

    const sprite = scene.add.image(centerX, groundY, 'castle_blue')
    sprite.setOrigin(0.5, 1)
    sprite.setDisplaySize(CASTLE_DISPLAY_WIDTH, CASTLE_DISPLAY_HEIGHT)
    sprite.setDepth(depth)

    if (DEBUG_MODE) {
      drawDebugCastleTiles(scene, castle, depth)
    }

    return sprite
  })
}

function ensureConstructionSiteCaches(scene) {
  if (!scene.constructionSiteSprites) {
    scene.constructionSiteSprites = new Map()
  }
}

export function syncConstructionSites(scene, worldStore) {
  ensureConstructionSiteCaches(scene)

  const constructionSites = worldStore.constructionSites ?? []
  const activeSiteIds = new Set()

  for (const site of constructionSites) {
    if (!site?.id || !site?.gridPos) {
      continue
    }

    activeSiteIds.add(site.id)

    const footprint = site.footprint ?? { w: 2, h: 2 }
    const spriteX = site.gridPos.x * TILE_SIZE
    const spriteY = site.gridPos.y * TILE_SIZE - TILE_SIZE
    const depth = (site.gridPos.y + footprint.h) * TILE_SIZE + CASTLE_DEPTH_EPSILON
    const displayWidth = footprint.w * TILE_SIZE
    const displayHeight = (footprint.h + 1) * TILE_SIZE

    let sprite = scene.constructionSiteSprites.get(site.id)

    if (!sprite) {
      sprite = scene.add.image(spriteX, spriteY, 'house_blue_ghost')
      sprite.setOrigin(0, 0)
      sprite.setAlpha(CONSTRUCTION_SITE_ALPHA)
      sprite.setDepth(depth)
      scene.constructionSiteSprites.set(site.id, sprite)
    }

    sprite.setPosition(spriteX, spriteY)
    sprite.setDisplaySize(displayWidth, displayHeight)
    sprite.setAlpha(CONSTRUCTION_SITE_ALPHA)
    sprite.setDepth(depth)
  }

  for (const [siteId, sprite] of scene.constructionSiteSprites.entries()) {
    if (activeSiteIds.has(siteId)) {
      continue
    }

    sprite.destroy()
    scene.constructionSiteSprites.delete(siteId)
  }
}
