export function createPawn(x = 0, y = 0) {
  return {
    id: `pawn-${x}-${y}`,
    kind: 'unit',
    role: 'pawn',
    state: 'idle',
    gridPos: {
      x,
      y,
    },
    pos: {
      x,
      y,
    },
    targetId: null,
    path: [],
    inventory: {
      wood: 0,
    },
    stats: {
      moveSpeed: 2,
      carryCapacityWood: 10,
    },
  }
}
