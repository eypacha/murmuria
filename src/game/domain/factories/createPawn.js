import { TILE_SIZE } from '../../config/constants.js'

function getWorldPosition(x, y) {
  return {
    x: x * TILE_SIZE + TILE_SIZE / 2,
    y: y * TILE_SIZE + TILE_SIZE / 2,
  }
}

export function createPawn(x = 0, y = 0) {
  return {
    id: `pawn-${x}-${y}`,
    kind: 'unit',
    role: 'pawn',
    state: 'idle',
    facing: 'right',
    gridPos: {
      x,
      y,
    },
    pos: getWorldPosition(x, y),
    targetId: null,
    target: null,
    path: [],
    inventory: {
      wood: 0,
    },
    stats: {
      moveSpeed: 64,
      carryCapacityWood: 10,
    },
  }
}
