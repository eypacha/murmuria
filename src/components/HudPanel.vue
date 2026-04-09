<script setup>
import { computed } from 'vue'
import { useWorldStore } from '../stores/worldStore.js'

const worldStore = useWorldStore()

const resources = computed(() => [
  {
    key: 'wood',
    value: Math.round(worldStore.kingdom?.resources?.wood ?? 0),
    icon: '/assets/ui/elements/icons/wood.png',
  },
  {
    key: 'gold',
    value: Math.round(worldStore.kingdom?.resources?.gold ?? 0),
    icon: '/assets/ui/elements/icons/coin.png',
  },
  {
    key: 'meat',
    value: Math.round(worldStore.kingdom?.resources?.meat ?? 0),
    icon: '/assets/ui/elements/icons/meat.png',
  },
])
</script>

<template>
  <div class="pointer-events-none flex flex-col gap-2 text-slate-100">
    <div
      v-for="resource in resources"
      :key="resource.key"
      class="flex items-center gap-2"
    >
      <img
        :src="resource.icon"
        :alt="resource.key"
        class="h-8 w-8 shrink-0 object-contain"
      />
      <span class="min-w-8 font-mono text-2xl font-semibold tabular-nums text-slate-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {{ resource.value }}
      </span>
    </div>
  </div>
</template>
