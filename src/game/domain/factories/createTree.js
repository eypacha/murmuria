export function createTree(x = 0, y = 0) {
  return {
    id: `tree-${x}-${y}`,
    kind: 'resource',
    type: 'tree',
    gridPos: {
      x,
      y,
    },
    amount: 100,
    reservedBy: null,
  }
}
