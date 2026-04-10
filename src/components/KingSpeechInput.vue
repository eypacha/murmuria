<script setup>
import { ref } from 'vue'
import { applyKingSpeechIntent } from '../game/simulation/systems/KingSpeechIntentSystem.js'
import { generateSpeechIntent } from '../game/simulation/systems/LLMProviderSystem.js'
import { useWorldStore } from '../stores/worldStore.js'

const worldStore = useWorldStore()
const speech = ref('')
const isGenerating = ref(false)
const statusMessage = ref('')

async function handleSubmit() {
  const value = speech.value.trim()

  if (!value || isGenerating.value) {
    return
  }

  isGenerating.value = true
  statusMessage.value = 'Interpreting...'

  try {
    const intent = await generateSpeechIntent(value, worldStore)
    applyKingSpeechIntent(intent, worldStore.kingdom)
    speech.value = ''
    statusMessage.value = ''
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : 'Failed to interpret speech'
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <form
    class="pointer-events-auto fixed bottom-4 left-1/2 z-30 flex w-[min(92vw,48rem)] -translate-x-1/2 items-center gap-2"
    @submit.prevent="handleSubmit"
  >
    <input
      v-model="speech"
      type="text"
      autocomplete="off"
      spellcheck="false"
      class="min-w-0 flex-1 rounded-full border-2 border-black bg-slate-950/65 px-5 py-3 text-sm text-slate-100 outline-none backdrop-blur-md placeholder:text-slate-400 focus:border-amber-300/70 focus:bg-slate-950/80"
      placeholder="Speak for the king..."
    />
    <button
      type="submit"
      :disabled="isGenerating"
      class="shrink-0 rounded-full bg-amber-300 border-2 border-black px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {{ isGenerating ? '...' : 'Submit' }}
    </button>
    <p
      class="absolute left-1/2 top-full mt-2 -translate-x-1/2 text-xs text-slate-300"
      :class="statusMessage ? 'opacity-100' : 'opacity-0'"
    >
      {{ statusMessage || ' ' }}
    </p>
  </form>
</template>
