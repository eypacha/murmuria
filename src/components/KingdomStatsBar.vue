<script setup>
import { computed } from 'vue'
import { useWorldStore } from '../stores/worldStore.js'

const worldStore = useWorldStore()

const kingdomStats = computed(() => {
  const needs = worldStore.kingdom?.needs ?? {}

  return {
    needs: {
      wood: Number(needs.wood ?? 0),
      gold: Number(needs.gold ?? 0),
      food: Number(needs.food ?? 0),
    },
    hunger: Number(worldStore.kingdom?.hunger ?? 0) * 100,
  }
})

function formatNeeds(group) {
  return `Necesidades madera ${group.wood.toFixed(2)} oro ${group.gold.toFixed(2)} comida ${group.food.toFixed(2)}`
}
</script>

<template>
  <div
    class="pointer-events-none fixed left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/65 px-4 py-2 text-[11px] text-slate-200 shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-md"
  >
    <div class="flex items-center gap-3 whitespace-nowrap">
      <span class="uppercase tracking-[0.18em] text-slate-400">Kingdom</span>
      <span>{{ formatNeeds(kingdomStats.needs) }}</span>
      <span class="text-slate-500">•</span>
      <span>Hambre {{ kingdomStats.hunger.toFixed(2) }}%</span>
    </div>
  </div>
</template>
