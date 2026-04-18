export const ENEMY_TEST_GROUP_TYPES = ['knight', 'archer', 'monk']

export const ENEMY_TYPE_CONFIGS = [
  {
    type: 'knight',
    idleKey: 'enemy-knight-idle',
    idlePath: '/assets/units/red/knight/knight-attack-idle.png',
    idleFrameCount: 8,
    runKey: 'enemy-knight-run',
    runPath: '/assets/units/red/knight/knight-attack-run.png',
    runFrameCount: 6,
    attackKey: 'enemy-knight-attack',
    attackPath: '/assets/units/red/knight/knight-attack-0.png',
    attackFrameCount: 4,
    frameWidth: 192,
    frameHeight: 192,
    displayWidth: 192,
    displayHeight: 192,
    maxHp: 30,
    speed: 1,
  },
  {
    type: 'archer',
    idleKey: 'enemy-archer-idle',
    idlePath: '/assets/units/red/archer/archer-idle.png',
    idleFrameCount: 6,
    runKey: 'enemy-archer-run',
    runPath: '/assets/units/red/archer/archer-run.png',
    runFrameCount: 4,
    frameWidth: 192,
    frameHeight: 192,
    displayWidth: 192,
    displayHeight: 192,
    maxHp: 20,
    speed: 1,
  },
  {
    type: 'monk',
    idleKey: 'enemy-monk-idle',
    idlePath: '/assets/units/red/monk/Idle.png',
    idleFrameCount: 6,
    runKey: 'enemy-monk-run',
    runPath: '/assets/units/red/monk/Run.png',
    runFrameCount: 4,
    frameWidth: 192,
    frameHeight: 192,
    displayWidth: 192,
    displayHeight: 192,
    maxHp: 22,
    speed: 1,
  },
]

const ENEMY_TYPE_CONFIG_MAP = new Map(ENEMY_TYPE_CONFIGS.map((config) => [config.type, config]))

export function getEnemyTypeConfig(type) {
  return ENEMY_TYPE_CONFIG_MAP.get(type) ?? ENEMY_TYPE_CONFIGS[0]
}
