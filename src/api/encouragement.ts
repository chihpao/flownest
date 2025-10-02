// src/api/encouragement.ts
export interface EncouragementRequest {
  prompt: string
  locale?: string
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
  prompt: string
  negativePrompt?: string
  guidanceScale?: number
  steps?: number
}

export interface ImageResponse {
  prompt: string
  model: string
  guidanceScale: number
  steps: number
  negativePrompt?: string
  imageBase64: string
  timings?: { durationMs?: number }
}

async function requestJson<T, P extends Record<string, unknown> = Record<string, unknown>>(path: string, payload: P): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const data = await response.json()
      if (data?.error) {
        message = data.error
      }
    } catch {
      // ignore parsing error and keep default message
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function generateEncouragement(payload: EncouragementRequest) {
  return requestJson<EncouragementResponse>('/api/encouragement', payload as unknown as Record<string, unknown>)
}

export function generateSupportImage(payload: ImageRequest) {
  return requestJson<ImageResponse>('/api/encouragement-image', payload as unknown as Record<string, unknown>)
}
