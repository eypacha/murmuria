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
  }
}
