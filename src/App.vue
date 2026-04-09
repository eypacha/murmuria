<script setup>
import DebugPanel from './components/DebugPanel.vue'
import GameCanvas from './components/GameCanvas.vue'
</script>

<template>
  <main class="relative h-screen w-screen overflow-hidden bg-black text-slate-100">
    <GameCanvas class="absolute inset-0" />
    <DebugPanel class="absolute right-4 top-4 z-20 w-[360px] max-w-[calc(100vw-2rem)]" />
  </main>
</template>
