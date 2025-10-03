// src/stores/useAiCoach.ts
import { defineStore } from 'pinia'
import { generateEncouragement, generateSupportImage, type EncouragementRequest, type EncouragementResponse, type ImageRequest, type ImageResponse } from '@/api/encouragement'

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

function mapEncouragementResponse(prompt: string, locale: string, data: EncouragementResponse): EncouragementEntry {
  return {
    id: makeId(),
    prompt,
    locale,
    englishText: data.englishText,
    translatedText: data.translatedText ?? null,
    model: data.model,
    translatorModel: data.translatorModel ?? null,
    createdAt: safeNow(),
    durationMs: data.timings?.durationMs
  }
}

function mapImageResponse(prompt: string, data: ImageResponse): SupportImageEntry {
  return {
    id: makeId(),
    prompt,
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
    encouragementHistory: [] as EncouragementEntry[],
    supportImageHistory: [] as SupportImageEntry[],
    encouragementLoading: false,
    encouragementError: '' as string,
    imageLoading: false,
    imageError: '' as string
  }),
  getters: {
    latestEncouragement: (s) => s.encouragementHistory[0] ?? null,
    latestImage: (s) => s.supportImageHistory[0] ?? null
  },
  actions: {
    init() {
      if (this.initialized) return
      this.initialized = true
      this.encouragementHistory = loadFromStorage<EncouragementEntry>(STORAGE_KEY_TEXT)
      this.supportImageHistory = loadFromStorage<SupportImageEntry>(STORAGE_KEY_IMAGE)
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
        const entry = mapEncouragementResponse(payload.prompt, response.locale, response)
        this.upsertEncouragement(entry)
        return entry
      } catch (error: any) {
        this.encouragementError = error?.message ?? 'Failed to generate encouragement.'
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
        const entry = mapImageResponse(payload.prompt, response)
        this.upsertSupportImage(entry)
        return entry
      } catch (error: any) {
        this.imageError = error?.message ?? 'Failed to generate image.'
        throw error
      } finally {
        this.imageLoading = false
      }
    }
  }
})
