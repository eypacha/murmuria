import { runSimulationAnalysis, runSimulationBatch } from '../src/game/simulation/runSimulationAnalysis.js'

function parseArgs(argv) {
  const options = {
    seed: 1,
    terrainVariant: 'flat_lakes',
    maxTicks: 5000,
    runs: 1,
    stopOnCollapse: true,
    seedStride: 1,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--seed' && index + 1 < argv.length) {
      options.seed = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--terrain' && index + 1 < argv.length) {
      options.terrainVariant = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--max-ticks' && index + 1 < argv.length) {
      options.maxTicks = Number(argv[index + 1])
      index += 1
      continue
    }

    if (arg === '--runs' && index + 1 < argv.length) {
      options.runs = Number(argv[index + 1])
      index += 1
      continue
    }

    if (arg === '--seed-stride' && index + 1 < argv.length) {
      options.seedStride = Number(argv[index + 1])
      index += 1
      continue
    }

    if (arg === '--no-stop-on-collapse') {
      options.stopOnCollapse = false
      continue
    }
  }

  return options
}

const options = parseArgs(process.argv)
const isBatch = Number.isFinite(options.runs) && options.runs > 1

const result = isBatch
  ? runSimulationBatch(options)
  : runSimulationAnalysis(options)

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
