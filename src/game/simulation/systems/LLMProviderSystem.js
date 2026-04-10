import * as webllm from '@mlc-ai/web-llm'

const SYSTEM_PROMPT = `You are an interpreter of a king's speech in a simulated kingdom.

Your job is to convert the speech into a JSON intent that influences the kingdom.

Return ONLY valid JSON.

Structure:

{
  "style": "order | speech | incentive | warning",
  "resourceDelta": {
    "wood": number,
    "gold": number,
    "meat": number
  },
  "socialDelta": {
    "morale": number,
    "fear": number
  },
  "reactions": {
    "emojis": [string, string, string],
    "barks": [string, string, string]
  }
}

Rules:

resourceDelta values must be between -2 and 2
socialDelta values must be between -2 and 2  
If a resource is not mentioned or implied in the speech, its delta must be 0

Reaction rules:

emojis → short emotional reactions villagers might show in speech bubbles  
barks → very short villager reactions (max 4 words each)

Interpret the tone of the speech:

order → strict command  
speech → motivational speech  
incentive → optimistic encouragement  
warning → threat or fear

Guidelines:

- emojis should match the emotional tone of the speech
- barks should sound like villagers reacting to what the king said
- keep barks short and natural

Do not include explanations.

Return only the JSON object.`

let engine = null
let enginePromise = null

const MODEL_ALIASES = {
  'gemma-2b': 'gemma-2-2b-it-q4f16_1-MLC',
  'gemma-2b-1k': 'gemma-2-2b-it-q4f16_1-MLC-1k',
}

function resolveModelId(model) {
  return MODEL_ALIASES[model] ?? model
}

function extractJsonObject(text) {
  const trimmed = String(text ?? '').trim()

  if (!trimmed) {
    return null
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const startIndex = trimmed.indexOf('{')
  const endIndex = trimmed.lastIndexOf('}')

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null
  }

  return trimmed.slice(startIndex, endIndex + 1)
}

async function getEngine(model) {
  const resolvedModel = resolveModelId(model)

  if (engine) {
    return engine
  }

  if (!enginePromise) {
    enginePromise = webllm.CreateMLCEngine(resolvedModel).then((createdEngine) => {
      engine = createdEngine
      return createdEngine
    })
  }

  return enginePromise
}

function parseIntent(text) {
  try {
    const jsonText = extractJsonObject(text) ?? text
    const json = JSON.parse(jsonText)

    const reactions = json.reactions ?? {}

    return {
      style: json.style ?? 'speech',
      resourceDelta: json.resourceDelta ?? {},
      socialDelta: json.socialDelta ?? {},
      reactions: {
        emojis: Array.isArray(reactions.emojis) ? reactions.emojis : [],
        barks: Array.isArray(reactions.barks) ? reactions.barks : [],
      },
    }
  } catch {
    return {
      style: 'speech',
      resourceDelta: {},
      socialDelta: {},
      reactions: {
        emojis: [],
        barks: [],
      },
    }
  }
}

async function generateWebLLMIntent(text, worldStore) {
  const model = worldStore.llm?.model ?? 'gemma-2b'
  const engineInstance = await getEngine(model)

  const response = await engineInstance.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
  })

  const output = response.choices[0].message.content

  return parseIntent(output)
}

export async function generateSpeechIntentDebug(text, worldStore) {
  const provider = worldStore.llm?.provider ?? 'webllm'

  if (provider === 'webllm') {
    const model = worldStore.llm?.model ?? 'gemma-2b'
    const engineInstance = await getEngine(model)

    const response = await engineInstance.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    })

    const raw = response.choices[0].message.content ?? ''

    return {
      raw,
      intent: parseIntent(raw),
    }
  }

  throw new Error('LLM provider not supported yet')
}

export async function generateSpeechIntent(text, worldStore) {
  const provider = worldStore.llm?.provider ?? 'webllm'

  if (provider === 'webllm') {
    return generateWebLLMIntent(text, worldStore)
  }

  throw new Error('LLM provider not supported yet')
}
