<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { useSessions } from '@/stores/useSessions'

const router = useRouter()
const sessions = useSessions()

onMounted(() => {
  sessions.listenMine().catch(() => {})
})

const displaySessions = computed(() => {
  return sessions.items.map((item) => {
    const finishedAt = toMillis(item.finishedAt)
    const startedAt = toMillis(item.startedAt)
    return {
      id: item.id,
      title: item.title,
      minutesPlanned: item.minutesPlanned,
      minutesActual: item.minutesActual,
      startedAt,
      finishedAt,
      finishedLabel: finishedAt ? new Date(finishedAt).toLocaleString() : '—',
      durationLabel: `${item.minutesActual} 分鐘`,
      source: item.source,
    }
  })
})

function toMillis(value: any): number | null {
  if (!value) return null
  if (typeof value === 'number') return value
  if (typeof value.toMillis === 'function') {
    try {
      return value.toMillis()
    } catch {
      return null
    }
  }
  return null
}

function startAnother() {
  router.push({ name: 'timer' }).catch(() => {})
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <section class="mx-auto w-full max-w-4xl space-y-6 rounded-3xl border border-emerald-100 bg-white/90 p-8 shadow-xl shadow-emerald-100/50 backdrop-blur-sm">
      <header class="space-y-2 text-center">
        <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold tracking-[0.25em] text-emerald-600">FOCUS JOURNAL</span>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">你的專注成果紀錄</h1>
        <p class="text-sm text-slate-600">
          {{ sessions.isGuest ? '目前以體驗模式保存，登入後會自動同步到帳號。' : '已與帳號同步，跨裝置都能看到最新紀錄。' }}
        </p>
      </header>

      <div v-if="displaySessions.length === 0" class="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-center text-sm text-emerald-700">
        <p>尚未建立任何專注紀錄。</p>
        <PrimaryButton label="開始第一段專注" @click="startAnother" class="mx-auto" />
      </div>

      <div v-else class="space-y-6">
        <ul class="space-y-4">
          <li
            v-for="session in displaySessions"
            :key="session.id"
            class="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-slate-900">{{ session.title }}</h2>
                <p class="text-xs text-slate-500">完成於 {{ session.finishedLabel }}</p>
              </div>
              <div class="flex flex-wrap gap-2 text-sm text-slate-600">
                <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{{ session.durationLabel }}</span>
                <span class="rounded-full bg-slate-100 px-3 py-1">計畫 {{ session.minutesPlanned }} 分鐘</span>
                <span class="rounded-full bg-slate-100 px-3 py-1">
                  {{ session.source === 'guest' ? '本機紀錄' : '雲端同步' }}
                </span>
              </div>
            </div>
          </li>
        </ul>

        <div class="flex justify-center">
          <PrimaryButton label="再開始一段專注" @click="startAnother" />
        </div>
      </div>
    </section>
  </main>
</template>
