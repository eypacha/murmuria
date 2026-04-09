import { SIMULATION_TICK_MS } from '../config/constants.js'
import { DecisionSystem } from './systems/DecisionSystem.js'
import { MovementSystem } from './systems/MovementSystem.js'

export class SimulationEngine {
  constructor(worldStore) {
    this.worldStore = worldStore
    this.interval = null
  }

  start() {
    this.stop()

    this.interval = setInterval(() => {
      this.tick()
    }, SIMULATION_TICK_MS)
  }

  stop() {
    if (this.interval !== null) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  tick() {
    if (!this.worldStore) {
      return
    }

    DecisionSystem.update(this.worldStore)
    MovementSystem.update(this.worldStore)
    this.worldStore.tick++
  }
}
