import { STARTUP_GRACE_PERIOD_TICKS } from '../config/constants.js'

export function isStartupGracePeriod(worldStore) {
  return (worldStore?.tick ?? 0) < STARTUP_GRACE_PERIOD_TICKS
}
