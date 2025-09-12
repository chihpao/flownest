import { ref, onUnmounted } from 'vue'

export function useCountdown() {
  const remaining = ref(0)         // 秒
  const running = ref(false)
  let h: number | null = null

  const start = (seconds: number) => {
    clear()
    remaining.value = seconds
    running.value = true
    h = window.setInterval(() => {
      remaining.value--
      if (remaining.value <= 0) stop()
    }, 1000)
  }

  const stop = () => {
    running.value = false
    clear()
  }

  const clear = () => {
    if (h !== null) { clearInterval(h); h = null }
  }

  const fmt = () => {
    const s = Math.max(0, remaining.value)
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  onUnmounted(clear)
  return { remaining, running, start, stop, fmt }
}
