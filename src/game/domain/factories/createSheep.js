import { SHEEP_MEAT_AMOUNT } from '../../config/constants.js'

function normalizeFacing(facing) {
  return facing === 'left' ? 'left' : 'right'
}

export function createSheep(x = 0, y = 0, variant = 0, facing = 'right') {
  const variantIndex = Number.isInteger(variant) ? variant : 0

  return {
    id: `sheep-${x}-${y}`,
    kind: 'resource',
    type: 'sheep',
    variant: variantIndex,
    facing: normalizeFacing(facing),
    gridPos: {
      x,
      y,
    },
    amount: SHEEP_MEAT_AMOUNT,
    state: 'idle',
    reservedBy: null,
  }
}
