import { ref, computed, onUnmounted } from 'vue'

// Simple global singleton audio so playback persists across routes
let audio: HTMLAudioElement | null = null

// Known good public radio streams (CORS-enabled)
const DEFAULT_SOURCES = [
  // Nightride HTTPS streams confirmed alive as of 2025-09
  'https://stream.nightride.fm/chillsynth.mp3',
  'https://stream.nightride.fm/datawave.mp3',
  'https://stream.nightride.fm/nightride.mp3',
  // SomaFM provides nice ambient backups but may rate-limit; keep as later fallbacks
  'https://ice1.somafm.com/groovesalad-128-mp3',
  'https://ice2.somafm.com/lush-128-mp3',
]

const LEGACY_SOURCE_REMAPPINGS: Array<(src: string) => string | null> = [
  (src) => (src.includes('/lofi') ? 'https://stream.nightride.fm/chillsynth.mp3' : null),
  (src) => (src.includes('/jazzhop') ? 'https://stream.nightride.fm/datawave.mp3' : null),
  (src) => (src.includes('/chillwave') ? 'https://stream.nightride.fm/chillsynth.mp3' : null),
  (src) => {
    const match = src.match(/^https?:\/\/stream\.nightride\.fm:58000\/(.+)$/i)
    return match ? `https://stream.nightride.fm/${match[1]}` : null
  },
]

const ENABLED_KEY = 'bgm:enabled'
const VOLUME_KEY = 'bgm:volume'
const SRC_KEY = 'bgm:src'

function getDefaultEnabled() {
  try {
    const v = localStorage.getItem(ENABLED_KEY)
    return v === null ? false : v === '1'
  } catch {
    return false
  }
}

function getDefaultVolume() {
  try {
    const v = localStorage.getItem(VOLUME_KEY)
    const num = v != null ? Number(v) : 0.4
    return Number.isFinite(num) ? Math.min(1, Math.max(0, num)) : 0.4
  } catch {
    return 0.4
  }
}

function getDefaultSrc() {
  try {
    const v = localStorage.getItem(SRC_KEY)
    if (v) {
      for (const remap of LEGACY_SOURCE_REMAPPINGS) {
        const mapped = remap(v)
        if (mapped && mapped !== v) {
          try { localStorage.setItem(SRC_KEY, mapped) } catch {}
          return mapped
        }
      }
      return v
    }
    return DEFAULT_SOURCES[0]
  } catch {
    return DEFAULT_SOURCES[0]
  }
}

function ensureAudio() {
  if (audio) return audio
  const src = getDefaultSrc()
  const element = new Audio()
  element.loop = true
  element.preload = 'none'
  element.crossOrigin = 'anonymous'
  element.src = src
  element.volume = getDefaultVolume()
  audio = element
  return audio
}

const enabled = ref(getDefaultEnabled())
const volume = ref(getDefaultVolume())
const isPlaying = ref(false)
const source = ref<string>('')

let retryCount = 0
const maxRetries = 3
let fallbackIndex = 0
let listenersBound = false
let consumers = 0

function syncSourceFromAudio() {
  if (!audio) return
  source.value = audio.src
  const idx = DEFAULT_SOURCES.findIndex((u) => audio && audio.src.includes(u))
  if (idx >= 0) {
    fallbackIndex = idx
  }
}

function bindAudioListeners(target: HTMLAudioElement) {
  if (listenersBound) return
  target.addEventListener('play', onPlay)
  target.addEventListener('pause', onPause)
  target.addEventListener('playing', onPlaying)
  target.addEventListener('stalled', onErrorOrStalled)
  target.addEventListener('error', onErrorOrStalled)
  listenersBound = true
}

function releaseAudioListeners(target: HTMLAudioElement) {
  if (!listenersBound) return
  target.removeEventListener('play', onPlay)
  target.removeEventListener('pause', onPause)
  target.removeEventListener('playing', onPlaying)
  target.removeEventListener('stalled', onErrorOrStalled)
  target.removeEventListener('error', onErrorOrStalled)
  listenersBound = false
}

function ensureReadyAudio() {
  const a = ensureAudio()
  if (!a) return null
  if (!listenersBound) {
    bindAudioListeners(a)
  }
  if (a.volume !== volume.value) {
    a.volume = volume.value
  }
  syncSourceFromAudio()
  return a
}

async function play() {
  const a = ensureReadyAudio()
  if (!a) return
  try {
    await a.play()
    isPlaying.value = true
    enabled.value = true
    try { localStorage.setItem(ENABLED_KEY, '1') } catch {}
  } catch {
    isPlaying.value = false
  }
}

function pause() {
  if (!audio) return
  audio.pause()
  isPlaying.value = false
  enabled.value = false
  try { localStorage.setItem(ENABLED_KEY, '0') } catch {}
}

function toggle() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

function setVolumeValue(v: number) {
  const vol = Math.min(1, Math.max(0, v))
  volume.value = vol
  if (audio) audio.volume = vol
  try { localStorage.setItem(VOLUME_KEY, String(vol)) } catch {}
}

async function setSource(url: string) {
  const a = ensureReadyAudio()
  if (!a) return
  try { localStorage.setItem(SRC_KEY, url) } catch {}
  const wasPlaying = isPlaying.value
  a.pause()
  a.src = url
  syncSourceFromAudio()
  retryCount = 0
  const idx = DEFAULT_SOURCES.findIndex((u) => u === url)
  if (idx >= 0) fallbackIndex = idx
  a.load()
  if (wasPlaying || enabled.value) {
    try {
      await a.play()
      isPlaying.value = true
    } catch {
      isPlaying.value = false
    }
  }
}

const onPlay = () => {
  isPlaying.value = true
  enabled.value = true
  try { localStorage.setItem(ENABLED_KEY, '1') } catch {}
}

const onPause = () => {
  isPlaying.value = false
  enabled.value = false
  try { localStorage.setItem(ENABLED_KEY, '0') } catch {}
}

const onPlaying = () => {
  retryCount = 0
}

const onErrorOrStalled = async () => {
  if (!audio) return
  if (retryCount >= maxRetries) {
    const saved = (() => {
      try { return localStorage.getItem(SRC_KEY) } catch { return null }
    })()
    const isCustom = !!saved && !DEFAULT_SOURCES.includes(saved)
    if (!isCustom) {
      const current = audio.src
      const currentIdx = DEFAULT_SOURCES.findIndex((u) => current.includes(u))
      fallbackIndex = currentIdx >= 0 ? currentIdx + 1 : fallbackIndex + 1
      if (fallbackIndex < DEFAULT_SOURCES.length) {
        const nextUrl = DEFAULT_SOURCES[fallbackIndex]
        await setSource(nextUrl)
        retryCount = 0
        return
      }
    }
    return
  }

  const delay = (retryCount + 1) * 2000
  const url = audio.src
  setTimeout(async () => {
    if (!audio) return
    try {
      audio.pause()
      audio.src = url
      syncSourceFromAudio()
      audio.load()
      await audio.play()
      isPlaying.value = true
      retryCount++
    } catch {
      retryCount++
    }
  }, delay)
}

export function useBgm() {
  const ready = ensureReadyAudio()
  if (ready) {
    consumers++
  }

  const canAutoplay = computed(() => enabled.value)

  if (canAutoplay.value && !isPlaying.value) {
    play().catch(() => {})
  }

  onUnmounted(() => {
    consumers = Math.max(0, consumers - 1)
    if (consumers === 0 && audio) {
      releaseAudioListeners(audio)
    }
  })

  return {
    enabled,
    volume,
    isPlaying,
    source,
    play,
    pause,
    toggle,
    setVolume: setVolumeValue,
    setSource,
  }
}
