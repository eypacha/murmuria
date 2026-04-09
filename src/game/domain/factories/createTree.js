import { TREE_WOOD_AMOUNT } from '../../config/constants.js'

function normalizeFacing(facing) {
  return facing === 'left' ? 'left' : 'right'
}

export function createTree(x = 0, y = 0, variant = 0, facing = 'right') {
  return {
    id: `tree-${x}-${y}`,
    kind: 'resource',
    type: 'tree',
    variant,
    facing: normalizeFacing(facing),
    gridPos: {
      x,
      y,
    },
    amount: TREE_WOOD_AMOUNT,
    reservedBy: null,
  }
}
