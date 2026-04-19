import { GRID_HEIGHT, GRID_WIDTH } from '../../config/constants.js'

export const CASTLE_FOOTPRINT = {
  w: 5,
  h: 2,
}

export function createCastle(
  x = Math.max(0, Math.floor((GRID_WIDTH - CASTLE_FOOTPRINT.w) / 2)),
  y = Math.max(0, Math.floor((GRID_HEIGHT - CASTLE_FOOTPRINT.h) / 2)),
) {
  const castleHealth = 100

  return {
    id: 'castle',
    kind: 'building',
    type: 'castle',
    gridPos: {
      x,
      y,
    },
    footprint: { ...CASTLE_FOOTPRINT },
    status: {
      health: castleHealth,
      maxHealth: castleHealth,
    },
  }
}
