<script setup>
import HudPanel from './components/HudPanel.vue'
import GameCanvas from './components/GameCanvas.vue'
</script>

<template>
  <main class="fixed inset-0 overflow-hidden bg-black text-slate-100">
    <GameCanvas class="absolute inset-0" />
    <HudPanel class="absolute left-4 top-4 z-20" />
  </main>
</template>
