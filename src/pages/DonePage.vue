<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { findIntentById, findAmbientById } from '@/config/sessionPresets'

const route = useRoute()
const router = useRouter()

const intent = computed(() => findIntentById(route.query.intent as string | null))
const ambient = computed(() => findAmbientById(route.query.ambient as string | null))

const focusedMinutes = computed(() => {
  const raw = Number(route.query.m)
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw)
  return intent.value.recommendedMinutes
})

const remainingMinutes = computed(() => {
  const raw = Number(route.query.remaining)
  if (Number.isFinite(raw) && raw >= 0) return Math.round(raw)
  return 0
})

const breakMinutes = computed(() => {
  const raw = Number(route.query.break)
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw)
  return intent.value.suggestedBreak
})

const nextAction = computed(() => (remainingMinutes.value > 0 ? '你提前結束了這回合，花點時間紀錄成果再調整節奏。' : '恭喜完成專注任務，趁著餘韻記下關鍵成果，為下一輪充電。'))

const handleRestart = () => {
  router.push('/setup')
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <section class="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-emerald-100 bg-white/90 p-8 shadow-xl shadow-emerald-100/50 backdrop-blur-sm">
      <header class="space-y-2 text-center">
        <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold tracking-[0.3em] text-emerald-600">SESSION COMPLETE</span>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">本輪專注完成 ✅</h1>
        <p class="text-base leading-relaxed text-slate-600">{{ nextAction }}</p>
      </header>

      <div class="grid gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 text-sm text-emerald-700 md:grid-cols-2">
        <div class="space-y-2">
          <h2 class="text-base font-semibold text-emerald-800">專注成果</h2>
          <p><span class="font-semibold">模式：</span>{{ intent.name }}</p>
          <p><span class="font-semibold">完成時間：</span>{{ focusedMinutes }} 分鐘</p>
          <p v-if="remainingMinutes > 0"><span class="font-semibold">尚餘：</span>{{ remainingMinutes }} 分鐘（已提前結束）</p>
        </div>
        <div class="space-y-2">
          <h2 class="text-base font-semibold text-emerald-800">恢復建議</h2>
          <p><span class="font-semibold">建議休息：</span>{{ breakMinutes }} 分鐘</p>
          <p><span class="font-semibold">音樂氛圍：</span>{{ ambient.label }}</p>
          <p class="text-xs leading-relaxed text-emerald-600">{{ ambient.description }}</p>
        </div>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-600">
        <p>
          想為下一輪排定新節奏嗎？回到設定頁面可重新挑選專注意圖、時長與音景，並持續累積自己的專注儀式。
        </p>
      </div>

      <PrimaryButton label="回到設定頁" @click="handleRestart" />
    </section>
  </main>
</template>
