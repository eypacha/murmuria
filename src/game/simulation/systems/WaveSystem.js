import {
  BASE_WAVE_SIZE,
  WAVE_INTERVAL_TICKS,
  WAVE_START_DELAY_TICKS,
  WAVE_SCALE_EVERY,
} from '../../config/constants.js'
import { spawnEnemyWave } from '../../core/spawnEnemyWave.js'

function ensureWaves(worldStore) {
  if (!worldStore.waves) {
    worldStore.waves = {
      current: 0,
      active: false,
      nextWaveTick: WAVE_START_DELAY_TICKS,
    }
  }

  return worldStore.waves
}

function getWaveEnemyCount(currentWave) {
  return BASE_WAVE_SIZE + Math.floor((currentWave - 1) / WAVE_SCALE_EVERY)
}

export class WaveSystem {
  static update(worldStore) {
    const currentTick = Number.isFinite(Number(worldStore?.tick)) ? Number(worldStore.tick) : 0
    const waves = ensureWaves(worldStore)

    if (!waves.active && currentTick >= waves.nextWaveTick) {
      this.startWave(worldStore, waves, currentTick)
      return
    }

    if (!waves.active) {
      return
    }

    this.resolveActiveWave(worldStore, waves, currentTick)
  }

  static startWave(worldStore, waves, currentTick) {
    waves.current += 1
    const enemyCount = getWaveEnemyCount(waves.current)
    const enemies = spawnEnemyWave(worldStore, enemyCount)

    if (enemies.length === 0) {
      waves.current = Math.max(0, waves.current - 1)
      waves.active = false
      waves.nextWaveTick = currentTick + WAVE_INTERVAL_TICKS
      return
    }

    waves.active = true
  }

  static resolveActiveWave(worldStore, waves, currentTick) {
    const enemies = worldStore.enemies ?? []

    if (enemies.length === 0) {
      waves.active = false
      waves.nextWaveTick = currentTick + WAVE_INTERVAL_TICKS
      return
    }
  }
}
