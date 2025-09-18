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
  // Default remote lofi stream (can be overridden via setSource)
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

export function useBgm() {
  const enabled = ref(getDefaultEnabled())
  const volume = ref(getDefaultVolume())
  const isPlaying = ref(false)
  const source = ref<string>('')
  let retryCount = 0
  const maxRetries = 3
  let fallbackIndex = 0

  const a = ensureAudio()
  a.volume = volume.value
  source.value = a.src
  // Track which default URL we started on
  const startIdx = DEFAULT_SOURCES.findIndex(u => a.src.includes(u))
  if (startIdx >= 0) fallbackIndex = startIdx

  const canAutoplay = computed(() => enabled.value)

  const play = async () => {
    try {
      if (!audio) ensureAudio()
      if (!audio) return
      // If previous src failed, allow override to local /lofi.mp3 by user later
      await audio.play()
      isPlaying.value = true
      enabled.value = true
      try { localStorage.setItem(ENABLED_KEY, '1') } catch {}
    } catch (e) {
      // Autoplay might be blocked; keep state consistent
      isPlaying.value = false
    }
  }

  const pause = () => {
    if (!audio) return
    audio.pause()
    isPlaying.value = false
    enabled.value = false
    try { localStorage.setItem(ENABLED_KEY, '0') } catch {}
  }

  const toggle = () => {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  const setVolume = (v: number) => {
    const vol = Math.min(1, Math.max(0, v))
    volume.value = vol
    if (audio) audio.volume = vol
    try { localStorage.setItem(VOLUME_KEY, String(vol)) } catch {}
  }

  const setSource = async (url: string) => {
    if (!audio) ensureAudio()
    if (!audio) return
    try { localStorage.setItem(SRC_KEY, url) } catch {}
    const wasPlaying = isPlaying.value
    audio.pause()
    audio.src = url
    source.value = url
    const idx = DEFAULT_SOURCES.findIndex(u => u === url)
    if (idx >= 0) fallbackIndex = idx
    // Some streams need load() to start buffering
    audio.load()
    if (wasPlaying || enabled.value) {
      try { await audio.play(); isPlaying.value = true } catch { /* ignore autoplay errors */ }
    }
  }

  // Keep reactive state in sync if user interacts with native controls
  const onPlay = () => { isPlaying.value = true }
  const onPause = () => { isPlaying.value = false }
  const onPlaying = () => { retryCount = 0 }
  const onErrorOrStalled = async () => {
    if (!audio) return
    // If too many retries on current URL, advance to next known fallback
    if (retryCount >= maxRetries) {
      // Only auto-advance if user hasn't explicitly chosen a custom URL
      const saved = (() => { try { return localStorage.getItem(SRC_KEY) } catch { return null } })()
      const isCustom = !!saved && !DEFAULT_SOURCES.includes(saved)
      if (!isCustom) {
        const current = audio.src
        // Find current index within defaults (if any)
        const currentIdx = DEFAULT_SOURCES.findIndex(u => current.includes(u))
        fallbackIndex = currentIdx >= 0 ? currentIdx + 1 : fallbackIndex + 1
        if (fallbackIndex < DEFAULT_SOURCES.length) {
          const nextUrl = DEFAULT_SOURCES[fallbackIndex]
          // Switch source and attempt play
          await setSource(nextUrl)
          retryCount = 0
          return
        }
      }
      // No more fallbacks or custom URL set: stop retrying
      return
    }

    const delay = (retryCount + 1) * 2000
    const url = audio.src
    setTimeout(async () => {
      if (!audio) return
      try {
        audio.pause()
        audio.src = url
        audio.load()
        await audio.play()
        isPlaying.value = true
        retryCount++
      } catch {
        retryCount++
      }
    }, delay)
  }

  a.addEventListener('play', onPlay)
  a.addEventListener('pause', onPause)
  a.addEventListener('playing', onPlaying)
  a.addEventListener('stalled', onErrorOrStalled)
  a.addEventListener('error', onErrorOrStalled)

  onUnmounted(() => {
    a.removeEventListener('play', onPlay)
    a.removeEventListener('pause', onPause)
    a.removeEventListener('playing', onPlaying)
    a.removeEventListener('stalled', onErrorOrStalled)
    a.removeEventListener('error', onErrorOrStalled)
  })

  // Try to start if enabled (may be blocked until user gesture)
  if (canAutoplay.value && !isPlaying.value) {
    // Fire and forget; catch is handled in play()
    play()
  }

  return {
    enabled,
    volume,
    isPlaying,
    source,
    play,
    pause,
    toggle,
    setVolume,
    setSource,
  }
}
