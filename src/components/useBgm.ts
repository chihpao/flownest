import { ref, computed, onUnmounted } from 'vue'

// Simple global singleton audio so playback persists across routes
let audio: HTMLAudioElement | null = null

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
    return v || 'https://stream.nightride.fm/lofi.ogg'
  } catch {
    return 'https://stream.nightride.fm/lofi.ogg'
  }
}

function ensureAudio() {
  if (audio) return audio
  // Default remote lofi stream (can be overridden via setSource)
  const src = getDefaultSrc()
  audio = new Audio(src)
  audio.loop = true
  audio.preload = 'none'
  audio.crossOrigin = 'anonymous'
  audio.volume = getDefaultVolume()
  return audio
}

export function useBgm() {
  const enabled = ref(getDefaultEnabled())
  const volume = ref(getDefaultVolume())
  const isPlaying = ref(false)
  const source = ref<string>('')
  let retryCount = 0
  const maxRetries = 3

  const a = ensureAudio()
  a.volume = volume.value
  source.value = a.src

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
  const onErrorOrStalled = () => {
    if (!audio) return
    if (retryCount >= maxRetries) return
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
