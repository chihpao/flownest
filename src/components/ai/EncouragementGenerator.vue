<template>
  <section class="space-y-4 rounded-2xl border border-emerald-100 bg-white/95 p-4 text-left shadow-lg shadow-emerald-100/60">
    <header class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-base font-semibold text-emerald-700">AI 鼓勵教練</h3>
        <p class="text-xs text-slate-500">專注結束後自動生成 1-2 句鼓勵，幫你整理心情。</p>
      </div>
      <button
        type="button"
        class="text-xs font-medium text-emerald-600 hover:text-emerald-500"
        @click="toggleHistory"
      >
        {{ showHistory ? '收合歷史' : '檢視歷史' }} ({{ historyCount }})
      </button>
    </header>

    <div class="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
      <div v-if="store.encouragementLoading" class="flex items-center gap-2 text-sm text-emerald-600">
        <span class="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500/40 border-t-transparent"></span>
        生成鼓勵中...
      </div>
      <div v-else-if="latest" class="space-y-2">
        <p class="text-sm font-semibold text-emerald-800 whitespace-pre-line">{{ displayText(latest) }}</p>
        <p class="text-[11px] text-emerald-500">提示摘要：{{ latest.prompt }}</p>
      </div>
      <div v-else class="text-sm text-emerald-600">
        專注完成後，AI 會自動為你準備一段溫柔的加油話。
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!store.hasSessionContext || store.encouragementLoading"
        @click="regenerate"
      >
        重新生成
      </button>
      <p class="text-xs text-slate-400">最近的專注資料會用來調整語氣與內容。</p>
    </div>

    <p v-if="store.encouragementError" class="text-xs text-rose-500">{{ store.encouragementError }}</p>

    <ul v-if="showHistory && history.length" class="space-y-2 text-xs text-slate-500">
      <li
        v-for="entry in history"
        :key="entry.id"
        class="rounded-xl border border-slate-200 bg-white/70 p-3"
      >
        <p class="font-semibold text-slate-700 whitespace-pre-line">{{ displayText(entry) }}</p>
        <p class="mt-1 text-[11px] text-slate-400">{{ formatDate(entry.createdAt) }} ・ 提示：「{{ entry.prompt }}」</p>
      </li>
    </ul>
    <p v-else-if="showHistory" class="text-xs text-slate-400">目前還沒有歷史紀錄。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAiCoach, type EncouragementEntry } from '@/stores/useAiCoach'

const store = useAiCoach()
store.init()

const showHistory = ref(false)

const latest = computed(() => store.latestEncouragement)
const history = computed(() => store.encouragementHistory.slice(1, 6))
const historyCount = computed(() => store.encouragementHistory.length)

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function displayText(entry: EncouragementEntry) {
  if (entry.locale === 'zh' && entry.translatedText) {
    return entry.translatedText
  }
  return entry.englishText
}

function toggleHistory() {
  showHistory.value = !showHistory.value
}

async function regenerate() {
  if (!store.hasSessionContext || store.encouragementLoading) return
  try {
    await store.regenerateEncouragement()
  } catch {
    // error already captured in store
  }
}
</script>
