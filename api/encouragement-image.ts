import type { VercelRequest, VercelResponse } from '@vercel/node'

const TOKEN = process.env.HUGGINGFACE_API_KEY
  || process.env.HUGGINGFACEHUB_API_TOKEN
  || process.env.HF_API_TOKEN
  || process.env.HF_TOKEN

const IMAGE_MODEL = process.env.HF_IMAGE_MODEL_ID || 'stabilityai/stable-diffusion-xl-base-1.0'
const MAX_PROMPT_LENGTH = Number(process.env.HF_IMAGE_PROMPT_LIMIT || 320)
const DEFAULT_WIDTH = Number(process.env.HF_IMAGE_WIDTH || 1024)
const DEFAULT_HEIGHT = Number(process.env.HF_IMAGE_HEIGHT || 1024)
const MIN_DIMENSION = Number(process.env.HF_IMAGE_MIN_DIMENSION || 512)
const MAX_DIMENSION = Number(process.env.HF_IMAGE_MAX_DIMENSION || 1536)
const NEGATIVE_FALLBACK = process.env.HF_IMAGE_NEGATIVE_PROMPT
  || 'blurry, watermark, text, logo, low quality, distorted, disfigured, nsfw'

interface SessionIntentSnapshot {
  id?: string
  name?: string
  description?: string
  affirmation?: string
}

interface SessionAmbientSnapshot {
  id?: string
  label?: string
  description?: string
}

interface SessionSummary {
  title: string
  minutesPlanned: number
  minutesActual: number
  finishedEarly?: boolean
  intent?: SessionIntentSnapshot | null
  ambient?: SessionAmbientSnapshot | null
}

interface ImageRequestBody {
  prompt: string
  negativePrompt?: string | null
  guidanceScale?: number
  steps?: number
  width?: number
  height?: number
  session?: SessionSummary | null
}

function clampDimension(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value ?? NaN)) return fallback
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, Math.round(numeric)))
}

function clampPrompt(value: string): string {
  if (!value) return ''
  if (value.length <= MAX_PROMPT_LENGTH) return value
  return value.slice(0, MAX_PROMPT_LENGTH)
}

type VercelRequestWithRawBody = VercelRequest & { rawBody?: Buffer }

function sanitizeText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback
  return value.replace(/\s+/g, ' ').trim() || fallback
}

function toPositiveMinutes(value: unknown): number | null {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return Math.max(1, Math.round(numeric))
}

function parseIntentSnapshot(raw: any): SessionIntentSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const name = sanitizeText(raw.name ?? raw.title ?? '')
  const description = sanitizeText(raw.description ?? '')
  const affirmation = sanitizeText(raw.affirmation ?? '')
  const id = typeof raw.id === 'string' ? raw.id.trim() : undefined
  if (!name && !description && !affirmation) return null
  return {
    id,
    name: name || undefined,
    description: description || undefined,
    affirmation: affirmation || undefined
  }
}

function parseAmbientSnapshot(raw: any): SessionAmbientSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const label = sanitizeText(raw.label ?? raw.name ?? '')
  const description = sanitizeText(raw.description ?? '')
  const id = typeof raw.id === 'string' ? raw.id.trim() : undefined
  if (!label && !description) return null
  return {
    id,
    label: label || undefined,
    description: description || undefined
  }
}

function parseSession(raw: any): SessionSummary | null {
  if (!raw || typeof raw !== 'object') return null

  const title = sanitizeText(raw.title, '專注任務')
  const minutesPlanned = toPositiveMinutes(raw.minutesPlanned)
  const minutesActual = toPositiveMinutes(raw.minutesActual) ?? minutesPlanned ?? null
  if (!minutesActual && !minutesPlanned) return null

  let finishedEarly: boolean | undefined
  if (typeof raw.finishedEarly === 'boolean') {
    finishedEarly = raw.finishedEarly
  } else if (minutesPlanned != null && minutesActual != null) {
    finishedEarly = minutesActual < minutesPlanned
  }

  return {
    title,
    minutesPlanned: minutesPlanned ?? minutesActual ?? 1,
    minutesActual: minutesActual ?? minutesPlanned ?? 1,
    finishedEarly,
    intent: parseIntentSnapshot(raw.intent),
    ambient: parseAmbientSnapshot(raw.ambient)
  }
}

function parseBody(req: VercelRequest): ImageRequestBody {
  const incoming = req as VercelRequestWithRawBody
  const raw = ((): any => {
    if (incoming.body) return incoming.body
    if (!incoming.rawBody) return {}
    try {
      return JSON.parse(incoming.rawBody.toString('utf8'))
    } catch {
      return {}
    }
  })()

  const prompt = clampPrompt(typeof raw?.prompt === 'string' ? raw.prompt.trim() : '')
  const negativePrompt = typeof raw?.negativePrompt === 'string' ? raw.negativePrompt.trim() : undefined
  const guidanceScale = Number(raw?.guidanceScale)
  const steps = Number(raw?.steps)
  const width = Number(raw?.width)
  const height = Number(raw?.height)
  const session = parseSession(raw?.session)

  return {
    prompt,
    negativePrompt,
    guidanceScale: Number.isFinite(guidanceScale) ? guidanceScale : undefined,
    steps: Number.isFinite(steps) ? steps : undefined,
    width: Number.isFinite(width) ? width : undefined,
    height: Number.isFinite(height) ? height : undefined,
    session
  }
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
  timeoutMs = 60000
): Promise<Buffer> {
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
      if (response.status === 403 || response.status === 404) {
        message = `${message}. Verify that your token can access ${modelId} (accept the model licence on Hugging Face).`
      }
      const err = new Error(message)
      ;(err as any).status = response.status
      throw err
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (!buffer.length) {
      throw new Error('Empty image response from Hugging Face')
    }
    return buffer
  } finally {
    clearTimeout(timeout)
  }
}

function buildImagePrompt(session: SessionSummary): { prompt: string; negativePrompt?: string } {
  const tone = session.finishedEarly === true
    ? 'gentle pause after focused work'
    : 'radiant sense of completion and flow'

  const descriptors: string[] = [
    `dreamy illustration celebrating "${session.title}"`,
    'soft cinematic lighting',
    tone,
    'clean workspace, mindful atmosphere',
    'high detail, soothing colours, depth of field'
  ]

  if (session.intent?.name) {
    descriptors.push(`inspired by the ${session.intent.name} focus intention`)
  }
  if (session.intent?.description) {
    descriptors.push(session.intent.description)
  }
  if (session.ambient?.label) {
    descriptors.push(`ambient music vibe: ${session.ambient.label}`)
  }

  const prompt = descriptors.join(', ')
  const negativePrompt = 'harsh shadows, cluttered desk, dark horror mood, text overlays, watermark'

  return {
    prompt,
    negativePrompt
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

  const body = parseBody(req)
  if (!body.prompt) {
    if (body.session) {
      const auto = buildImagePrompt(body.session)
      body.prompt = clampPrompt(auto.prompt)
      if (!body.negativePrompt) {
        body.negativePrompt = auto.negativePrompt
      }
    } else {
      sendJson(res, 400, { error: 'Prompt or session context is required' })
      return
    }
  }

  const guidance = body.guidanceScale && body.guidanceScale > 0 ? Math.min(15, Math.max(1, body.guidanceScale)) : 7.5
  const steps = body.steps && body.steps > 0 ? Math.min(60, Math.max(15, Math.round(body.steps))) : 35
  const negativePrompt = body.negativePrompt && body.negativePrompt.length >= 3 ? body.negativePrompt : NEGATIVE_FALLBACK
  const width = clampDimension(body.width, DEFAULT_WIDTH)
  const height = clampDimension(body.height, DEFAULT_HEIGHT)

  try {
    const started = Date.now()
    const buffer = await callHuggingFace(IMAGE_MODEL, {
      inputs: body.prompt,
      parameters: {
        negative_prompt: negativePrompt,
        guidance_scale: guidance,
        num_inference_steps: steps,
        width,
        height
      }
    })
    const durationMs = Date.now() - started
    const base64 = buffer.toString('base64')
    sendJson(res, 200, {
      prompt: body.prompt,
      model: IMAGE_MODEL,
      guidanceScale: guidance,
      steps,
      negativePrompt,
      width,
      height,
      imageBase64: `data:image/png;base64,${base64}`,
      timings: { durationMs }
    })
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 500
    sendJson(res, status, { error: error?.message || 'Failed to generate image' })
  }
}
