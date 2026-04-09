<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { createWorld } from '../game/core/createWorld.js'
import { createPhaserGame } from '../game/phaser/PhaserGame.js'
import { SimulationEngine } from '../game/simulation/SimulationEngine.js'
import { useWorldStore } from '../stores/worldStore.js'

const worldStore = useWorldStore()
const containerId = 'phaser-world-container'
const phaserGame = ref(null)
const simulationEngine = ref(null)

function isWorldEmpty() {
  return worldStore.world.width === 0 || worldStore.world.tiles.length === 0
}

onMounted(async () => {
  if (isWorldEmpty()) {
    createWorld(worldStore)
  }

  await nextTick()
  phaserGame.value = createPhaserGame(containerId, worldStore)
  simulationEngine.value = new SimulationEngine(worldStore)
  simulationEngine.value.start()
})

onBeforeUnmount(() => {
  if (simulationEngine.value) {
    simulationEngine.value.stop()
    simulationEngine.value = null
  }

  if (phaserGame.value) {
    phaserGame.value.destroy(true)
    phaserGame.value = null
  }
})
</script>

<template>
  <div class="absolute inset-0 overflow-hidden bg-black">
    <div :id="containerId" class="absolute inset-0" />
  </div>
</template>
