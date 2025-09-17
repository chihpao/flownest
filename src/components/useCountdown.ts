import { ref, onUnmounted, computed } from 'vue'

export interface CountdownOptions {
  initialMinutes?: number
  onComplete?: () => void
  onTick?: (remaining: number) => void
}

export function useCountdown(options: CountdownOptions = {}) {
  const {
    initialMinutes = 30,
    onComplete,
    onTick,
  } = options

  const remaining = ref(initialMinutes * 60)
  const totalSeconds = ref(initialMinutes * 60)
  const running = ref(false)
  const hasStarted = ref(false)
  const startedAt = ref<number | null>(null)
  let timerId: number | null = null

  const progress = computed(() => {
    const t = totalSeconds.value
    return t ? Math.max(0, Math.min(1, remaining.value / t)) : 0
  })

  const elapsedSeconds = computed(() => {
    return Math.max(0, totalSeconds.value - remaining.value)
  })

  const formattedTime = computed(() => {
    const s = Math.max(0, remaining.value)
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  })

  const clearTimer = () => {
    if (timerId !== null) {
      clearInterval(timerId)
      timerId = null
    }
  }

  const handleComplete = () => {
    pause()
    onComplete?.()
  }

  const tick = () => {
    if (!running.value) return

    if (remaining.value <= 0) {
      handleComplete()
      return
    }

    remaining.value = Math.max(0, remaining.value - 1)
    onTick?.(remaining.value)

    if (remaining.value === 0) {
      handleComplete()
    }
  }

  const start = (minutes?: number) => {
    if (minutes !== undefined) {
      setTime(minutes)
    }
    if (running.value) return

    if (remaining.value <= 0) {
      remaining.value = totalSeconds.value
    }

    startedAt.value = Date.now()
    running.value = true
    hasStarted.value = true
    clearTimer()
    timerId = window.setInterval(tick, 1000)
  }

  const pause = () => {
    if (!running.value) return
    running.value = false
    clearTimer()
  }

  const resume = () => {
    if (running.value || remaining.value <= 0) return
    start()
  }

  const stop = () => {
    pause()
  }

  const reset = (minutes?: number) => {
    pause()
    if (minutes !== undefined) {
      setTime(minutes)
    } else {
      remaining.value = totalSeconds.value
    }
    hasStarted.value = false
    startedAt.value = null
  }

  const setTime = (minutes: number) => {
    const seconds = Math.max(1, Math.round(minutes * 60))
    totalSeconds.value = seconds
    remaining.value = seconds
  }

  onUnmounted(() => {
    clearTimer()
  })

  return {
    remaining,
    running,
    hasStarted,
    progress,
    elapsedSeconds,
    formattedTime,
    start,
    pause,
    resume,
    stop,
    reset,
    setTime,
  }
}
