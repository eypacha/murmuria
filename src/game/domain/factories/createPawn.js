import {
  PAWN_CARRY_CAPACITY_GOLD,
  PAWN_CARRY_CAPACITY_WOOD,
  TILE_SIZE,
} from '../../config/constants.js'

function getWorldPosition(x, y) {
  return {
    x: x * TILE_SIZE + TILE_SIZE / 2,
    y: y * TILE_SIZE + TILE_SIZE / 2,
  }
}

export function createPawn(x = 0, y = 0, facing = 'right') {
  return {
    id: `pawn-${x}-${y}`,
    kind: 'unit',
    role: 'pawn',
    state: 'idle',
    facing,
    gridPos: {
      x,
      y,
    },
    pos: getWorldPosition(x, y),
    targetId: null,
    target: null,
    workTargetType: null,
    interactionFacing: null,
    stateUntilTick: null,
    nextState: null,
    path: [],
    pathGoalKey: null,
    inventory: {
      wood: 0,
      gold: 0,
    },
    equipment: {
      tool: null,
    },
    stats: {
      moveSpeed: 64,
      carryCapacityWood: PAWN_CARRY_CAPACITY_WOOD,
      carryCapacityGold: PAWN_CARRY_CAPACITY_GOLD,
    },
  }
}
