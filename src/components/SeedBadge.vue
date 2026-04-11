<script setup>
import { computed } from 'vue'
import { useWorldStore } from '../stores/worldStore.js'
import { DEBUG_MODE } from '../game/config/constants.js'

const worldStore = useWorldStore()
const seedText = computed(() => String(worldStore.seed ?? ''))
</script>

<template>
  <div v-if="DEBUG_MODE" class="pointer-events-auto">
    <span class="text-xs bg-white p-2 font-semibold uppercase tracking-[0.22em] text-black">
      Seed {{ seedText }}
    </span>
  </div>
</template>
