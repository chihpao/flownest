<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCountdown } from '@/components/useCountdown'
import ThreeBreathingSphere from '@/components/ThreeBreathingSphere.vue'
import BgmControl from '@/components/BgmControl.vue'
import { useBgm } from '@/components/useBgm'
import { findIntentById, findAmbientById } from '@/config/sessionPresets'

const route = useRoute()
const router = useRouter()

const selectedIntent = computed(() => findIntentById(route.query.intent as string | null))
const resolvedMinutes = computed(() => {
  const raw = Number(route.query.m)
  if (Number.isFinite(raw) && raw > 0) {
    return Math.min(300, Math.round(raw))
  }
  return selectedIntent.value.recommendedMinutes
})
const resolvedBreak = computed(() => {
  const raw = Number(route.query.break)
  if (Number.isFinite(raw) && raw >= 1 && raw <= 30) {
    return Math.round(raw)
  }
  return selectedIntent.value.suggestedBreak
})
const selectedAmbient = computed(() => findAmbientById(route.query.ambient as string | null))
const shouldAutoplay = computed(() => route.query.autoplay === '1')

const {
  remaining,
  running,
  hasStarted,
  progress,
  elapsedSeconds,
  formattedTime,
  start,
  pause,
  resume,
  reset,
  setTime,
} = useCountdown({
  initialMinutes: resolvedMinutes.value,
  onComplete: () => {
    try { pauseBgm() } catch {}
    router.push({
      path: '/done',
      query: {
        m: resolvedMinutes.value,
        intent: selectedIntent.value.id,
        break: resolvedBreak.value,
        ambient: selectedAmbient.value.id,
      },
    })
  },
})

const { play: playBgm, pause: pauseBgm, setSource } = useBgm()

const isPaused = computed(() => hasStarted.value && !running.value && remaining.value > 0)
const completedPercent = computed(() => Math.max(0, Math.min(100, Math.round((1 - progress.value) * 100))))
const remainingMinutes = computed(() => Math.max(0, Math.ceil(remaining.value / 60)))
const elapsedMinutes = computed(() => Math.floor(elapsedSeconds.value / 60))

const statusLabel = computed(() => {
  if (running.value) return '進行中'
  if (isPaused.value) return '已暫停'
  return '準備就緒'
})
const primaryActionLabel = computed(() => {
  if (running.value) return '暫停計時'
  if (hasStarted.value) return '繼續'
  return '開始'
})
const affirmation = computed(() => selectedIntent.value.affirmation)

const microBreakIdeas = [
  '伸展肩頸與手腕 30 秒，讓身體重新醒來。',
  '補充一杯水或茶，維持專注續航力。',
  '閉上眼深呼吸三次，讓心情重新歸零。',
]

const handlePrimaryAction = async () => {
  if (running.value) {
    pause()
    try { pauseBgm() } catch {}
  } else {
    resume()
    if (shouldAutoplay.value) {
      try { await playBgm() } catch {}
    }
  }
}

const handleReset = () => {
  reset(resolvedMinutes.value)
  start()
  if (shouldAutoplay.value) {
    playBgm().catch(() => {})
  }
}

const handleStop = () => {
  pause()
  try { pauseBgm() } catch {}
  router.push({
    path: '/done',
    query: {
      m: resolvedMinutes.value,
      intent: selectedIntent.value.id,
      break: resolvedBreak.value,
      ambient: selectedAmbient.value.id,
      remaining: Math.max(0, Math.ceil(remaining.value / 60)),
    },
  })
}

watch(resolvedMinutes, (value, prev) => {
  if (value === prev) return
  setTime(value)
  reset(value)
  if (shouldAutoplay.value) {
    playBgm().catch(() => {})
  }
  start()
})

watch(selectedAmbient, (track, prev) => {
  if (track.id === prev?.id) return
  setSource(track.url).catch(() => {})
  if (shouldAutoplay.value && running.value) {
    playBgm().catch(() => {})
  }
})

onMounted(() => {
  setTime(resolvedMinutes.value)
  start()
  setSource(selectedAmbient.value.url).catch(() => {})
  if (shouldAutoplay.value) {
    setTimeout(() => {
      playBgm().catch(() => {})
    }, 160)
  }
})
</script>

<template>
  <main class="relative min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <div class="absolute top-4 right-4 z-20">
      <BgmControl />
    </div>

    <section class="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header class="space-y-3 text-center">
        <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold tracking-[0.2em] text-emerald-600">
          {{ statusLabel }}
        </span>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          {{ selectedIntent.name }}
        </h1>
        <p class="mx-auto max-w-2xl text-base leading-relaxed text-slate-500">
          {{ selectedIntent.description }}
        </p>
      </header>

      <div class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <article class="flex flex-col gap-8 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm md:p-8">
          <div class="grid place-items-center gap-3 text-center">
            <span class="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">專注計時</span>
            <div class="relative inline-flex items-center justify-center rounded-3xl bg-slate-900/95 px-6 py-2 shadow-xl shadow-slate-900/20">
              <span class="text-5xl font-mono font-bold tracking-wide text-white md:text-6xl">
                {{ formattedTime }}
              </span>
            </div>
            <div class="flex items-center justify-center gap-4 text-sm text-slate-500">
              <span>已過 {{ elapsedMinutes }} 分</span>
              <span class="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span>剩餘 {{ remainingMinutes }} 分</span>
            </div>
          </div>

          <div class="relative mx-auto aspect-square w-full max-w-[320px]">
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="relative m-auto h-full w-full max-h-[280px] max-w-[280px] overflow-hidden rounded-full">
                <ThreeBreathingSphere class="absolute inset-0 h-full w-full" />
              </div>
              <svg class="pointer-events-none absolute h-[280px] w-[280px]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(148,163,184,.25)" stroke-width="2" />
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="#34d399"
                  stroke-width="2"
                  stroke-linecap="round"
                  pathLength="100"
                  :style="{
                    strokeDasharray: 100,
                    strokeDashoffset: 100 - (progress * 100),
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%'
                  }"
                />
              </svg>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              class="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500/90 hover:shadow-xl active:scale-[0.98]"
              @click="handlePrimaryAction"
            >
              {{ primaryActionLabel }}
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600"
              @click="handleReset"
            >
              重新開始
            </button>
            <button
              type="button"
              class="rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
              @click="handleStop"
            >
              提早結束
            </button>
          </div>

          <p class="text-center text-sm leading-relaxed text-slate-500">
            {{ affirmation }}
          </p>
        </article>

        <aside class="space-y-6">
          <div class="space-y-5 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/30 backdrop-blur-sm">
            <header class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-slate-800">專注摘要</h2>
                <p class="text-xs text-slate-500">掌握當前節奏，隨時調整</p>
              </div>
              <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">完成 {{ completedPercent }}%</span>
            </header>

            <div class="space-y-4 text-sm text-slate-600">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">總時長</span>
                <span class="font-semibold text-slate-900">{{ resolvedMinutes }} 分鐘</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">建議休息</span>
                <span class="font-semibold text-slate-900">{{ resolvedBreak }} 分鐘</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-slate-500">背景音樂</span>
                <span class="text-sm font-semibold text-slate-900">{{ selectedAmbient.label }}</span>
                <span class="text-xs leading-relaxed text-slate-500">{{ selectedAmbient.description }}</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full rounded-full bg-emerald-400 transition-all"
                  :style="{ width: `${completedPercent}%` }"
                ></div>
              </div>
            </div>
          </div>

          <div class="space-y-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-lg shadow-slate-200/20">
            <h3 class="text-base font-semibold text-slate-800">休息暖身清單</h3>
            <p class="text-xs text-slate-500">計時結束後，記得留給自己 {{ resolvedBreak }} 分鐘的小歇。</p>
            <ul class="space-y-2 text-sm leading-relaxed text-slate-600">
              <li
                v-for="idea in microBreakIdeas"
                :key="idea"
                class="flex items-start gap-2"
              >
                <span class="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>{{ idea }}</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>
