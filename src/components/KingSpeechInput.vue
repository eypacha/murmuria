<script setup>
import { ref } from 'vue'
import { applyKingSpeechIntent } from '../game/simulation/systems/KingSpeechIntentSystem.js'
import { applyKingSpeechReactions } from '../game/simulation/systems/KingSpeechReactionSystem.js'
import { generateSpeechIntentDebug } from '../game/simulation/systems/LLMProviderSystem.js'
import { useWorldStore } from '../stores/worldStore.js'

const worldStore = useWorldStore()
const speech = ref('')
const isGenerating = ref(false)
const statusMessage = ref('')
const debugResponse = ref('No response yet')

function showDebugResponse(text) {
  debugResponse.value = text || '(empty response)'
}

async function handleSubmit() {
  const value = speech.value.trim()

  if (!value || isGenerating.value) {
    return
  }

  isGenerating.value = true
  statusMessage.value = 'Interpreting...'

  try {
    const { raw, intent } = await generateSpeechIntentDebug(value, worldStore)
    showDebugResponse(raw)
    applyKingSpeechIntent(intent, worldStore.kingdom)
    applyKingSpeechReactions(intent?.reactions, worldStore)
    speech.value = ''
    statusMessage.value = ''
  } catch (error) {
    showDebugResponse(error instanceof Error ? error.message : String(error))
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
  <div
    v-if="debugResponse"
    class="pointer-events-none fixed right-4 top-4 z-40 w-50 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-left text-[11px] text-slate-200 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
  >
    <div class="mb-1 uppercase tracking-[0.16em] text-slate-400">
      LLM debug
    </div>
    <pre class="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono leading-snug">{{ debugResponse }}</pre>
  </div>
</template>
