import { SIMULATION_TICK_MS } from '../config/constants.js'
import { createKingdomState } from '../core/createKingdomState.js'
import { seededRandom } from '../core/seededRandom.js'
import { createWorld } from '../core/createWorld.js'
import { SimulationEngine } from './SimulationEngine.js'

function ticksToMinutes(ticks) {
  return Number(((Number(ticks ?? 0) * SIMULATION_TICK_MS) / 60000).toFixed(2))
}

function createHeadlessWorldStore(seed, terrainVariant) {
  return {
    seed,
    tick: 0,
    terrainVariant,
    simulationSpeed: 1,
    kingdom: createKingdomState(),
    world: {
      width: 0,
      height: 0,
      tiles: [],
    },
    units: [],
    resources: [],
    buildings: [],
    houses: [],
    constructionSites: [],
    ongoingReproductions: [],
    pendingSkullEffects: [],
    decorations: [],
  }
}

function withSeededMathRandom(seed, callback) {
  const originalRandom = Math.random
  const rng = seededRandom(seed)

  Math.random = rng.next

  try {
    return callback(rng)
  } finally {
    Math.random = originalRandom
  }
}

function getPopulation(worldStore) {
  return (worldStore.units ?? []).filter((unit) => unit?.kind === 'unit').length
}

function getHunger(worldStore) {
  return Number(worldStore?.kingdom?.hunger ?? 0)
}

function toSafeNumber(value) {
  return Number.isFinite(value) ? Number(value) : 0
}

function createEmptyMetrics({ seed, terrainVariant, maxTicks }) {
  return {
    seed,
    terrainVariant,
    maxTicks,
    ticksSimulated: 0,
    simulationMinutes: 0,
    initialPopulation: 0,
    finalPopulation: 0,
    peakPopulation: 0,
    peakPopulationTick: null,
    peakPopulationMinutes: null,
    firstCollapseTick: null,
    firstCollapseMinutes: null,
    firstHungerTick: null,
    firstHungerMinutes: null,
    firstStarvationDeathTick: null,
    firstStarvationDeathMinutes: null,
    starvationDeaths: 0,
    births: 0,
    finalHunger: 0,
    finalResources: {
      wood: 0,
      gold: 0,
      meat: 0,
    },
    collapsed: false,
    starvationObserved: false,
  }
}

function finalizeMetrics(report, worldStore, previousPopulation) {
  report.finalPopulation = getPopulation(worldStore)
  report.finalHunger = getHunger(worldStore)
  report.finalResources = {
    wood: Math.round(toSafeNumber(worldStore.kingdom?.resources?.wood)),
    gold: Math.round(toSafeNumber(worldStore.kingdom?.resources?.gold)),
    meat: Math.round(toSafeNumber(worldStore.kingdom?.resources?.meat)),
  }
  report.collapsed = report.finalPopulation === 0 && report.initialPopulation > 0

  if (report.firstCollapseTick == null && report.collapsed) {
    report.firstCollapseTick = worldStore.tick ?? null
  }

  report.simulationMinutes = ticksToMinutes(report.ticksSimulated)
  report.peakPopulationMinutes =
    report.peakPopulationTick == null ? null : ticksToMinutes(report.peakPopulationTick)
  report.firstCollapseMinutes =
    report.firstCollapseTick == null ? null : ticksToMinutes(report.firstCollapseTick)
  report.firstHungerMinutes =
    report.firstHungerTick == null ? null : ticksToMinutes(report.firstHungerTick)
  report.firstStarvationDeathMinutes =
    report.firstStarvationDeathTick == null ? null : ticksToMinutes(report.firstStarvationDeathTick)

  if (report.finalPopulation > report.peakPopulation) {
    report.peakPopulation = report.finalPopulation
    report.peakPopulationTick = worldStore.tick ?? null
    report.peakPopulationMinutes =
      report.peakPopulationTick == null ? null : ticksToMinutes(report.peakPopulationTick)
  }

  if (previousPopulation != null && report.finalPopulation > previousPopulation) {
    report.births += report.finalPopulation - previousPopulation
  }
}

export function runSimulationAnalysis({
  seed = 1,
  terrainVariant = 'flat_lakes',
  maxTicks = 5000,
  stopOnCollapse = true,
} = {}) {
  return withSeededMathRandom(seed, () => {
    const worldStore = createHeadlessWorldStore(seed, terrainVariant)
    createWorld(worldStore)

    const engine = new SimulationEngine(worldStore)
    const report = createEmptyMetrics({ seed, terrainVariant, maxTicks })
    let previousPopulation = getPopulation(worldStore)

    report.initialPopulation = previousPopulation
    report.peakPopulation = previousPopulation
    report.peakPopulationTick = worldStore.tick ?? 0
    report.finalPopulation = previousPopulation
    report.finalHunger = getHunger(worldStore)

    for (let step = 0; step < maxTicks; step += 1) {
      const tickBeforeStep = worldStore.tick ?? 0
      const populationBefore = getPopulation(worldStore)
      const hungerBefore = getHunger(worldStore)

      engine.tick()

      const populationAfter = getPopulation(worldStore)
      const hungerAfter = getHunger(worldStore)

      report.ticksSimulated = step + 1
      report.simulationMinutes = ticksToMinutes(report.ticksSimulated)
      report.finalPopulation = populationAfter
      report.finalHunger = hungerAfter
      report.finalResources = {
        wood: Math.round(toSafeNumber(worldStore.kingdom?.resources?.wood)),
        gold: Math.round(toSafeNumber(worldStore.kingdom?.resources?.gold)),
        meat: Math.round(toSafeNumber(worldStore.kingdom?.resources?.meat)),
      }

      if (populationAfter > report.peakPopulation) {
        report.peakPopulation = populationAfter
        report.peakPopulationTick = tickBeforeStep
        report.peakPopulationMinutes = ticksToMinutes(tickBeforeStep)
      }

      const populationDelta = populationAfter - populationBefore

      if (populationDelta > 0) {
        report.births += populationDelta
      } else if (populationDelta < 0 && hungerBefore >= 1) {
        report.starvationObserved = true
        report.starvationDeaths += Math.abs(populationDelta)

        if (report.firstStarvationDeathTick == null) {
          report.firstStarvationDeathTick = tickBeforeStep
          report.firstStarvationDeathMinutes = ticksToMinutes(tickBeforeStep)
        }
      }

      if (report.firstHungerTick == null && hungerAfter >= 1) {
        report.firstHungerTick = tickBeforeStep
        report.firstHungerMinutes = ticksToMinutes(tickBeforeStep)
      }

      if (populationAfter === 0 && populationBefore > 0) {
        report.firstCollapseTick = tickBeforeStep
        report.firstCollapseMinutes = ticksToMinutes(tickBeforeStep)
        report.collapsed = true

        if (stopOnCollapse) {
          break
        }
      }

      previousPopulation = populationAfter
    }

    finalizeMetrics(report, worldStore, previousPopulation)

    return report
  })
}

function summarizeNumbers(values) {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
    }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length

  return {
    min,
    max,
    avg: Number(avg.toFixed(2)),
  }
}

export function runSimulationBatch({
  seed = 1,
  runs = 10,
  terrainVariant = 'flat_lakes',
  maxTicks = 5000,
  stopOnCollapse = true,
  seedStride = 1,
} = {}) {
  const results = []

  for (let index = 0; index < runs; index += 1) {
    const runSeed = `${seed}:${index * seedStride}`
    results.push(
      runSimulationAnalysis({
        seed: runSeed,
        terrainVariant,
        maxTicks,
        stopOnCollapse,
      }),
    )
  }

  const peakPopulations = results.map((result) => result.peakPopulation)
  const peakPopulationMinutes = results
    .map((result) => result.peakPopulationMinutes)
    .filter((value) => value != null)
  const collapseTicks = results
    .map((result) => result.firstCollapseTick)
    .filter((tick) => tick != null)
  const collapseMinutes = results
    .map((result) => result.firstCollapseMinutes)
    .filter((value) => value != null)
  const starvationTicks = results
    .map((result) => result.firstStarvationDeathTick)
    .filter((tick) => tick != null)
  const starvationMinutes = results
    .map((result) => result.firstStarvationDeathMinutes)
    .filter((value) => value != null)

  const collapsedRuns = results.filter((result) => result.collapsed).length

  return {
    seed,
    terrainVariant,
    maxTicks,
    runs,
    seedStride,
    summary: {
      collapsedRuns,
      collapseRate: runs > 0 ? Number((collapsedRuns / runs).toFixed(3)) : 0,
      peakPopulation: summarizeNumbers(peakPopulations),
      peakPopulationMinutes: summarizeNumbers(peakPopulationMinutes),
      collapseTick: summarizeNumbers(collapseTicks),
      collapseMinutes: summarizeNumbers(collapseMinutes),
      starvationTick: summarizeNumbers(starvationTicks),
      starvationMinutes: summarizeNumbers(starvationMinutes),
      averageFinalPopulation: Number(
        (results.reduce((sum, result) => sum + result.finalPopulation, 0) / Math.max(1, runs)).toFixed(2),
      ),
      averageFinalHunger: Number(
        (results.reduce((sum, result) => sum + result.finalHunger, 0) / Math.max(1, runs)).toFixed(3),
      ),
      averageSimulationMinutes: Number(
        (results.reduce((sum, result) => sum + result.simulationMinutes, 0) / Math.max(1, runs)).toFixed(2),
      ),
    },
    results,
  }
}
