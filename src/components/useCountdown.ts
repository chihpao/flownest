import { ref, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

export interface CountdownOptions {
  initialMinutes?: number
  onComplete?: () => void
  onTick?: (remaining: number) => void
}

export function useCountdown(options: CountdownOptions = {}) {
  const {
    initialMinutes = 30,
    onComplete,
    onTick
  } = options

  const router = useRouter()
  const remaining = ref(initialMinutes * 60)
  const running = ref(false)
  const totalSeconds = ref(initialMinutes * 60)
  let timerId: number | null = null

  const progress = computed(() => {
    const t = totalSeconds.value
    return t ? Math.max(0, Math.min(1, remaining.value / t)) : 0
  })

  const formattedTime = computed(() => {
    const s = Math.max(0, remaining.value)
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  })

  const start = (minutes?: number) => {
    if (minutes !== undefined) {
      setTime(minutes)
    }
    if (remaining.value <= 0) {
      remaining.value = totalSeconds.value
    }
    running.value = true
    timerId = window.setInterval(tick, 1000)
  }

  const stop = () => {
    running.value = false
    clearTimer()
  }

  const reset = () => {
    stop()
    remaining.value = totalSeconds.value
  }

  const setTime = (minutes: number) => {
    totalSeconds.value = minutes * 60
    remaining.value = totalSeconds.value
  }

  const clearTimer = () => {
    if (timerId !== null) {
      clearInterval(timerId)
      timerId = null
    }
  }

  const tick = () => {
    remaining.value--
    onTick?.(remaining.value)
    
    if (remaining.value <= 0) {
      stop()
      onComplete?.()
    }
  }

  // 監聽剩餘時間變化
  watch(remaining, (newVal, oldVal) => {
    if (newVal === 0 && oldVal > 0) {
      onComplete?.()
    }
  })

  onUnmounted(clearTimer)

  return {
    remaining,
    running,
    progress,
    formattedTime,
    start,
    stop,
    reset,
    setTime
  }
}
