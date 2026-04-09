import { GRID_HEIGHT, GRID_WIDTH } from '../../config/constants.js'

const CASTLE_FOOTPRINT = {
  w: 5,
  h: 2,
}

export function createCastle(worldWidth = GRID_WIDTH, worldHeight = GRID_HEIGHT) {
  const x = Math.max(0, Math.floor((worldWidth - CASTLE_FOOTPRINT.w) / 2))
  const y = Math.max(0, Math.floor((worldHeight - CASTLE_FOOTPRINT.h) / 2))

  return {
    id: 'castle',
    kind: 'building',
    type: 'castle',
    gridPos: {
      x,
      y,
    },
    footprint: { ...CASTLE_FOOTPRINT },
  }
}
