import * as webllm from '@mlc-ai/web-llm'

const SYSTEM_PROMPT = `You are an interpreter of a king's speech in a simulated kingdom.

Your job is to convert the speech into a JSON intent that influences the kingdom.

Return ONLY valid JSON.

Structure:

{
  "style": "order | speech | incentive | warning",
  "resourceFactor": {
    "wood": number,
    "gold": number,
    "meat": number
  },
  "socialDelta": {
    "morale": number,
    "fear": number
  }
}

Rules:

resourceFactor values must be between 0.6 and 1.5
socialDelta values must be between -2 and 2

Interpret the tone of the speech:

order → strict command
speech → motivational speech
incentive → optimistic encouragement
warning → threat or fear

Do not include explanations.

Return only the JSON object.`

let engine = null
let enginePromise = null

async function getEngine(model) {
  if (engine) {
    return engine
  }

  if (!enginePromise) {
    enginePromise = webllm.CreateMLCEngine(model).then((createdEngine) => {
      engine = createdEngine
      return createdEngine
    })
  }

  return enginePromise
}

function parseIntent(text) {
  try {
    const json = JSON.parse(text)

    return {
      style: json.style ?? 'speech',
      resourceFactor: json.resourceFactor ?? {},
      socialDelta: json.socialDelta ?? {},
    }
  } catch {
    return {
      style: 'speech',
      resourceFactor: {},
      socialDelta: {},
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

export async function generateSpeechIntent(text, worldStore) {
  const provider = worldStore.llm?.provider ?? 'webllm'

  if (provider === 'webllm') {
    return generateWebLLMIntent(text, worldStore)
  }

  throw new Error('LLM provider not supported yet')
}
