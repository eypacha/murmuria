import { DEBUG_MODE, TILE_SIZE } from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'

const CASTLE_DISPLAY_WIDTH = 320
const CASTLE_DISPLAY_HEIGHT = 256
const CASTLE_DEPTH_EPSILON = 0.1
const DEBUG_CASTLE_HEALTH_LABEL_FONT_SIZE = '14px'
const DEBUG_CASTLE_HEALTH_LABEL_OFFSET_Y = 4
const DEBUG_CASTLE_FILL = 0x5ad8ff
const DEBUG_CASTLE_STROKE = 0x5ad8ff

function ensureBuildingCache(scene) {
  if (!scene.buildingSprites) {
    scene.buildingSprites = new Map()
  }

  if (!scene.buildingDebugOverlays) {
    scene.buildingDebugOverlays = new Map()
  }

  if (!scene.buildingHealthLabels) {
    scene.buildingHealthLabels = new Map()
  }
}

function getCastleEntryTiles(castle) {
  const footprint = castle.footprint ?? { w: 1, h: 1 }
  const centerX = castle.gridPos.x + Math.floor(footprint.w / 2)

  return [
    { x: centerX, y: castle.gridPos.y - 1 },
    { x: centerX, y: castle.gridPos.y + footprint.h },
  ]
}

function clearCastleDebugOverlay(scene, castleId) {
  const overlay = scene.buildingDebugOverlays.get(castleId)

  if (!overlay) {
    return
  }

  for (const object of overlay) {
    object.destroy()
  }

  scene.buildingDebugOverlays.delete(castleId)
}

function clearCastleHealthLabel(scene, castleId) {
  const label = scene.buildingHealthLabels.get(castleId)

  if (!label) {
    return
  }

  label.destroy()
  scene.buildingHealthLabels.delete(castleId)
}

function getCastleWorldPosition(castle) {
  const footprint = castle.footprint ?? { w: 1, h: 1 }

  return {
    x: (castle.gridPos.x + footprint.w / 2) * TILE_SIZE,
    y: (castle.gridPos.y + footprint.h) * TILE_SIZE,
  }
}

function getCastleTextureKey(castle) {
  return Number(castle?.status?.health ?? 0) > 0 ? 'castle_blue' : 'castle_destroyed'
}

function getCastleHealth(castle) {
  return Number(castle?.status?.health ?? 0)
}

function updateCastleSprite(scene, castle) {
  const existingSprite = scene.buildingSprites.get(castle.id)
  const { x, y } = getCastleWorldPosition(castle)
  const depth = y + CASTLE_DEPTH_EPSILON
  const textureKey = getCastleTextureKey(castle)

  if (existingSprite) {
    existingSprite.setTexture(textureKey)
    existingSprite.setPosition(x, y)
    existingSprite.setDisplaySize(CASTLE_DISPLAY_WIDTH, CASTLE_DISPLAY_HEIGHT)
    existingSprite.setDepth(depth)
    return existingSprite
  }

  const sprite = scene.add.image(x, y, textureKey)
  sprite.setOrigin(0.5, 1)
  sprite.setDisplaySize(CASTLE_DISPLAY_WIDTH, CASTLE_DISPLAY_HEIGHT)
  sprite.setDepth(depth)

  scene.buildingSprites.set(castle.id, sprite)

  return sprite
}

function updateCastleHealthLabel(scene, castle) {
  clearCastleHealthLabel(scene, castle.id)

  const { x, y } = getCastleWorldPosition(castle)
  const labelY = y - CASTLE_DISPLAY_HEIGHT / 2 - DEBUG_CASTLE_HEALTH_LABEL_OFFSET_Y
  const label = scene.add.text(x, labelY, `HP: ${getCastleHealth(castle)}`, {
    fontFamily: 'monospace',
    fontSize: DEBUG_CASTLE_HEALTH_LABEL_FONT_SIZE,
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: { left: 4, right: 4, top: 2, bottom: 2 },
    align: 'center',
  })

  label.setOrigin(0.5, 1)
  label.setScrollFactor(1, 1)
  label.setDepth(y + CASTLE_DEPTH_EPSILON + 60)
  scene.buildingHealthLabels.set(castle.id, label)
}

function updateCastleDebugOverlay(scene, castle) {
  clearCastleDebugOverlay(scene, castle.id)

  const depth = getCastleWorldPosition(castle).y + CASTLE_DEPTH_EPSILON
  const overlay = []

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
    overlay.push(debugTile)
  }

  for (const tile of getCastleEntryTiles(castle)) {
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
    overlay.push(debugTile)
  }

  scene.buildingDebugOverlays.set(castle.id, overlay)
}

export function syncBuildings(scene, worldStore) {
  ensureBuildingCache(scene)

  const castles = (worldStore.buildings ?? []).filter((building) => building.type === 'castle')
  const activeCastleIds = new Set()

  for (const castle of castles) {
    activeCastleIds.add(castle.id)
    updateCastleSprite(scene, castle)

    if (DEBUG_MODE) {
      updateCastleDebugOverlay(scene, castle)
      updateCastleHealthLabel(scene, castle)
    }
  }

  for (const [castleId, sprite] of scene.buildingSprites.entries()) {
    if (activeCastleIds.has(castleId)) {
      continue
    }

    sprite.destroy()
    scene.buildingSprites.delete(castleId)
    clearCastleDebugOverlay(scene, castleId)
    clearCastleHealthLabel(scene, castleId)
  }

  return Array.from(scene.buildingSprites.values())
}
