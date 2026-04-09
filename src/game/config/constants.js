export const DEBUG_MODE = false

export const GRID_WIDTH = 40
export const GRID_HEIGHT = 40
export const TILE_SIZE = 64
export const DEPTH_GRID = 0
export const DEPTH_BUILDINGS = 10
export const DEPTH_RESOURCES = 20
export const DEPTH_UNITS = 30
export const DEPTH_HUD = 1000
export const UNIT_RENDER_OFFSET_Y = 48
export const HUD_MARGIN = 16
export const HUD_GAP = 8
export const HUD_ICON_SIZE = 28
export const HUD_TEXT_SIZE = 20
export const SIMULATION_TICK_MS = 500
export const PAWN_ARRIVAL_THRESHOLD = 4
export const PAWN_PREPARE_TO_TREE_MS = 1000
export const PAWN_PREPARE_TO_GATHER_MS = 1000
export const PAWN_GATHER_DURATION_MS = 5000
export const PAWN_PREPARE_TO_RETURN_MS = 1000
export const PAWN_WOOD_HARVEST_CHUNK = 10
export const PAWN_CARRY_CAPACITY_WOOD = 10
export const TREE_WOOD_AMOUNT = 50
export const TREE_VARIANT_CONFIGS = [
  {
    key: 'tree_0',
    path: '/assets/terrain/resources/wood/trees/tree-0.png',
    stumpKey: 'stump_0',
    stumpPath: '/assets/terrain/resources/wood/trees/stump-0.png',
    frameHeight: 256,
    displayHeight: 256,
  },
  {
    key: 'tree_1',
    path: '/assets/terrain/resources/wood/trees/tree-1.png',
    stumpKey: 'stump_1',
    stumpPath: '/assets/terrain/resources/wood/trees/stump-1.png',
    frameHeight: 256,
    displayHeight: 256,
  },
  {
    key: 'tree_2',
    path: '/assets/terrain/resources/wood/trees/tree-2.png',
    stumpKey: 'stump_2',
    stumpPath: '/assets/terrain/resources/wood/trees/stump-2.png',
    frameHeight: 192,
    displayHeight: 192,
  },
  {
    key: 'tree_3',
    path: '/assets/terrain/resources/wood/trees/tree-3.png',
    stumpKey: 'stump_3',
    stumpPath: '/assets/terrain/resources/wood/trees/stump-3.png',
    frameHeight: 192,
    displayHeight: 192,
  },
]
export const TREE_VARIANT_KEYS = TREE_VARIANT_CONFIGS.map((config) => config.key)
export const TREE_STUMP_KEYS = TREE_VARIANT_CONFIGS.map((config) => config.stumpKey)
export const TREE_FRAME_COUNT = 8
export const INITIAL_PAWNS = 2
export const INITIAL_TREE_COUNT = 20
