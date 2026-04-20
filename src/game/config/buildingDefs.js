import { GRID_HEIGHT, GRID_WIDTH, HOUSE_BUILD_TIME_MS, HOUSE_WOOD_COST } from './constants.js'
import {
  HOUSE_DISPLAY_HEIGHT,
  HOUSE_DISPLAY_WIDTH,
  HOUSE_VARIANT_CONFIGS,
} from './buildingVariants.js'

export const HOUSE_FOOTPRINT = {
  w: 2,
  h: 2,
}

let houseIdCounter = 0

function createHouseEntity(
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

export const buildingDefs = {
  house: {
    buildingType: 'house',
    woodCost: HOUSE_WOOD_COST,
    buildTimeMs: HOUSE_BUILD_TIME_MS,
    footprint: { ...HOUSE_FOOTPRINT },
    capacity: 2,
    storeKey: 'houses',
    constructionVariantConfigs: HOUSE_VARIANT_CONFIGS,
    constructionDisplayWidth: HOUSE_DISPLAY_WIDTH,
    constructionDisplayHeight: HOUSE_DISPLAY_HEIGHT,
    onComplete({ x, y, variant = 0, capacity = 2 } = {}) {
      return createHouseEntity(x, y, variant, capacity)
    },
  },
}

export function getBuildingDef(buildingType) {
  return buildingDefs[buildingType] ?? null
}
