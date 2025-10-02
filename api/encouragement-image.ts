import type { VercelRequest, VercelResponse } from '@vercel/node'

const TOKEN = process.env.HUGGINGFACE_API_KEY
  || process.env.HUGGINGFACEHUB_API_TOKEN
  || process.env.HF_API_TOKEN
  || process.env.HF_TOKEN

const IMAGE_MODEL = process.env.HF_IMAGE_MODEL_ID || 'stabilityai/stable-diffusion-2-1'
const MAX_PROMPT_LENGTH = Number(process.env.HF_IMAGE_PROMPT_LIMIT || 280)
const NEGATIVE_FALLBACK = 'blurry, watermark, text, logo, low quality, distorted, disfigured, nsfw'

interface ImageRequestBody {
  prompt: string
  negativePrompt?: string | null
  guidanceScale?: number
  steps?: number
}

function parseBody(req: VercelRequest): ImageRequestBody {
  const raw = ((): any => {
    if (req.body) return req.body
    if (!req.rawBody) return {}
    try {
      return JSON.parse(req.rawBody.toString('utf8'))
    } catch {
      return {}
    }
  })()

  let prompt = typeof raw?.prompt === 'string' ? raw.prompt.trim() : ''
  if (prompt.length > MAX_PROMPT_LENGTH) {
    prompt = prompt.slice(0, MAX_PROMPT_LENGTH)
  }

  const negativePrompt = typeof raw?.negativePrompt === 'string' ? raw.negativePrompt.trim() : undefined
  const guidanceScale = Number(raw?.guidanceScale)
  const steps = Number(raw?.steps)

  return {
    prompt,
    negativePrompt,
    guidanceScale: Number.isFinite(guidanceScale) ? guidanceScale : undefined,
    steps: Number.isFinite(steps) ? steps : undefined
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
  timeoutMs = 40000
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
    sendJson(res, 400, { error: 'Prompt is required' })
    return
  }

  const guidance = body.guidanceScale && body.guidanceScale > 0 ? Math.min(14, Math.max(1, body.guidanceScale)) : 7.5
  const steps = body.steps && body.steps > 0 ? Math.min(50, Math.max(10, Math.round(body.steps))) : 30
  const negativePrompt = body.negativePrompt && body.negativePrompt.length >= 3 ? body.negativePrompt : NEGATIVE_FALLBACK

  try {
    const started = Date.now()
    const buffer = await callHuggingFace(IMAGE_MODEL, {
      inputs: body.prompt,
      parameters: {
        negative_prompt: negativePrompt,
        guidance_scale: guidance,
        num_inference_steps: steps
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
      imageBase64: `data:image/png;base64,${base64}`,
      timings: { durationMs }
    })
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 500
    sendJson(res, status, { error: error?.message || 'Failed to generate image' })
  }
}
