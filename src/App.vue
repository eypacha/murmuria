<script setup>
import GameCanvas from './components/GameCanvas.vue'
import SeedBadge from './components/SeedBadge.vue'
</script>

<template>
  <main class="fixed inset-0 overflow-hidden bg-black text-slate-100">
    <GameCanvas class="absolute inset-0" />
    <SeedBadge class="absolute right-4 bottom-4 z-20" />
  </main>
</template>
