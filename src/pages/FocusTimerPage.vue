<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiButton, UiCard, UiSpinner } from '@/components/ui'
import ThreeBreathingSphere from '@/components/ThreeBreathingSphere.vue'
import { useSessions } from '@/stores/useSessions'
import { findIntentById, findAmbientById } from '@/config/sessionPresets'
import { useAiCoach } from '@/stores/useAiCoach'
import type { FocusSessionContext } from '@/api/encouragement'
import { postAchievement } from '@/api/posts'
import { useAuth } from '@/stores/useAuth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import EncouragementGenerator from '@/components/ai/EncouragementGenerator.vue'
import SupportImageGenerator from '@/components/ai/SupportImageGenerator.vue'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const sessions = useSessions()
const auth = useAuth()
const { pushLogin } = useLoginRedirect()
const { toast } = useToast()

const aiCoach = useAiCoach()
aiCoach.init()

const state = ref<'running' | 'finished'>('running')
const activeTitle = ref('專注任務')
const minutesPlanned = ref(25)
const remainingSeconds = ref(0)
const startedAtMs = ref<number | null>(null)
const deadlineMs = ref<number | null>(null)
const lastSession = ref<{
  title: string
  minutesPlanned: number
  minutesActual: number
  startedAt: number
  finishedAt: number
} | null>(null)
const logging = ref(false)
const errorMessage = ref('')
const shareMessage = ref('')
const shareError = ref('')
const shareStatus = ref<'idle' | 'success' | 'error'>('idle')
const sharing = ref(false)
let timerHandle: number | null = null
const spherePaletteIndex = ref(0)
const BREATHING_PALETTE_STEPS = 5
const prefersReducedMotion = ref(false)

const selectedIntent = computed(() => findIntentById(route.query.intent as string | null))
const selectedAmbient = computed(() => findAmbientById(route.query.ambient as string | null))
const breakMinutes = computed(() => {
  const raw = Number(route.query.break)
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw)
  return selectedIntent.value?.suggestedBreak ?? 5
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
    window.clearInterval(timerHandle)
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

function armTimer() {
  if (timerHandle !== null || deadlineMs.value == null) return
  updateRemaining()
  timerHandle = window.setInterval(updateRemaining, 1000)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    updateRemaining()
    armTimer()
  } else {
    clearTimer()
  }
}

function startCountdownFromRoute() {
  clearTimer()
  const minutesParam = Number(route.query.m)
  if (!Number.isFinite(minutesParam) || minutesParam <= 0) {
    router.replace({ name: 'setup' }).catch(() => {})
    return false
  }
  minutesPlanned.value = Math.min(600, Math.max(1, Math.round(minutesParam)))
  const titleParam = (route.query.title as string | undefined)?.trim()
  activeTitle.value = titleParam && titleParam.length ? titleParam : (selectedIntent.value?.name ?? '專注任務')
  startedAtMs.value = Date.now()
  deadlineMs.value = startedAtMs.value + minutesPlanned.value * 60_000
  remainingSeconds.value = minutesPlanned.value * 60
  lastSession.value = null
  errorMessage.value = ''
  armTimer()
  return true
}

function cycleSpherePalette() {
  if (state.value !== 'running' || prefersReducedMotion.value) return
  spherePaletteIndex.value = (spherePaletteIndex.value + 1) % BREATHING_PALETTE_STEPS
}

onMounted(() => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const handleMotionPreference = () => {
    prefersReducedMotion.value = mediaQuery.matches
  }
  handleMotionPreference()
  mediaQuery.addEventListener('change', handleMotionPreference)

  sessions.listenMine().catch(() => {})
  const ready = startCountdownFromRoute()
  if (ready) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  onBeforeUnmount(() => {
    mediaQuery.removeEventListener('change', handleMotionPreference)
  })
})

onBeforeUnmount(() => {
  clearTimer()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

async function completeSession(options: { finishedEarly?: boolean } = {}) {
  if (state.value !== 'running' || !startedAtMs.value) return
  clearTimer()
  remainingSeconds.value = 0
  const finishedAt = Date.now()
  deadlineMs.value = finishedAt
  state.value = 'finished'

  const minutesActual = Math.max(1, Math.round((finishedAt - startedAtMs.value) / 60_000))
  const finishedEarly = Boolean(options.finishedEarly)
  const payload = {
    title: activeTitle.value,
    minutesPlanned: minutesPlanned.value,
    startedAt: startedAtMs.value,
    finishedAt,
  }

  const sessionContext: FocusSessionContext = {
    title: payload.title,
    minutesPlanned: payload.minutesPlanned,
    minutesActual,
    startedAt: payload.startedAt,
    finishedAt,
    finishedEarly,
  }

  if (selectedIntent.value) {
    sessionContext.intent = {
      id: selectedIntent.value.id,
      name: selectedIntent.value.name,
      description: selectedIntent.value.description,
      affirmation: selectedIntent.value.affirmation,
    }
  }

  if (selectedAmbient.value) {
    sessionContext.ambient = {
      id: selectedAmbient.value.id,
      label: selectedAmbient.value.label,
      description: selectedAmbient.value.description,
    }
  }

  logging.value = true
  errorMessage.value = ''
  try {
    await sessions.logCompletion(payload)
    lastSession.value = {
      title: payload.title,
      minutesPlanned: payload.minutesPlanned,
      minutesActual,
      startedAt: payload.startedAt,
      finishedAt,
    }
    shareMessage.value = `分享我的專注紀錄：${payload.title}`
    shareStatus.value = 'idle'
    shareError.value = ''
    aiCoach.generateForSession(sessionContext, { locale: 'zh' }).catch(() => {})
  } catch (err: any) {
    const message = err?.message ?? String(err)
    errorMessage.value = message
    toast.error('無法儲存本次專注', { description: message })
  } finally {
    logging.value = false
  }
}

function finishNow() {
  completeSession({ finishedEarly: true })
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

async function shareToWall() {
  if (!lastSession.value) return
  if (!shareMessage.value.trim()) {
    shareError.value = '分享前請先寫幾句話。'
    return
  }
  if (!auth.isAuthed) {
    await pushLogin('share').catch(() => {})
    return
  }
  if (sharing.value) return
  sharing.value = true
  shareError.value = ''
  shareStatus.value = 'idle'
  try {
    await postAchievement({
      contentText: shareMessage.value,
      durationSec: Math.max(1, lastSession.value.minutesActual) * 60,
      finishedAt: lastSession.value.finishedAt,
    })
    shareStatus.value = 'success'
  } catch (err: any) {
    const message = err?.message ?? String(err)
    shareStatus.value = 'error'
    shareError.value = message
    toast.error('無法發佈分享', { description: message })
  } finally {
    sharing.value = false
  }
}

watch(() => lastSession.value?.title, (title) => {
  if (title) {
    shareMessage.value = `分享我的專注紀錄：${title}`
  }
})

watch(shareMessage, () => {
  if (shareStatus.value === 'success') {
    shareStatus.value = 'idle'
  }
  shareError.value = ''
})
</script>

<template>
  <div class="space-y-8">
    <header class="space-y-3 text-center motion-safe:animate-fade-up">
      <span class="badge mx-auto">專注計時</span>
      <h1 class="text-3xl font-semibold text-ink-900 sm:text-4xl">維持專注節奏，延續你的連勝。</h1>
      <p class="text-sm text-ink-500">
        專注時段結束後會自動儲存；保持此分頁在前景可確保倒數精準。
      </p>
    </header>

    <UiCard v-if="state === 'running'" class="space-y-8 motion-safe:animate-fade-scale">
      <template #header>
        進行中
      </template>

      <div class="space-y-2 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">目前標題</p>
        <h2 class="text-2xl font-semibold text-ink-900 sm:text-3xl">{{ activeTitle }}</h2>
        <p class="text-sm text-ink-500">預計 {{ minutesPlanned }} 分鐘</p>
      </div>

      <div class="mx-auto flex w-full max-w-xs flex-col items-center gap-6">
        <p class="font-mono text-5xl font-bold tracking-tight text-ink-900 sm:text-6xl">{{ formattedCountdown }}</p>
        <div
          class="relative aspect-square w-full cursor-pointer select-none text-brand-400/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          role="button"
          tabindex="0"
          aria-label="切換背景色盤"
          @click="cycleSpherePalette"
          @keydown.enter.prevent="cycleSpherePalette()"
          @keydown.space.prevent="cycleSpherePalette()"
        >
          <ThreeBreathingSphere class="h-full w-full will-change-transform" :palette-index="spherePaletteIndex" />
          <svg class="pointer-events-none absolute inset-0 h-full w-full text-current" viewBox="0 0 120 120">
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
        <p class="text-xs text-ink-400">按 Enter 或空白鍵切換色盤；若系統設定為減少動畫，效果會自動降低。</p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-4">
        <UiButton variant="primary" class="min-w-[8rem] justify-center" @click="finishNow">
          提前完成
        </UiButton>
        <UiButton variant="ghost" class="min-w-[8rem] justify-center" @click="cancelSession">
          取消本次專注
        </UiButton>
      </div>
    </UiCard>

    <div v-else class="space-y-6 motion-safe:animate-fade-up">
      <UiCard>
        <template #header>
          紀錄已儲存
        </template>
        <div class="space-y-4 text-left text-sm text-ink-600">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">摘要</p>
              <p class="mt-2 text-base font-semibold text-brand-700">{{ lastSession?.title ?? activeTitle }}</p>
              <p class="mt-1 text-sm text-brand-600">計畫 {{ minutesPlanned }} 分鐘 / 實際 {{ lastSession?.minutesActual ?? minutesPlanned }} 分鐘</p>
              <p v-if="lastSession" class="mt-2 text-xs text-brand-500">完成於 {{ new Date(lastSession.finishedAt).toLocaleString() }}</p>
            </div>
            <div class="rounded-2xl border border-ink-100 bg-white/80 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">休息建議</p>
              <p class="mt-2 text-base font-semibold text-ink-800">建議休息 {{ breakMinutes }} 分鐘</p>
              <p v-if="selectedAmbient" class="mt-1 text-xs text-ink-500">環境音軌：{{ selectedAmbient.label }}</p>
            </div>
          </div>

          <div v-if="logging" class="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-3 text-sm text-brand-600">
            <UiSpinner size="sm" />
            正在儲存紀錄…
          </div>

          <p v-if="errorMessage" class="text-xs text-rose-500">{{ errorMessage }}</p>
        </div>
      </UiCard>

      <UiCard>
        <template #header>
          分享至社群
        </template>
        <div class="space-y-4 text-left">
          <textarea
            v-model="shareMessage"
            rows="3"
            placeholder="這段專注完成了什麼？"
            class="field h-28 resize-none"
          ></textarea>
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
            <p>{{ auth.isAuthed ? '準備好就發佈，記得鼓勵且具體。' : '登入後即可分享至動態牆。' }}</p>
            <UiButton
              variant="primary"
              class="justify-center"
              :loading="sharing"
              :disabled="!shareMessage.trim()"
              @click="shareToWall"
            >
              {{ shareStatus === 'success' ? '已分享！' : '發佈分享' }}
            </UiButton>
          </div>
          <p v-if="shareError" class="text-xs text-rose-500">{{ shareError }}</p>
          <p v-else-if="shareStatus === 'success'" class="text-xs text-brand-600">已發布到動態牆，太棒了！</p>
        </div>
      </UiCard>

      <div class="grid gap-4 md:grid-cols-2">
        <EncouragementGenerator />
        <SupportImageGenerator />
      </div>

      <div class="flex flex-wrap items-center justify-center gap-4">
        <UiButton variant="primary" class="min-w-[8rem] justify-center" :disabled="logging" @click="startAnother">
          再開始一輪
        </UiButton>
        <UiButton variant="ghost" class="min-w-[8rem] justify-center" @click="goToDone">
          查看歷史紀錄
        </UiButton>
      </div>
    </div>
  </div>
</template>
