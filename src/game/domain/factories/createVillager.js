import {
  TILE_SIZE,
} from '../../config/constants.js'

function getWorldPosition(x, y) {
  return {
    x: x * TILE_SIZE + TILE_SIZE / 2,
    y: y * TILE_SIZE + TILE_SIZE / 2,
  }
}

export function createVillager(x = 0, y = 0, facing = 'right') {
  return {
    id: `villager-${x}-${y}`,
    kind: 'unit',
    role: 'villager',
    state: 'idle',
    idleSince: null,
    idleAction: null,
    talkPartner: null,
    talkTargetTile: null,
    bubble: null,
    status: {
      health: 100,
    },
    facing,
    gridPos: {
      x,
      y,
    },
    pos: getWorldPosition(x, y),
    targetId: null,
    target: null,
    intent: null,
    decisionLockUntilTick: 0,
    lastDecision: null,
    workTargetType: null,
    constructionDelivery: null,
    constructionBuild: null,
    interactionFacing: null,
    stateUntilTick: null,
    nextState: null,
    path: [],
    pathGoalKey: null,
    inventory: {
      wood: 0,
      gold: 0,
      meat: 0,
    },
    equipment: {
      tool: null,
    },
  }
}
