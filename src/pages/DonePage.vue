<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PrimaryButton from '@/components/PrimaryButton.vue'
import NumberCard from '@/components/stats/NumberCard.vue'
import PieChart from '@/components/stats/PieChart.vue'
import TrendChart from '@/components/stats/TrendChart.vue'
import { useSessions } from '@/stores/useSessions'
import {
  sumMinutes,
  countByDuration,
  groupByDay,
  groupByWeek,
  formatters,
  sessionStatsHelpers,
} from '@/utils/sessionsStats'

type ViewMode = 'dashboard' | 'list'

const router = useRouter()
const sessions = useSessions()
const viewMode = ref<ViewMode>('dashboard')

onMounted(() => {
  sessions.listenMine().catch(() => {})
})

const totalSessions = computed(() => sessions.items.length)
const totalMinutes = computed(() => sumMinutes(sessions.items))
const totalMinutesLabel = computed(() => formatters.minutesToHoursLabel(totalMinutes.value))
const averageMinutes = computed(() => (totalSessions.value ? Math.round(totalMinutes.value / totalSessions.value) : 0))

const durationSlices = computed(() => countByDuration(sessions.items).map((entry) => ({
  label: `${entry.minutes} 分鐘`,
  value: entry.count,
})))

const lastSevenDays = computed(() => groupByDay(sessions.items)
  .slice(-7)
  .map((entry) => ({
    label: formatters.dayLabel(entry.date),
    value: entry.minutes,
  })))

const recentWeeks = computed(() => groupByWeek(sessions.items)
  .slice(-6)
  .map((entry) => ({
    label: formatters.weekLabel(entry.week),
    value: entry.minutes,
  })))

const latestDescription = computed(() => {
  const latest = sessions.latestSession
  if (!latest) return '最近尚無完成紀錄'
  const millis = sessionStatsHelpers.toMillis(latest.finishedAt)
  if (!millis) return '最近尚無完成紀錄'
  return `最近一筆完成於 ${new Date(millis).toLocaleString()}`
})

const listSessions = computed(() => sessions.items.map((item) => {
  const finishedAt = sessionStatsHelpers.toMillis(item.finishedAt)
  return {
    id: item.id,
    title: item.title,
    minutesPlanned: item.minutesPlanned,
    minutesActual: item.minutesActual,
    finishedLabel: finishedAt ? new Date(finishedAt).toLocaleString() : '—',
    source: item.source,
  }
}))

const hasSessions = computed(() => totalSessions.value > 0)

function startAnother() {
  router.push({ name: 'timer' }).catch(() => {})
}

function setView(mode: ViewMode) {
  viewMode.value = mode
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <section class="mx-auto w-full max-w-5xl space-y-8 rounded-3xl border border-emerald-100 bg-white/90 p-8 shadow-xl shadow-emerald-100/50 backdrop-blur-sm">
      <header class="space-y-2 text-center">
        <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold tracking-[0.25em] text-emerald-600">FOCUS JOURNAL</span>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">你的專注成果紀錄</h1>
        <p class="text-sm text-slate-600">
          {{ sessions.isGuest ? '目前以體驗模式保存，登入後會自動同步到帳號。' : '已與帳號同步，跨裝置都能看到最新紀錄。' }}
        </p>
      </header>

      <div v-if="!hasSessions" class="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-center text-sm text-emerald-700">
        <p>尚未建立任何專注紀錄。</p>
        <PrimaryButton label="開始第一段專注" @click="startAnother" class="mx-auto" />
      </div>

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="inline-flex rounded-full border border-emerald-200 bg-emerald-50 p-1 text-sm text-emerald-600">
            <button
              type="button"
              class="rounded-full px-4 py-1.5 transition"
              :class="viewMode === 'dashboard' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-emerald-100'"
              @click="setView('dashboard')"
            >儀表板</button>
            <button
              type="button"
              class="rounded-full px-4 py-1.5 transition"
              :class="viewMode === 'list' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-emerald-100'"
              @click="setView('list')"
            >條列</button>
          </div>
          <PrimaryButton label="再開始一段專注" @click="startAnother" class="w-auto" />
        </div>

        <div v-if="viewMode === 'dashboard'" class="space-y-8">
          <div class="grid gap-6 md:grid-cols-3">
            <NumberCard label="完成次數" :value="`${totalSessions}`" :description="latestDescription" />
            <NumberCard label="累計專注時間" :value="totalMinutesLabel" :description="`共 ${totalMinutes} 分鐘`" />
            <NumberCard label="平均每次專注" :value="`${averageMinutes} 分鐘`" description="保持節奏，成效更穩定" />
          </div>

          <div class="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <PieChart :data="durationSlices" />
            <TrendChart title="最近 6 週總專注分鐘" :points="recentWeeks" />
          </div>

          <div class="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
            <h2 class="text-lg font-semibold text-emerald-700">最近 7 天專注趨勢（分鐘）</h2>
            <div v-if="lastSevenDays.length" class="mt-4 grid gap-3 md:grid-cols-2">
              <div
                v-for="day in lastSevenDays"
                :key="day.label"
                class="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-emerald-700"
              >
                <span>{{ day.label }}</span>
                <span class="font-semibold">{{ Math.round(day.value) }} 分鐘</span>
              </div>
            </div>
            <p v-else class="mt-4 text-xs text-emerald-500">最近七天沒有專注紀錄。</p>
          </div>
        </div>

        <div v-else class="space-y-6">
          <ul class="space-y-4">
            <li
              v-for="session in listSessions"
              :key="session.id"
              class="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm"
            >
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-slate-900">{{ session.title }}</h2>
                  <p class="text-xs text-slate-500">完成於 {{ session.finishedLabel }}</p>
                </div>
                <div class="flex flex-wrap gap-2 text-sm text-slate-600">
                  <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">實際 {{ session.minutesActual }} 分鐘</span>
                  <span class="rounded-full bg-slate-100 px-3 py-1">計畫 {{ session.minutesPlanned }} 分鐘</span>
                  <span class="rounded-full bg-slate-100 px-3 py-1">
                    {{ session.source === 'guest' ? '本機紀錄' : '雲端同步' }}
                  </span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </section>
  </main>
</template>
