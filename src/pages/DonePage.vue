<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
  if (!latest) return '最近尚未有專注紀錄'
  const millis = sessionStatsHelpers.toMillis(latest.finishedAt)
  if (!millis) return '最近尚未有專注紀錄'
  return `最近一筆紀錄完成於 ${new Date(millis).toLocaleString()}`
})

const listSessions = computed(() => sessions.items.map((item) => {
  const finishedAt = sessionStatsHelpers.toMillis(item.finishedAt)
  return {
    id: item.id,
    title: item.title,
    minutesPlanned: item.minutesPlanned,
    minutesActual: item.minutesActual,
    finishedLabel: finishedAt ? new Date(finishedAt).toLocaleString() : '時間未知',
    source: item.source,
  }
}))

const hasSessions = computed(() => totalSessions.value > 0)

function setView(mode: ViewMode) {
  viewMode.value = mode
}
</script>

<template>
  <main class="relative min-h-screen px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:px-6 lg:px-8">
    <div class="pointer-events-none absolute inset-x-0 top-12 -z-10 h-64 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_65%)]"></div>

    <section class="mx-auto flex w-full max-w-6xl flex-col gap-10">

      <div class="glass-panel animate-fade-scale space-y-8 p-6 sm:p-8">
        <div v-if="!hasSessions" class="space-y-3 text-center text-sm text-emerald-700">
          <p>尚未建立任何專注紀錄。</p>
          <p class="text-xs text-emerald-500">完成一段專注後就會自動累積在這裡，持續加油！</p>
        </div>

        <template v-else>
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="chip-toggle">
              <button
                type="button"
                class="rounded-full px-4 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                :class="viewMode === 'dashboard' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-white/90 hover:text-emerald-600'"
                @click="setView('dashboard')"
              >儀表板</button>
              <button
                type="button"
                class="rounded-full px-4 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                :class="viewMode === 'list' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-white/90 hover:text-emerald-600'"
                @click="setView('list')"
              >條列</button>
            </div>
            <span class="text-xs text-slate-500">{{ latestDescription }}</span>
          </div>

          <div v-if="viewMode === 'dashboard'" class="space-y-8">
            <div class="grid gap-6 md:grid-cols-3">
              <NumberCard label="完成次數" :value="`${totalSessions}`" :description="latestDescription" />
              <NumberCard label="累積專注時數" :value="totalMinutesLabel" :description="`共 ${totalMinutes} 分鐘`" />
              <NumberCard label="平均每次專注" :value="`${averageMinutes} 分鐘`" description="保持節奏，穩穩往前" />
            </div>

            <div class="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <PieChart :data="durationSlices" />
              <TrendChart title="最近 6 週總專注時數" :points="recentWeeks" />
            </div>

            <div class="glass-panel-soft">
              <h2 class="text-lg font-semibold text-emerald-700">最近 7 天專注趨勢</h2>
              <div v-if="lastSevenDays.length" class="mt-4 grid gap-3 md:grid-cols-2">
                <div
                  v-for="day in lastSevenDays"
                  :key="day.label"
                  class="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 text-sm text-emerald-700"
                >
                  <span>{{ day.label }}</span>
                  <span class="font-semibold">{{ Math.round(day.value) }} 分鐘</span>
                </div>
              </div>
              <p v-else class="mt-4 text-xs text-emerald-500">最近七天沒有專注紀錄</p>
            </div>
          </div>

          <div v-else class="space-y-5">
            <ul class="space-y-4">
              <li
                v-for="session in listSessions"
                :key="session.id"
                class="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div class="space-y-1">
                    <h2 class="text-lg font-semibold text-slate-900">{{ session.title }}</h2>
                    <p class="text-xs text-slate-500">完成於 {{ session.finishedLabel }}</p>
                  </div>
                  <div class="flex flex-wrap gap-2 text-sm text-slate-600">
                    <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">實際 {{ session.minutesActual }} 分鐘</span>
                    <span class="rounded-full bg-slate-100 px-3 py-1">計畫 {{ session.minutesPlanned }} 分鐘</span>
                    <span class="rounded-full bg-slate-100 px-3 py-1">
                      {{ session.source === 'guest' ? '暫存紀錄' : '雲端同步' }}
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </section>
  </main>
</template>




