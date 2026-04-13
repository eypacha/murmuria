import { SIMULATION_TICK_MS } from '../config/constants.js'
import { KingdomSystem } from './systems/KingdomSystem.js'
import { VillagerHealthSystem } from './systems/VillagerHealthSystem.js'
import { HousingNeedSystem } from './systems/HousingNeedSystem.js'
import { HousingProposalSystem } from './systems/HousingProposalSystem.js'
import { GrowthSystem } from './systems/GrowthSystem.js'
import { ConstructionSiteSystem } from './systems/ConstructionSiteSystem.js'
import { ConstructionWoodDeliverySystem } from './systems/ConstructionWoodDeliverySystem.js'
import {
  ConstructionBuildAssignmentSystem,
  ConstructionBuildProgressSystem,
} from './systems/ConstructionBuildSystem.js'
import { DecisionSystem } from './systems/DecisionSystem.js'
import { BubbleSystem } from './systems/BubbleSystem.js'
import { MovementSystem } from './systems/MovementSystem.js'
import { ReproductionSystem } from './systems/ReproductionSystem.js'
import { UnitStateSystem } from './systems/UnitStateSystem.js'
import { VillagerWorkSystem } from './systems/VillagerWorkSystem.js'
import { SheepStateSystem } from './systems/SheepStateSystem.js'
import { SheepMovementSystem } from './systems/SheepMovementSystem.js'
import { buildSimulationCache } from './buildSimulationCache.js'

export class SimulationEngine {
  constructor(worldStore) {
    this.worldStore = worldStore
    this.interval = null
    this.speedMultiplier = 1
  }

  start() {
    this.stop()

    this.interval = setInterval(() => {
      this.tick()
    }, this.getTickIntervalMs())
  }

  stop() {
    if (this.interval !== null) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  setSpeedMultiplier(multiplier) {
    const nextMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1

    if (this.speedMultiplier === nextMultiplier) {
      return
    }

    this.speedMultiplier = nextMultiplier

    if (this.interval !== null) {
      this.start()
    }
  }

  getTickIntervalMs() {
    return SIMULATION_TICK_MS / this.speedMultiplier
  }

  tick() {
    if (!this.worldStore) {
      return
    }

    VillagerHealthSystem.update(this.worldStore)
    this.worldStore.simulationCache = buildSimulationCache(this.worldStore)

    KingdomSystem.update(this.worldStore)
    HousingNeedSystem.update(this.worldStore)
    GrowthSystem.update(this.worldStore)
    HousingProposalSystem.update(this.worldStore)
    ConstructionWoodDeliverySystem.update(this.worldStore)
    ConstructionSiteSystem.update(this.worldStore)
    ConstructionBuildAssignmentSystem.update(this.worldStore)
    DecisionSystem.update(this.worldStore)
    DecisionSystem.resolveIntents(this.worldStore)
    BubbleSystem.update(this.worldStore)
    UnitStateSystem.update(this.worldStore)
    MovementSystem.update(this.worldStore)
    ReproductionSystem.update(this.worldStore)
    ConstructionBuildProgressSystem.update(this.worldStore)
    VillagerWorkSystem.update(this.worldStore)
    SheepStateSystem.update(this.worldStore)
    SheepMovementSystem.update(this.worldStore)
    this.worldStore.tick++
  }
}
