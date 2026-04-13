<script setup>
import { computed } from 'vue'
import HudPanel from './components/HudPanel.vue'
import GameCanvas from './components/GameCanvas.vue'
import KingdomStatsBar from './components/KingdomStatsBar.vue'
import SeedBadge from './components/SeedBadge.vue'
import { useWorldStore } from './stores/worldStore.js'

const worldStore = useWorldStore()
const speedSteps = [1, 2, 4, 8]

const speedLabel = computed(() => `x${worldStore.simulationSpeed}`)

function cycleSimulationSpeed() {
  const currentIndex = speedSteps.indexOf(worldStore.simulationSpeed)
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % speedSteps.length
  worldStore.simulationSpeed = speedSteps[nextIndex]
}
</script>

<template>
  <main class="fixed inset-0 overflow-hidden bg-black text-slate-100">
    <GameCanvas class="absolute inset-0" />
    <HudPanel class="absolute left-4 top-4 z-20" />
    <button
      type="button"
      class="absolute right-4 top-4 z-30 rounded-full border border-white/10 bg-slate-950/75 px-4 py-2 text-sm font-semibold text-slate-100 shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-white/10 hover:text-white"
      @click="cycleSimulationSpeed"
    >
      {{ speedLabel }}
    </button>
    <SeedBadge class="absolute right-4 top-4 z-20" />
    <KingdomStatsBar />
  </main>
</template>
