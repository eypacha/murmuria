export function isTraversableTile(tile) {
  if (!tile) {
    return false
  }

  if (tile.terrain !== 'grass' || !tile.walkable) {
    return false
  }

  if (tile.cliff) {
    return false
  }

  if (tile.elevation >= 2 && !tile.ramp) {
    return false
  }

  return true
}

export function isTraversableWorldTile(worldStore, tile) {
  if (!tile) {
    return false
  }

  const worldTile = worldStore.world?.tiles?.[tile.y]?.[tile.x] ?? null

  return isTraversableTile(worldTile)
}
