export const HOUSE_VARIANT_CONFIGS = [
  {
    key: 'house_blue_0',
    path: '/assets/buildings/blue/house-0.png',
  },
  {
    key: 'house_blue_1',
    path: '/assets/buildings/blue/house-1.png',
  },
  {
    key: 'house_blue_2',
    path: '/assets/buildings/blue/house-2.png',
  },
]

export const HOUSE_DISPLAY_WIDTH = 128
export const HOUSE_DISPLAY_HEIGHT = 192

const CASTLE_FIRE_FRAME_WIDTH = 64
const CASTLE_FIRE_FRAME_HEIGHT = 64
export const CASTLE_FIRE_DISPLAY_SIZE = 64

const CASTLE_FIRE_SPRITE_SPECS = [
  ['castle_fire_0', '/assets/particles/fire-0.png', 8],
  ['castle_fire_1', '/assets/particles/fire-1.png', 10],
  ['castle_fire_2', '/assets/particles/fire-2.png', 12],
]

export const CASTLE_FIRE_VARIANTS = CASTLE_FIRE_SPRITE_SPECS.map(([key, path, frameCount]) => ({
  key,
  path,
  frameWidth: CASTLE_FIRE_FRAME_WIDTH,
  frameHeight: CASTLE_FIRE_FRAME_HEIGHT,
  frameCount,
  displaySize: CASTLE_FIRE_DISPLAY_SIZE,
}))

export const CASTLE_FIRE_POSITIONS = [
  {
    id: 'castle_fire_roof_left',
    assetKey: 'castle_fire_0',
    offsetX: 0,
    offsetY: -190,
    delayMs: 0,
  },
  {
    id: 'castle_fire_roof_mid_left',
    assetKey: 'castle_fire_1',
    offsetX: -92,
    offsetY: -176,
    delayMs: 120,
  },
  {
    id: 'castle_fire_roof_mid_right',
    assetKey: 'castle_fire_2',
    offsetX: 92,
    offsetY: -176,
    delayMs: 240,
  },
  {
    id: 'castle_fire_left_tower',
    assetKey: 'castle_fire_0',
    offsetX: -126,
    offsetY: -210,
    delayMs: 360,
  },
  {
    id: 'castle_fire_right_tower',
    assetKey: 'castle_fire_1',
    offsetX: 126,
    offsetY: -210,
    delayMs: 480,
  },
  {
    id: 'castle_fire_lower_left_0',
    assetKey: 'castle_fire_2',
    offsetX: -108,
    offsetY: -132,
    delayMs: 600,
  },
  {
    id: 'castle_fire_lower_left_1',
    assetKey: 'castle_fire_0',
    offsetX: -74,
    offsetY: -118,
    delayMs: 720,
  },
  {
    id: 'castle_fire_lower_center_0',
    assetKey: 'castle_fire_1',
    offsetX: 0,
    offsetY: -124,
    delayMs: 840,
  },
  {
    id: 'castle_fire_lower_center_1',
    assetKey: 'castle_fire_2',
    offsetX: 38,
    offsetY: -110,
    delayMs: 960,
  },
  {
    id: 'castle_fire_lower_right_0',
    assetKey: 'castle_fire_0',
    offsetX: 104,
    offsetY: -130,
    delayMs: 1080,
  },
  {
    id: 'castle_fire_lower_right_1',
    assetKey: 'castle_fire_1',
    offsetX: 132,
    offsetY: -116,
    delayMs: 1200,
  },
  {
    id: 'castle_fire_base_left',
    assetKey: 'castle_fire_2',
    offsetX: -96,
    offsetY: -86,
    delayMs: 1320,
  },
  {
    id: 'castle_fire_base_center',
    assetKey: 'castle_fire_0',
    offsetX: 8,
    offsetY: -78,
    delayMs: 1440,
  },
  {
    id: 'castle_fire_base_right',
    assetKey: 'castle_fire_1',
    offsetX: 96,
    offsetY: -84,
    delayMs: 1560,
  },
]
