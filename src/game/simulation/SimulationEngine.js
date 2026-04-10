import { SIMULATION_TICK_MS } from '../config/constants.js'
import { KingdomSystem } from './systems/KingdomSystem.js'
import { DecisionSystem } from './systems/DecisionSystem.js'
import { ConstructionSystem } from './systems/ConstructionSystem.js'
import { BubbleSystem } from './systems/BubbleSystem.js'
import { MovementSystem } from './systems/MovementSystem.js'
import { PawnStateSystem } from './systems/PawnStateSystem.js'
import { PawnWorkSystem } from './systems/PawnWorkSystem.js'
import { SheepMovementSystem } from './systems/SheepMovementSystem.js'

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

    KingdomSystem.update(this.worldStore)
    ConstructionSystem.update(this.worldStore)
    DecisionSystem.update(this.worldStore)
    BubbleSystem.update(this.worldStore)
    PawnStateSystem.update(this.worldStore)
    MovementSystem.update(this.worldStore)
    PawnWorkSystem.update(this.worldStore)
    SheepMovementSystem.update(this.worldStore)
    this.worldStore.tick++
  }
}
