<script setup>
import { ref } from 'vue'
import { useWorldStore } from '../stores/worldStore.js'

const worldStore = useWorldStore()
const desireJson = ref(JSON.stringify(worldStore.kingdom.desires, null, 2))
const errorMessage = ref('')

function applyDesires() {
  errorMessage.value = ''

  try {
    const parsed = JSON.parse(desireJson.value)

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('JSON must be an object')
    }

    Object.assign(worldStore.kingdom.desires, parsed)
    desireJson.value = JSON.stringify(worldStore.kingdom.desires, null, 2)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Invalid JSON'
  }
}
</script>

<template>
  <section class="bg-black/85 p-4 text-slate-100">
    <textarea
      id="debug-panel-input"
      v-model="desireJson"
      class="mt-2 min-h-32 w-full border-0 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
      placeholder='{"gatherWood": 1, "gatherGold": 1, "gatherMeat": 1}'
    ></textarea>

    <p v-if="errorMessage" class="mt-2 text-sm text-red-400">
      {{ errorMessage }}
    </p>

    <button
      @click="applyDesires"
      class="mt-4 inline-flex items-center bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
      type="button"
    >
      Apply JSON
    </button>
  </section>
</template>
