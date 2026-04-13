<script setup>
import GameCanvas from './components/GameCanvas.vue'
import KingdomStatsBar from './components/KingdomStatsBar.vue'
import SeedBadge from './components/SeedBadge.vue'
</script>

<template>
  <main class="fixed inset-0 overflow-hidden bg-black text-slate-100">
    <GameCanvas class="absolute inset-0" />
    <SeedBadge class="absolute right-4 top-4 z-20" />
    <KingdomStatsBar />
  </main>
</template>
