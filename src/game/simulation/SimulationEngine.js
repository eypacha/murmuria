import { SIMULATION_TICK_MS } from '../config/constants.js'
import { KingdomSystem } from './systems/KingdomSystem.js'
import { HousingNeedSystem } from './systems/HousingNeedSystem.js'
import { HousingProposalSystem } from './systems/HousingProposalSystem.js'
import { VillagerDecisionSystem } from './systems/VillagerDecisionSystem.js'
import { BubbleSystem } from './systems/BubbleSystem.js'
import { MovementSystem } from './systems/MovementSystem.js'
import { UnitStateSystem } from './systems/UnitStateSystem.js'
import { VillagerWorkSystem } from './systems/VillagerWorkSystem.js'
import { SheepStateSystem } from './systems/SheepStateSystem.js'
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
    HousingNeedSystem.update(this.worldStore)
    HousingProposalSystem.update(this.worldStore)
    VillagerDecisionSystem.update(this.worldStore)
    BubbleSystem.update(this.worldStore)
    UnitStateSystem.update(this.worldStore)
    MovementSystem.update(this.worldStore)
    VillagerWorkSystem.update(this.worldStore)
    SheepStateSystem.update(this.worldStore)
    SheepMovementSystem.update(this.worldStore)
    this.worldStore.tick++
  }
}
