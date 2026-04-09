<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { createWorld } from '../game/core/createWorld.js'
import { createPhaserGame } from '../game/phaser/PhaserGame.js'
import { useWorldStore } from '../stores/worldStore.js'

const worldStore = useWorldStore()
const containerId = 'phaser-world-container'
const phaserGame = ref(null)

function isWorldEmpty() {
  return worldStore.world.width === 0 || worldStore.world.tiles.length === 0
}

onMounted(async () => {
  if (isWorldEmpty()) {
    createWorld(worldStore)
  }

  await nextTick()
  phaserGame.value = createPhaserGame(containerId, worldStore)
})

onBeforeUnmount(() => {
  if (phaserGame.value) {
    phaserGame.value.destroy(true)
    phaserGame.value = null
  }
})
</script>

<template>
  <div class="absolute inset-0 flex items-center justify-center bg-black">
    <div
      :id="containerId"
      class="relative"
      style="width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16));"
    />
  </div>
</template>
