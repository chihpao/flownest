// src/api/encouragement.ts
export interface FocusSessionContext {
  title: string
  minutesPlanned: number
  minutesActual: number
  startedAt?: number
  finishedAt?: number
  finishedEarly?: boolean
  intent?: {
    id?: string
    name?: string
    description?: string
    affirmation?: string
  }
  ambient?: {
    id?: string
    label?: string
    description?: string
  }
}

export interface EncouragementRequest {
  prompt?: string
  locale?: string
  session?: FocusSessionContext
}

export interface EncouragementResponse {
  prompt: string
  locale: string
  englishText: string
  translatedText?: string | null
  model: string
  translatorModel?: string | null
  timings?: { durationMs?: number }
  raw?: string
}

export interface ImageRequest {
  prompt?: string
  session?: FocusSessionContext
  negativePrompt?: string
  guidanceScale?: number
  steps?: number
  width?: number
  height?: number
}

export interface ImageResponse {
  prompt: string
  model: string
  guidanceScale: number
  steps: number
  negativePrompt?: string
  width?: number
  height?: number
  imageBase64: string
  timings?: { durationMs?: number }
}

async function requestJson<T, P extends Record<string, unknown> = Record<string, unknown>>(path: string, payload: P): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch (error: any) {
    const friendly = new Error('AI 服務無法連線，請確認已啟動 vercel dev 或部署後端服務。')
    ;(friendly as any).cause = error
    throw friendly
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    let details: unknown
    try {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        details = await response.json()
        if (typeof (details as any)?.error === 'string') {
          message = (details as any).error
        }
      } else {
        const rawText = await response.text()
        if (rawText.trim()) {
          message = rawText.trim()
        }
      }
    } catch {
      // ignore parsing error and keep default message
    }
    const err: any = new Error(message)
    err.status = response.status
    if (details !== undefined) {
      err.details = details
    }
    throw err
  }

  return response.json() as Promise<T>
}

export function generateEncouragement(payload: EncouragementRequest) {
  return requestJson<EncouragementResponse>('/api/encouragement', payload as unknown as Record<string, unknown>)
}

export function generateSupportImage(payload: ImageRequest) {
  return requestJson<ImageResponse>('/api/encouragement-image', payload as unknown as Record<string, unknown>)
}
