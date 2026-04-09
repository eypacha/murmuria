const TREE_VARIANT_INDICES = [0, 1, 2, 3]
const TREE_FRAME_HEIGHTS = [256, 256, 192, 192]
const GOLD_VARIANT_INDICES = [0, 1, 2, 3, 4, 5]
const GOLD_AMOUNTS = [25, 25, 50, 50, 75, 75]
const GOLD_SIZES = [1, 1, 2, 2, 3, 3]
const GOLD_DISPLAY_SIZE = 128

export const TREE_VARIANT_CONFIGS = TREE_VARIANT_INDICES.map((index) => ({
  key: `tree_${index}`,
  path: `/assets/terrain/resources/wood/trees/tree-${index}.png`,
  stumpKey: `stump_${index}`,
  stumpPath: `/assets/terrain/resources/wood/trees/stump-${index}.png`,
  frameHeight: TREE_FRAME_HEIGHTS[index],
  displayHeight: TREE_FRAME_HEIGHTS[index],
}))

export const TREE_VARIANT_KEYS = TREE_VARIANT_CONFIGS.map((config) => config.key)
export const TREE_STUMP_KEYS = TREE_VARIANT_CONFIGS.map((config) => config.stumpKey)
export const TREE_FRAME_COUNT = 8

export const GOLD_VARIANT_CONFIGS = GOLD_VARIANT_INDICES.map((index) => ({
  key: `gold_${index}`,
  path: `/assets/terrain/resources/gold/stones/gold-stone-${index}.png`,
  frameHeight: 128,
  displayWidth: GOLD_DISPLAY_SIZE,
  displayHeight: GOLD_DISPLAY_SIZE,
  amount: GOLD_AMOUNTS[index],
  size: GOLD_SIZES[index],
}))

export const GOLD_VARIANT_KEYS = GOLD_VARIANT_CONFIGS.map((config) => config.key)
export const GOLD_FRAME_COUNT = 6
