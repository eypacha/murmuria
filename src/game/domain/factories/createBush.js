import { BUSH_VARIANT_CONFIGS } from '../../config/resourceVariants.js'

function normalizeFacing(facing) {
  return facing === 'left' ? 'left' : 'right'
}

export function createBush(x = 0, y = 0, variant = 0, facing = 'right') {
  const variantIndex = Number.isInteger(variant) ? variant : 0
  const clampedIndex = Math.max(0, Math.min(BUSH_VARIANT_CONFIGS.length - 1, variantIndex))
  const variantConfig = BUSH_VARIANT_CONFIGS[clampedIndex] ?? BUSH_VARIANT_CONFIGS[0]

  return {
    id: `bush-${x}-${y}`,
    kind: 'decoration',
    type: 'bush',
    variant: clampedIndex,
    blocksMovement: false,
    facing: normalizeFacing(facing),
    gridPos: {
      x,
      y,
    },
    reservedBy: null,
    textureKey: variantConfig.key,
  }
}
