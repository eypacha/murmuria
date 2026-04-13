import { GRID_HEIGHT, GRID_WIDTH } from '../../config/constants.js'

export const HOUSE_FOOTPRINT = {
  w: 2,
  h: 2,
}

let houseIdCounter = 0

export function createHouse(
  x = Math.max(0, Math.floor((GRID_WIDTH - HOUSE_FOOTPRINT.w) / 2)),
  y = Math.max(0, Math.floor((GRID_HEIGHT - HOUSE_FOOTPRINT.h) / 2)),
  variant = 0,
  capacity = 2,
) {
  houseIdCounter += 1

  return {
    id: `house-${houseIdCounter}`,
    kind: 'building',
    type: 'house',
    x,
    y,
    gridPos: {
      x,
      y,
    },
    footprint: { ...HOUSE_FOOTPRINT },
    capacity,
    variant,
    reproductionTaskId: null,
  }
}
