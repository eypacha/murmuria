function tileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function getFootprintPosition(entity) {
  if (!entity?.gridPos) {
    return null
  }

  const x = Number(entity.gridPos.x)
  const y = Number(entity.gridPos.y)

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  return { x, y }
}

function getFootprintSize(entity) {
  const footprint = entity?.footprint ?? { w: 1, h: 1 }
  const w = Number(footprint.w)
  const h = Number(footprint.h)

  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    return null
  }

  return {
    w: Math.max(1, Math.floor(w)),
    h: Math.max(1, Math.floor(h)),
  }
}

function shouldReserveNoBuildZone(entity) {
  return (
    entity?.gridPos &&
    (entity.kind === 'building' || entity.kind === 'construction')
  )
}

export function getNoBuildZoneTiles(entity, padding = 1) {
  if (!shouldReserveNoBuildZone(entity)) {
    return []
  }

  const position = getFootprintPosition(entity)
  const size = getFootprintSize(entity)

  if (!position || !size) {
    return []
  }

  const zonePadding = Math.max(0, Math.floor(Number(padding) || 0))

  if (zonePadding <= 0) {
    return []
  }

  const tiles = []

  for (let y = position.y - zonePadding; y < position.y + size.h + zonePadding; y += 1) {
    for (let x = position.x - zonePadding; x < position.x + size.w + zonePadding; x += 1) {
      const insideFootprint =
        x >= position.x &&
        x < position.x + size.w &&
        y >= position.y &&
        y < position.y + size.h

      if (insideFootprint) {
        continue
      }

      tiles.push({ x, y })
    }
  }

  return tiles
}

export function buildNoBuildZoneTileSet(entities = [], reservedKeys = new Set(), padding = 1) {
  const blockedKeys = new Set(reservedKeys)

  for (const entity of entities) {
    for (const tile of getNoBuildZoneTiles(entity, padding)) {
      blockedKeys.add(tileKey(tile))
    }
  }

  return blockedKeys
}
