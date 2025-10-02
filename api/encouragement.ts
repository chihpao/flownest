import type { VercelRequest, VercelResponse } from '@vercel/node'

const TOKEN = process.env.HUGGINGFACE_API_KEY
  || process.env.HUGGINGFACEHUB_API_TOKEN
  || process.env.HF_API_TOKEN
  || process.env.HF_TOKEN

const TEXT_MODEL = process.env.HF_TEXT_MODEL_ID || 'monsoon-nlp/gpt-nyc-affirmations'
const TRANSLATE_MODEL = process.env.HF_TRANSLATE_MODEL_ID || 'Helsinki-NLP/opus-mt-en-zh'
const MAX_PROMPT_LENGTH = Number(process.env.HF_PROMPT_LIMIT || 320)
const DEFAULT_LOCALE = 'zh'

interface NormalizedBody {
  prompt: string
  locale: string
}

function normalizeLocale(raw?: string | null): string {
  if (!raw) return DEFAULT_LOCALE
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return DEFAULT_LOCALE
  if (trimmed === 'auto') return DEFAULT_LOCALE
  if (trimmed.startsWith('zh')) return 'zh'
  if (trimmed.startsWith('en')) return 'en'
  return DEFAULT_LOCALE
}

function parseBody(req: VercelRequest): NormalizedBody {
  const body = ((): any => {
    if (req.body) return req.body
    if (!req.rawBody) return {}
    try {
      return JSON.parse(req.rawBody.toString('utf8'))
    } catch {
      return {}
    }
  })()

  let prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  if (prompt.length > MAX_PROMPT_LENGTH) {
    prompt = prompt.slice(0, MAX_PROMPT_LENGTH)
  }
  const locale = normalizeLocale(typeof body?.locale === 'string' ? body.locale : undefined)
  return { prompt, locale }
}

function ensureToken(): string {
  if (!TOKEN) {
    throw new Error('Missing Hugging Face API key (set HUGGINGFACE_API_KEY)')
  }
  return TOKEN
}

async function callHuggingFace(
  modelId: string,
  payload: Record<string, unknown>,
  expectBinary = false,
  timeoutMs = 25000
): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ensureToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...payload, options: { wait_for_model: true } }),
      signal: controller.signal
    })

    if (!response.ok) {
      let message = `Hugging Face request failed (${response.status})`
      try {
        const errorPayload = await response.json()
        if (errorPayload?.error) {
          message = `${message}: ${errorPayload.error}`
        }
      } catch {
        // ignore
      }
      const err = new Error(message)
      ;(err as any).status = response.status
      throw err
    }

    if (expectBinary) {
      return Buffer.from(await response.arrayBuffer())
    }

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

function stripSourcePrompt(prompt: string, generated: string): string {
  if (!generated) return ''
  if (!prompt) return generated.trim()
  if (generated.startsWith(prompt)) {
    return generated.slice(prompt.length).trim()
  }
  return generated.trim()
}

async function generateAffirmation(prompt: string): Promise<{ english: string; raw: string }> {
  const scaffold = `Act as a compassionate coach. Offer one to two sentences that are specific, actionable, and uplifting. Avoid questions and keep the tone warm. User request: ${prompt}\nCoach:`
  const payload = {
    inputs: scaffold,
    parameters: {
      max_new_tokens: 80,
      temperature: 0.8,
      top_p: 0.92,
      do_sample: true
    }
  }

  const data = await callHuggingFace(TEXT_MODEL, payload)
  const generatedText = Array.isArray(data) && data[0]?.generated_text
    ? String(data[0].generated_text)
    : typeof data?.generated_text === 'string'
      ? data.generated_text
      : ''
  const clean = stripSourcePrompt(scaffold, generatedText)
  return {
    english: clean || generatedText?.trim() || 'You have what it takes to grow through this moment.',
    raw: generatedText
  }
}

async function translateToChinese(text: string): Promise<string> {
  if (!text) return ''
  const data = await callHuggingFace(TRANSLATE_MODEL, {
    inputs: text,
    parameters: {
      max_length: 120
    }
  })
  const output = Array.isArray(data) && data[0]?.translation_text
    ? String(data[0].translation_text)
    : ''
  return output || text
}

function sendJson(res: VercelResponse, status: number, payload: Record<string, unknown>) {
  res.status(status)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.send(JSON.stringify(payload))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  let body: NormalizedBody
  try {
    body = parseBody(req)
  } catch (error: any) {
    sendJson(res, 400, { error: error?.message || 'Invalid request body' })
    return
  }

  if (!body.prompt) {
    sendJson(res, 400, { error: 'Prompt is required' })
    return
  }

  try {
    const started = Date.now()
    const { english, raw } = await generateAffirmation(body.prompt)
    let translated: string | undefined
    const locale = normalizeLocale(body.locale)
    if (locale === 'zh') {
      translated = await translateToChinese(english)
    }

    const durationMs = Date.now() - started

    sendJson(res, 200, {
      prompt: body.prompt,
      locale,
      englishText: english,
      translatedText: translated,
      model: TEXT_MODEL,
      translatorModel: translated ? TRANSLATE_MODEL : null,
      timings: { durationMs },
      raw
    })
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 500
    sendJson(res, status, { error: error?.message || 'Failed to generate encouragement' })
  }
}
