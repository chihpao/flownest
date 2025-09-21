<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThreeBreathingSphere from '@/components/ThreeBreathingSphere.vue'
import { useSessions } from '@/stores/useSessions'
import { findIntentById, findAmbientById } from '@/config/sessionPresets'

const router = useRouter()
const route = useRoute()
const sessions = useSessions()

const state = ref<'running' | 'finished'>('running')
const activeTitle = ref('專注時段')
const minutesPlanned = ref(25)
const remainingSeconds = ref(0)
const startedAtMs = ref<number | null>(null)
const deadlineMs = ref<number | null>(null)
const lastSession = ref<{
  title: string
  minutesPlanned: number
  minutesActual: number
  finishedAt: number
} | null>(null)
const logging = ref(false)
const errorMessage = ref('')
let timerHandle: number | null = null

const selectedIntent = computed(() => findIntentById(route.query.intent as string | null))
const selectedAmbient = computed(() => findAmbientById(route.query.ambient as string | null))
const breakMinutes = computed(() => {
  const raw = Number(route.query.break)
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw)
  return selectedIntent.value.suggestedBreak
})

const formattedCountdown = computed(() => {
  const total = Math.max(0, remainingSeconds.value)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const progressPercent = computed(() => {
  if (state.value !== 'running') return 100
  const total = minutesPlanned.value * 60
  if (!total) return 0
  const elapsed = total - remainingSeconds.value
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
})

function clearTimer() {
  if (timerHandle !== null) {
    clearInterval(timerHandle)
    timerHandle = null
  }
}

function updateRemaining() {
  if (deadlineMs.value == null) return
  const diff = deadlineMs.value - Date.now()
  remainingSeconds.value = Math.max(0, Math.ceil(diff / 1000))
  if (diff <= 0) {
    completeSession()
  }
}

function startCountdownFromRoute() {
  const minutesParam = Number(route.query.m)
  if (!Number.isFinite(minutesParam) || minutesParam <= 0) {
    router.replace({ name: 'setup' }).catch(() => {})
    return false
  }
  minutesPlanned.value = Math.min(600, Math.max(1, Math.round(minutesParam)))
  const titleParam = (route.query.title as string | undefined)?.trim()
  activeTitle.value = titleParam && titleParam.length ? titleParam : (selectedIntent.value?.name ?? '專注時段')
  startedAtMs.value = Date.now()
  deadlineMs.value = startedAtMs.value + minutesPlanned.value * 60_000
  remainingSeconds.value = minutesPlanned.value * 60
  lastSession.value = null
  errorMessage.value = ''
  state.value = 'running'
  updateRemaining()
  clearTimer()
  timerHandle = window.setInterval(updateRemaining, 1000)
  return true
}

onMounted(() => {
  sessions.listenMine().catch(() => {})
  startCountdownFromRoute()
})

onBeforeUnmount(() => {
  clearTimer()
})

async function completeSession() {
  if (state.value !== 'running' || !startedAtMs.value) return
  clearTimer()
  remainingSeconds.value = 0
  const finishedAt = Date.now()
  deadlineMs.value = finishedAt
  state.value = 'finished'

  const minutesActual = Math.max(1, Math.round((finishedAt - startedAtMs.value) / 60_000))
  const payload = {
    title: activeTitle.value,
    minutesPlanned: minutesPlanned.value,
    startedAt: startedAtMs.value,
    finishedAt,
  }

  logging.value = true
  errorMessage.value = ''
  try {
    await sessions.logCompletion(payload)
    lastSession.value = {
      title: payload.title,
      minutesPlanned: payload.minutesPlanned,
      minutesActual,
      finishedAt,
    }
  } catch (err: any) {
    errorMessage.value = err?.message ?? String(err)
  } finally {
    logging.value = false
  }
}

function finishNow() {
  completeSession()
}

function cancelSession() {
  clearTimer()
  router.push({ name: 'setup' }).catch(() => {})
}

function startAnother() {
  router.push({ name: 'setup' }).catch(() => {})
}

function goToDone() {
  router.push({ name: 'done' }).catch(() => {})
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-emerald-50 via-sky-50 to-white px-4 pb-24 pt-[env(safe-area-inset-top)] text-slate-900 sm:px-6">
    <section class="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <header class="space-y-2 text-center">
        <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">專注倒數</span>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">安排好目標，然後專心完成它</h1>
        <p class="text-sm text-slate-500">
          倒數結束時會自動紀錄成果；未登入時紀錄會暫存於瀏覽器，登入後自動同步到帳號。
        </p>
      </header>

      <div v-if="state === 'running'" class="space-y-8 rounded-3xl border border-emerald-100 bg-white/95 p-8 shadow-xl shadow-emerald-200/60 backdrop-blur-sm">
        <div class="flex flex-col items-center gap-2 text-center">
          <p class="text-xs uppercase tracking-[0.3em] text-emerald-500">目前進行中</p>
          <h2 class="text-2xl font-semibold text-slate-900 sm:text-3xl">{{ activeTitle }}</h2>
          <p class="text-sm text-slate-500">{{ minutesPlanned }} 分鐘專注</p>
        </div>

        <div class="mx-auto flex w-full max-w-sm flex-col items-center gap-6">
          <p class="font-mono text-5xl font-bold tracking-tight text-slate-900">{{ formattedCountdown }}</p>
          <div class="relative w-full">
            <ThreeBreathingSphere class="w-full" />
            <svg class="pointer-events-none absolute inset-0 h-full w-full text-emerald-300/70" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(15, 118, 110, 0.12)" stroke-width="4" />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                stroke-width="4"
                stroke-linecap="round"
                pathLength="100"
                :style="{ strokeDasharray: 100, strokeDashoffset: Math.max(0, 100 - progressPercent) }"
                transform="rotate(-90 60 60)"
              />
            </svg>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            class="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
            @click="finishNow"
          >
            提早完成
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            @click="cancelSession"
          >
            取消本次專注
          </button>
        </div>
      </div>

      <div v-else class="space-y-6 rounded-3xl border border-emerald-100 bg-white/95 p-8 text-center shadow-xl shadow-emerald-200/60 backdrop-blur-sm">
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold text-emerald-600">完成一次專注！</h2>
          <p class="text-sm text-slate-500">
            紀錄已保存{{ sessions.isGuest ? '在瀏覽器中' : '到你的帳號' }}。你可以立即再來一輪或前往成果頁檢視完整紀錄。
          </p>
        </div>

        <div v-if="lastSession" class="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-left text-sm text-emerald-700">
          <p class="text-base font-semibold text-emerald-700">{{ lastSession.title }}</p>
          <p>計畫：{{ lastSession.minutesPlanned }} 分鐘 · 實際：{{ lastSession.minutesActual }} 分鐘</p>
          <p class="text-xs text-emerald-600/90">完成時間：{{ new Date(lastSession.finishedAt).toLocaleString() }}</p>
          <p class="text-xs text-emerald-600/90" v-if="selectedAmbient">音景：{{ selectedAmbient.label }}</p>
          <p class="text-xs text-emerald-600/90">建議休息：{{ breakMinutes }} 分鐘</p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            class="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
            :disabled="logging"
            @click="startAnother"
          >
            再來一輪
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            @click="goToDone"
          >
            查看成果紀錄
          </button>
        </div>

        <p v-if="errorMessage" class="text-xs text-rose-500">{{ errorMessage }}</p>
      </div>
    </section>
  </main>
</template>
