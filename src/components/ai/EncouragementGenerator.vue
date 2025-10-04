<template>
  <section class="space-y-4 rounded-2xl border border-emerald-100 bg-white/95 p-4 text-left shadow-lg shadow-emerald-100/60">
    <header class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-base font-semibold text-emerald-700">AI 鼓勵教練</h3>
        <p class="text-xs text-slate-500">輸入你目前的狀態，獲得 1-2 句量身鼓勵，支援中英輸出。</p>
      </div>
      <button
        type="button"
        class="text-xs font-medium text-emerald-600 hover:text-emerald-500"
        @click="toggleHistory"
      >
        {{ showHistory ? '隱藏歷史' : '檢視歷史' }} ({{ historyCount }})
      </button>
    </header>

    <form class="space-y-3" @submit.prevent="submit">
      <textarea
        v-model="prompt"
        rows="3"
        @input="handleInput"
        class="w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        placeholder="例：完成 25 分鐘專注後，我想聽一句肯定與提醒。"
      ></textarea>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label class="flex items-center gap-2 text-xs text-slate-500">
          <span>輸出語言</span>
          <select
            v-model="locale"
            @change="handleInput"
            class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
          >
            <option value="zh">繁體中文</option>
            <option value="en">English</option>
          </select>
        </label>
        <div class="flex flex-1 items-center gap-2 sm:justify-end">
          <button
            type="submit"
            class="ml-auto inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="store.encouragementLoading || !promptReady"
          >
            <span v-if="store.encouragementLoading" class="flex items-center gap-2">
              <span class="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
              生成中...
            </span>
            <span v-else>生成鼓勵</span>
          </button>
        </div>
      </div>
    </form>

    <p v-if="store.encouragementError" class="text-xs text-rose-500">{{ store.encouragementError }}</p>

    <div v-if="latest" class="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
      <p class="text-sm font-semibold text-emerald-800 whitespace-pre-line">{{ displayText(latest) }}</p>
    </div>

    <ul v-if="showHistory && history.length" class="space-y-2 text-xs text-slate-500">
      <li
        v-for="entry in history"
        :key="entry.id"
        class="rounded-xl border border-slate-200 bg-white/70 p-3"
      >
        <p class="font-semibold text-slate-700">{{ displayText(entry) }}</p>
        <p class="mt-1 text-[11px] text-slate-400">{{ formatDate(entry.createdAt) }} ・ 提示：「{{ entry.prompt }}」</p>
      </li>
    </ul>
    <p v-else-if="showHistory" class="text-xs text-slate-400">暫無歷史紀錄。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAiCoach, type EncouragementEntry } from '@/stores/useAiCoach'

const store = useAiCoach()
store.init()

const prompt = ref('完成 25 分鐘專注後，請給我一句回饋與提醒')
const locale = ref<'zh' | 'en'>('zh')
const showHistory = ref(false)

const promptReady = computed(() => prompt.value.trim().length > 3)
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
  if (locale.value === 'zh' && entry.translatedText) {
    return entry.translatedText
  }
  return entry.englishText
}

function toggleHistory() {
  showHistory.value = !showHistory.value
}

function handleInput() {
  if (store.encouragementError) {
    store.clearEncouragementError()
  }
}

async function submit() {
  if (!promptReady.value) return
  await store.requestEncouragement({ prompt: prompt.value.trim(), locale: locale.value })
}
</script>
