const TREE_VARIANT_INDICES = [0, 1, 2, 3]
const TREE_FRAME_HEIGHTS = [256, 256, 192, 192]
const GOLD_VARIANT_INDICES = [0, 1, 2, 3, 4, 5]
const GOLD_AMOUNTS = [25, 25, 50, 50, 75, 75]
const GOLD_SIZES = [1, 1, 2, 2, 3, 3]
const GOLD_DISPLAY_SIZE = 128
const SHEEP_DISPLAY_SIZE = 128
const SHEEP_IDLE_FRAME_COUNT = 6
const SHEEP_MOVE_FRAME_COUNT = 4
const SHEEP_GRASS_FRAME_COUNT = 12
const ROCK_VARIANT_INDICES = [0, 1, 2, 3]
const ROCK_DISPLAY_SIZE = 64

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

export const SHEEP_VARIANT_CONFIGS = [
  {
    key: 'sheep',
    idleKey: 'sheep_idle',
    idlePath: '/assets/terrain/resources/meat/sheep/sheep-idle.png',
    idleFrameCount: SHEEP_IDLE_FRAME_COUNT,
    moveKey: 'sheep_move',
    movePath: '/assets/terrain/resources/meat/sheep/sheep-move.png',
    moveFrameCount: SHEEP_MOVE_FRAME_COUNT,
    grassKey: 'sheep_grass',
    grassPath: '/assets/terrain/resources/meat/sheep/sheep-grass.png',
    grassFrameCount: SHEEP_GRASS_FRAME_COUNT,
    frameHeight: SHEEP_DISPLAY_SIZE,
    displayWidth: SHEEP_DISPLAY_SIZE,
    displayHeight: SHEEP_DISPLAY_SIZE,
  },
]

export const ROCK_VARIANT_CONFIGS = ROCK_VARIANT_INDICES.map((index) => ({
  key: `rock_${index}`,
  path: `/assets/terrain/decorations/rocks/rock-${index}.png`,
  displayWidth: ROCK_DISPLAY_SIZE,
  displayHeight: ROCK_DISPLAY_SIZE,
}))
