// Debug / feature flags
export const DEBUG_MODE = false
export const FOAM_ANIMATION = true

// World / grid
export const GRID_WIDTH = 64
export const GRID_HEIGHT = 64
export const TILE_SIZE = 64

// Render depths
export const DEPTH_GRID = 0
export const DEPTH_BUILDINGS = 10
export const DEPTH_RESOURCES = 20
export const DEPTH_UNITS = 30
export const UNIT_RENDER_OFFSET_Y = 48

// Camera
export const CAMERA_DEFAULT_ZOOM = 1
export const CAMERA_MIN_ZOOM = 0.75
export const CAMERA_MAX_ZOOM = 1
export const CAMERA_PAN_SPEED = 650
export const CAMERA_WHEEL_ZOOM_RATE = 0.0012

// Simulation
export const SIMULATION_TICK_MS = 500
export const STARTUP_GRACE_PERIOD_TICKS = 20

// Units
export const UNIT_BASE_MOVE_SPEED = 64
export const UNIT_INITIAL_HEALTH = 20

// Villager behavior
export const VILLAGER_ARRIVAL_THRESHOLD = 4
export const VILLAGER_PREPARE_TO_TREE_MS = 1000
export const VILLAGER_PREPARE_TO_GATHER_MS = 1000
export const VILLAGER_GATHER_DURATION_MS = 5000
export const VILLAGER_PREPARE_TO_RETURN_MS = 1000
export const VILLAGER_WOOD_HARVEST_CHUNK = 10
export const VILLAGER_GOLD_HARVEST_CHUNK = 10
export const VILLAGER_MEAT_HARVEST_CHUNK = 10
export const VILLAGER_CARRY_CAPACITY_WOOD = 5
export const VILLAGER_CARRY_CAPACITY_GOLD = 5
export const VILLAGER_CARRY_CAPACITY_MEAT = 5
export const VILLAGER_INTENT_BUBBLE_DURATION_TICKS = 2
export const VILLAGER_INTENT_ACTION_DELAY_TICKS = 2
export const REPRODUCTION_SEARCH_RADIUS_TILES = 8
export const REPRODUCTION_DURATION_TICKS = 6
export const REPRODUCTION_COOLDOWN_TICKS = 12
export const CHILD_GROW_DURATION_TICKS = 40
export const REPRODUCTION_FOOD_THRESHOLD_PER_UNIT = 6

// Economy / construction
export const HOUSE_WOOD_COST = 20
export const HOUSE_BUILD_TIME_MS = 20000
export const TREE_WOOD_AMOUNT = 50
export const SHEEP_MEAT_AMOUNT = 10
export const INITIAL_GOLD_COUNT = 128

// Initial world population
export const INITIAL_VILLAGERS = 2
export const INITIAL_TREE_COUNT = 192
export const INITIAL_SHEEP_COUNT = 64
export const INITIAL_ROCK_COUNT = 64
export const INITIAL_BUSH_COUNT = 64

// Initial resources
export const INITIAL_WOOD = 10
export const INITIAL_GOLD = 10
export const INITIAL_MEAT = 10
