import { SHEEP_MEAT_AMOUNT } from '../../config/constants.js'

function normalizeFacing(facing) {
  return facing === 'left' ? 'left' : 'right'
}

function normalizeState(state) {
  if (state === 'moving' || state === 'eating') {
    return state
  }

  return 'idle'
}

export function createSheep(x = 0, y = 0, variant = 0, facing = 'right', state = 'idle') {
  const variantIndex = Number.isInteger(variant) ? variant : 0

  return {
    id: `sheep-${x}-${y}`,
    kind: 'resource',
    type: 'sheep',
    variant: variantIndex,
    facing: normalizeFacing(facing),
    state: normalizeState(state),
    gridPos: {
      x,
      y,
    },
    amount: SHEEP_MEAT_AMOUNT,
    reservedBy: null,
  }
}
