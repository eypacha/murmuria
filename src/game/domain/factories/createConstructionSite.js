import { HOUSE_BUILD_TIME_MS, HOUSE_WOOD_COST } from '../../config/constants.js'
import { HOUSE_FOOTPRINT } from './createHouse.js'

let constructionSiteIdCounter = 0

export function createConstructionSite({
  x = 0,
  y = 0,
  buildingType = 'house',
  capacity = 2,
  proposerVillagerId = null,
  createdTick = 0,
  variant = 0,
  revealed = false,
  woodRequired = HOUSE_WOOD_COST,
  woodDelivered = 0,
  woodReserved = 0,
  buildRequiredMs = HOUSE_BUILD_TIME_MS,
  buildProgressMs = 0,
  buildStartedTick = null,
  builderVillagerIds = [],
} = {}) {
  constructionSiteIdCounter += 1

  return {
    id: `construction-site-${constructionSiteIdCounter}`,
    kind: 'construction',
    type: 'constructionSite',
    buildingType,
    x,
    y,
    gridPos: {
      x,
      y,
    },
    footprint: { ...HOUSE_FOOTPRINT },
    capacity,
    variant,
    proposerVillagerId,
    createdTick,
    revealed,
    woodRequired,
    woodDelivered,
    woodReserved,
    buildRequiredMs,
    buildProgressMs,
    buildStartedTick,
    builderVillagerIds: [...builderVillagerIds],
  }
}
