<template>
  <section class="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 text-left shadow-lg shadow-emerald-50/40">
    <header class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-base font-semibold text-slate-700">AI 靈感圖像</h3>
        <p class="text-xs text-slate-500">依據本輪專注調性自動生成圖像，可搭配日記或分享使用。</p>
      </div>
      <button
        type="button"
        class="text-xs font-medium text-emerald-600 hover:text-emerald-500"
        @click="toggleHistory"
      >
        {{ showHistory ? '收合歷史' : '檢視歷史' }} ({{ historyCount }})
      </button>
    </header>

    <figure class="space-y-2">
      <div
        class="flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
      >
        <template v-if="store.imageLoading">
          <div class="flex items-center gap-2 text-sm text-emerald-600">
            <span class="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500/40 border-t-transparent"></span>
            生成圖像中...
          </div>
        </template>
        <template v-else-if="latest">
          <img :src="latest.imageBase64" alt="AI 鼓勵圖像" class="h-auto w-full object-cover" />
        </template>
        <template v-else>
          <p class="text-sm text-slate-500">完成專注後，這裡會出現一張專屬靈感圖。</p>
        </template>
      </div>
    </figure>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full border border-emerald-400 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!store.hasSessionContext || store.imageLoading"
        @click="regenerate"
      >
        重新生成
      </button>
      <p class="text-xs text-slate-400">圖像會根據任務標題、時長與專注意圖自動調整風格。</p>
    </div>

    <p v-if="store.imageError" class="text-xs text-rose-500">{{ store.imageError }}</p>

    <div v-if="showHistory && history.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <figure
        v-for="entry in history"
        :key="entry.id"
        class="space-y-1"
      >
        <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img :src="entry.imageBase64" :alt="`AI 圖像 ${formatDate(entry.createdAt)}`" class="h-28 w-full object-cover" />
        </div>
        <p class="text-[11px] text-slate-400 truncate">提示：{{ entry.prompt }}</p>
      </figure>
    </div>
    <p v-else-if="showHistory" class="text-xs text-slate-400">目前還沒有歷史紀錄。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAiCoach } from '@/stores/useAiCoach'

const store = useAiCoach()
store.init()

const showHistory = ref(false)

const latest = computed(() => store.latestImage)
const history = computed(() => store.supportImageHistory.slice(1, 6))
const historyCount = computed(() => store.supportImageHistory.length)

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function toggleHistory() {
  showHistory.value = !showHistory.value
}

async function regenerate() {
  if (!store.hasSessionContext || store.imageLoading) return
  try {
    await store.regenerateSupportImage()
  } catch {
    // error already captured in store
  }
}
</script>
