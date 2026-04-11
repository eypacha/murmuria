import { SHEEP_MEAT_AMOUNT } from '../../config/constants.js'

const SHEEP_STATES = new Set(['idle', 'moving', 'eating'])

function normalizeFacing(facing) {
  return facing === 'left' ? 'left' : 'right'
}

function normalizeState(state) {
  if (SHEEP_STATES.has(state)) {
    return state
  }

  return 'idle'
}

export function createSheep(x = 0, y = 0, facing = 'right', state = 'idle') {
  return {
    id: `sheep-${x}-${y}`,
    kind: 'resource',
    type: 'sheep',
    facing: normalizeFacing(facing),
    state: normalizeState(state),
    stateUntilTick: null,
    stateCycle: 0,
    gridPos: {
      x,
      y,
    },
    amount: SHEEP_MEAT_AMOUNT,
    reservedBy: null,
  }
}
