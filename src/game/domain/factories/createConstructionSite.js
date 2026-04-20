import { buildingDefs } from '../../config/buildingDefs.js'

let constructionSiteIdCounter = 0

export function createConstructionSite({
  x = 0,
  y = 0,
  buildingType = 'house',
  capacity = null,
  proposerVillagerId = null,
  createdTick = 0,
  variant = 0,
  revealed = false,
  woodRequired = null,
  woodDelivered = 0,
  woodReserved = 0,
  buildRequiredMs = null,
  buildProgressMs = 0,
  buildStartedTick = null,
  builderVillagerIds = [],
  builderSlots = [],
} = {}) {
  constructionSiteIdCounter += 1
  const buildingDef = buildingDefs[buildingType] ?? buildingDefs.house
  const footprint = buildingDef?.footprint ?? { w: 1, h: 1 }
  const nextCapacity = capacity ?? buildingDef?.capacity ?? 0

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
    footprint: { ...footprint },
    capacity: nextCapacity,
    variant,
    proposerVillagerId,
    createdTick,
    revealed,
    woodRequired: woodRequired ?? buildingDef?.woodCost ?? 0,
    woodDelivered,
    woodReserved,
    buildRequiredMs: buildRequiredMs ?? buildingDef?.buildTimeMs ?? 0,
    buildProgressMs,
    buildStartedTick,
    builderVillagerIds: [...builderVillagerIds],
    builderSlots: [...builderSlots],
  }
}
