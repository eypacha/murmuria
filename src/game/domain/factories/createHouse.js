import { GRID_HEIGHT, GRID_WIDTH } from '../../config/constants.js'
import { HOUSE_FOOTPRINT, buildingDefs } from '../../config/buildingDefs.js'

export function createHouse(
  x = Math.max(0, Math.floor((GRID_WIDTH - HOUSE_FOOTPRINT.w) / 2)),
  y = Math.max(0, Math.floor((GRID_HEIGHT - HOUSE_FOOTPRINT.h) / 2)),
  variant = 0,
  capacity = 2,
) {
  return buildingDefs.house.onComplete({
    x,
    y,
    variant,
    capacity,
  })
}
