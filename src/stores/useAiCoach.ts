import { defineStore } from 'pinia'
import {
  generateEncouragement,
  generateSupportImage,
  type EncouragementRequest,
  type EncouragementResponse,
  type FocusSessionContext,
  type ImageRequest,
  type ImageResponse
} from '@/api/encouragement'

export interface EncouragementEntry {
  id: string
  prompt: string
  locale: string
  englishText: string
  translatedText?: string | null
  model: string
  translatorModel?: string | null
  createdAt: string
  durationMs?: number
}

export interface SupportImageEntry {
  id: string
  prompt: string
  imageBase64: string
  model: string
  guidanceScale: number
  steps: number
  negativePrompt?: string
  width?: number
  height?: number
  createdAt: string
  durationMs?: number
}

const STORAGE_KEY_TEXT = 'flownest.ai.encouragements'
const STORAGE_KEY_IMAGE = 'flownest.ai.images'
const HISTORY_LIMIT = 12

function safeNow() {
  return new Date().toISOString()
}

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

function loadFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // noop
  }
}

function resolveAiErrorMessage(error: unknown, kind: 'encouragement' | 'image') {
  const fallback = kind === 'encouragement'
    ? '暫時無法生成鼓勵語，請稍後再試。'
    : '暫時無法生成支援圖像，請稍後再試。'
  if (!error || typeof error !== 'object') {
    return fallback
  }
  const rawMessage = typeof (error as any).message === 'string' ? (error as any).message.trim() : ''
  const status = typeof (error as any).status === 'number' ? (error as any).status : undefined
  if (rawMessage.includes('Hugging Face API key')) {
    return '尚未設定 Hugging Face API key，請在 .env.local 中加入 HUGGINGFACE_API_KEY 後重新啟動。'
  }
  const lowered = rawMessage.toLowerCase()
  if (lowered.includes('failed to fetch') || lowered.includes('ai 服務無法連線')) {
    return 'AI 服務無法連線，請確認已啟動 `vercel dev` 或檢查網路後再試。'
  }
  if (/request failed with status 500/i.test(rawMessage) || /econnrefused|connect/i.test(rawMessage) || status === 500) {
    return 'AI 服務尚未啟動或連線中斷，請確認後端服務可用後再試。'
  }
  if (status === 429) {
    return 'AI 服務暫時超出流量限制，請稍後再試。'
  }
  if (status === 401 || status === 403) {
    return 'AI 服務驗證失敗，請檢查 Hugging Face API key 權限。'
  }
  return rawMessage || fallback
}

function mapEncouragementResponse(data: EncouragementResponse): EncouragementEntry {
  return {
    id: makeId(),
    prompt: data.prompt || '',
    locale: data.locale,
    englishText: data.englishText,
    translatedText: data.translatedText ?? null,
    model: data.model,
    translatorModel: data.translatorModel ?? null,
    createdAt: safeNow(),
    durationMs: data.timings?.durationMs
  }
}

function mapImageResponse(data: ImageResponse): SupportImageEntry {
  return {
    id: makeId(),
    prompt: data.prompt || '',
    imageBase64: data.imageBase64,
    model: data.model,
    guidanceScale: data.guidanceScale,
    steps: data.steps,
    negativePrompt: data.negativePrompt,
    width: data.width,
    height: data.height,
    createdAt: safeNow(),
    durationMs: data.timings?.durationMs
  }
}

export const useAiCoach = defineStore('aiCoach', {
  state: () => ({
    initialized: false,
    sessionContext: null as FocusSessionContext | null,
    encouragementHistory: [] as EncouragementEntry[],
    supportImageHistory: [] as SupportImageEntry[],
    encouragementLoading: false,
    encouragementError: '' as string,
    imageLoading: false,
    imageError: '' as string
  }),
  getters: {
    latestEncouragement: (s) => s.encouragementHistory[0] ?? null,
    latestImage: (s) => s.supportImageHistory[0] ?? null,
    hasSessionContext: (s) => Boolean(s.sessionContext)
  },
  actions: {
    init() {
      if (this.initialized) return
      this.initialized = true
      this.encouragementHistory = loadFromStorage<EncouragementEntry>(STORAGE_KEY_TEXT)
      this.supportImageHistory = loadFromStorage<SupportImageEntry>(STORAGE_KEY_IMAGE)
    },

    setSessionContext(context: FocusSessionContext | null) {
      this.sessionContext = context
    },

    upsertEncouragement(entry: EncouragementEntry) {
      this.encouragementHistory = [entry, ...this.encouragementHistory].slice(0, HISTORY_LIMIT)
      saveToStorage(STORAGE_KEY_TEXT, this.encouragementHistory)
    },

    upsertSupportImage(entry: SupportImageEntry) {
      this.supportImageHistory = [entry, ...this.supportImageHistory].slice(0, HISTORY_LIMIT)
      saveToStorage(STORAGE_KEY_IMAGE, this.supportImageHistory)
    },

    clearEncouragementError() {
      this.encouragementError = ''
    },

    clearImageError() {
      this.imageError = ''
    },

    async requestEncouragement(payload: EncouragementRequest) {
      this.init()
      if (this.encouragementLoading) return
      this.encouragementLoading = true
      this.encouragementError = ''
      try {
        const response = await generateEncouragement(payload)
        const entry = mapEncouragementResponse(response)
        this.upsertEncouragement(entry)
        return entry
      } catch (error: any) {
        this.encouragementError = resolveAiErrorMessage(error, 'encouragement')
        throw error
      } finally {
        this.encouragementLoading = false
      }
    },

    async requestSupportImage(payload: ImageRequest) {
      this.init()
      if (this.imageLoading) return
      this.imageLoading = true
      this.imageError = ''
      try {
        const response = await generateSupportImage(payload)
        const entry = mapImageResponse(response)
        this.upsertSupportImage(entry)
        return entry
      } catch (error: any) {
        this.imageError = resolveAiErrorMessage(error, 'image')
        throw error
      } finally {
        this.imageLoading = false
      }
    },

    async generateForSession(context: FocusSessionContext, options: { locale?: string } = {}) {
      this.init()
      this.setSessionContext(context)
      const locale = options.locale ?? 'zh'
      await Promise.allSettled([
        this.requestEncouragement({ session: context, locale }),
        this.requestSupportImage({ session: context })
      ])
    },

    async regenerateEncouragement(options: { locale?: string } = {}) {
      if (!this.sessionContext) return null
      const locale = options.locale ?? 'zh'
      return this.requestEncouragement({ session: this.sessionContext, locale })
    },

    async regenerateSupportImage() {
      if (!this.sessionContext) return null
      return this.requestSupportImage({ session: this.sessionContext })
    }
  }
})
