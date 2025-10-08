<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NumberCard from '@/components/stats/NumberCard.vue'
import PieChart from '@/components/stats/PieChart.vue'
import TrendChart from '@/components/stats/TrendChart.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { useSessions } from '@/stores/useSessions'
import {
  sumMinutes,
  countByDuration,
  groupByDay,
  groupByWeek,
  formatters,
  sessionStatsHelpers,
} from '@/utils/sessionsStats'

const router = useRouter()
const sessions = useSessions()

onMounted(() => {
  sessions.listenMine().catch(() => {})
})

const totalSessions = computed(() => sessions.items.length)
const totalMinutes = computed(() => sumMinutes(sessions.items))
const totalMinutesLabel = computed(() => formatters.minutesToHoursLabel(totalMinutes.value))
const durationSlices = computed(() => {
  return countByDuration(sessions.items).map((entry) => ({
    label: `${entry.minutes} 分鐘`,
    value: entry.count,
  }))
})

const averageMinutes = computed(() => {
  return totalSessions.value ? Math.round(totalMinutes.value / totalSessions.value) : 0
})

const lastSevenDays = computed(() => {
  return groupByDay(sessions.items).slice(-7).map((entry) => ({
    label: formatters.dayLabel(entry.date),
    value: entry.minutes,
  }))
})

const recentWeeks = computed(() => {
  return groupByWeek(sessions.items).slice(-6).map((entry) => ({
    label: formatters.weekLabel(entry.week),
    value: entry.minutes,
  }))
})

const latestDescription = computed(() => {
  const latest = sessions.latestSession
  if (!latest) return '最近尚無完成紀錄'
  const millis = sessionStatsHelpers.toMillis(latest.finishedAt)
  if (!millis) return '最近尚無完成紀錄'
  return `最近一筆完成於 ${new Date(millis).toLocaleString()}`
})

function goToTimer() {
  router.push({ name: 'timer' }).catch(() => {})
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4 pb-20">
    <section class="mx-auto w-full max-w-6xl space-y-10">
      <header class="space-y-3 text-center">
        <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold tracking-[0.3em] text-emerald-600">個人儀表板</span>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">我的專注紀錄</h1>
        <p class="text-sm text-slate-500">
          {{ sessions.isGuest ? '目前顯示的是保存在本機的成果，登入後會自動同步至雲端。' : '紀錄已同步至雲端，可在任何裝置上延續你的專注節奏。' }}
        </p>
        <p v-if="sessions.error" class="text-xs text-rose-500">{{ sessions.error }}</p>
      </header>

      <div v-if="totalSessions === 0" class="space-y-4 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-8 text-center text-sm text-emerald-700">
        <p>尚未開始任何專注計時。啟動第一段專注，為自己累積穩定的節奏。</p>
        <PrimaryButton label="前往專注計時" class="mx-auto" @click="goToTimer" />
      </div>

      <template v-else>
        <div class="grid gap-6 md:grid-cols-3">
          <NumberCard
            label="完成次數"
            :value="`${totalSessions}`"
            :description="latestDescription"
          />
          <NumberCard
            label="累計專注時間"
            :value="totalMinutesLabel"
            :description="`共 ${totalMinutes} 分鐘`"
          />
          <NumberCard
            label="平均每次專注"
            :value="`${averageMinutes} 分鐘`"
            description="專注節奏越穩定，累積越快"
          />
        </div>

        <div class="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <PieChart :data="durationSlices" />
          <TrendChart title="最近 6 週總專注分鐘" :points="recentWeeks" />
        </div>

        <div class="rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-lg shadow-emerald-100/40">
          <h2 class="text-lg font-semibold text-slate-900">最近 7 天專注趨勢（分鐘）</h2>
          <div v-if="lastSevenDays.length" class="mt-4 grid gap-3 md:grid-cols-2">
            <div
              v-for="day in lastSevenDays"
              :key="day.label"
              class="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600"
            >
              <span>{{ day.label }}</span>
              <span class="font-semibold text-emerald-600">{{ Math.round(day.value) }} 分鐘</span>
            </div>
          </div>
          <p v-else class="mt-4 text-xs text-slate-400">最近七天沒有專注紀錄。</p>
        </div>
      </template>
    </section>
  </main>
</template>

