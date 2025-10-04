import type { VercelRequest, VercelResponse } from '@vercel/node'
import { InferenceClient, type InferenceProviderOrPolicy } from '@huggingface/inference'
import { tify } from 'chinese-conv/dist'

const TOKEN = process.env.HUGGINGFACE_API_KEY
  || process.env.HUGGINGFACEHUB_API_TOKEN
  || process.env.HF_API_TOKEN
  || process.env.HF_TOKEN

const TEXT_MODEL = process.env.HF_TEXT_MODEL_ID || 'zai-org/GLM-4.6'
const TEXT_PROVIDER = ((process.env.HF_TEXT_PROVIDER ?? 'novita') as InferenceProviderOrPolicy)
const TRANSLATE_MODEL = process.env.HF_TRANSLATE_MODEL_ID || 'Helsinki-NLP/opus-mt-en-zh'
const MAX_PROMPT_LENGTH = Number(process.env.HF_PROMPT_LIMIT || 320)
const DEFAULT_LOCALE = 'zh'
const DEFAULT_FALLBACK = 'You have what it takes to grow through this moment.'
const SYSTEM_PROMPT = process.env.HF_TEXT_SYSTEM_PROMPT ||
  'You are a compassionate bilingual coach called FlowNest. Keep replies to one or two sentences, warm, concrete, and action-oriented. Avoid questions and emoji.'

let cachedClient: InferenceClient | null = null

function getClient(): InferenceClient {
  if (!cachedClient) {
    cachedClient = new InferenceClient(ensureToken())
  }
  return cachedClient
}

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

type VercelRequestWithRawBody = VercelRequest & { rawBody?: Buffer }

function parseBody(req: VercelRequest): NormalizedBody {
  const incoming = req as VercelRequestWithRawBody
  const body = ((): any => {
    if (incoming.body) return incoming.body
    if (!incoming.rawBody) return {}
    try {
      return JSON.parse(incoming.rawBody.toString('utf8'))
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

function extractMessageContent(message: any): { text: string; raw: string } {
  if (!message) return { text: '', raw: '' }
  const { content } = message
  if (typeof content === 'string') {
    return { text: content.trim(), raw: content }
  }
  if (Array.isArray(content)) {
    const strings = content.map((part) => {
      if (typeof part === 'string') return part
      if (typeof part?.text === 'string') return part.text
      if (typeof part?.value === 'string') return part.value
      return ''
    })
    const joined = strings.join(' ').trim()
    return {
      text: joined,
      raw: JSON.stringify(content)
    }
  }
  if (content && typeof content === 'object') {
    const text = typeof content.text === 'string'
      ? content.text
      : typeof content.value === 'string'
        ? content.value
        : ''
    return {
      text: text.trim(),
      raw: JSON.stringify(content)
    }
  }
  if (typeof message === 'string') {
    return { text: message.trim(), raw: message }
  }
  return { text: '', raw: String(message) }
}

async function generateAffirmation(prompt: string): Promise<{ english: string; raw: string }> {
  const client = getClient()
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Context: ${prompt}\nReminder: respond in English first, 1-2 sentences, compassionate, no questions, no emoji.`
    }
  ]

  const completion = await client.chatCompletion({
    provider: TEXT_PROVIDER,
    model: TEXT_MODEL,
    messages,
    temperature: 0.8,
    top_p: 0.92,
    max_tokens: 180
  })

  const choice = completion?.choices?.find((c: any) => c.finish_reason === 'stop') ?? completion?.choices?.[0]
  const { text, raw } = extractMessageContent(choice?.message)
  const trimmed = text.trim()

  return {
    english: trimmed || DEFAULT_FALLBACK,
    raw: raw || (choice ? JSON.stringify(choice) : '')
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
  const base = output || text
  try {
    return tify(base)
  } catch {
    return base
  }
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
