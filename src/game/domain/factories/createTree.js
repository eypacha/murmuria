import { TREE_WOOD_AMOUNT } from '../../config/constants.js'

export function createTree(x = 0, y = 0) {
  return {
    id: `tree-${x}-${y}`,
    kind: 'resource',
    type: 'tree',
    gridPos: {
      x,
      y,
    },
    amount: TREE_WOOD_AMOUNT,
    reservedBy: null,
  }
}
