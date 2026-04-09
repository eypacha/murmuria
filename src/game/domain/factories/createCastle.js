import { GRID_HEIGHT, GRID_WIDTH } from '../../config/constants.js'

export function createCastle(
  x = Math.floor(GRID_WIDTH / 2),
  y = Math.floor(GRID_HEIGHT / 2),
) {
  return {
    id: `castle-${x}-${y}`,
    kind: 'building',
    type: 'castle',
    gridPos: {
      x,
      y,
    },
  }
}
