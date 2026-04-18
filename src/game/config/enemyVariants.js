export const ENEMY_TEST_GROUP_TYPES = ['knight']

export const ENEMY_TYPE_CONFIGS = [
  {
    type: 'knight',
    idleKey: 'enemy-knight-idle',
    idlePath: '/assets/units/red/knight/knight-attack-idle.png',
    idleFrameCount: 8,
    runKey: 'enemy-knight-run',
    runPath: '/assets/units/red/knight/knight-attack-run.png',
    runFrameCount: 6,
    frameWidth: 192,
    frameHeight: 192,
    displayWidth: 192,
    displayHeight: 192,
    maxHp: 30,
    speed: 1,
  },
]

const ENEMY_TYPE_CONFIG_MAP = new Map(ENEMY_TYPE_CONFIGS.map((config) => [config.type, config]))

export function getEnemyTypeConfig(type) {
  return ENEMY_TYPE_CONFIG_MAP.get(type) ?? ENEMY_TYPE_CONFIGS[0]
}
