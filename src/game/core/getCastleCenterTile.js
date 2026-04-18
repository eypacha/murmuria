export function getCastleCenterTile(castle) {
  if (!castle?.gridPos) {
    return null
  }

  const footprint = castle.footprint ?? { w: 1, h: 1 }

  return {
    x: castle.gridPos.x + footprint.w / 2,
    y: castle.gridPos.y + footprint.h / 2,
  }
}
