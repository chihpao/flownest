<template>
  <section class="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 text-left shadow-lg shadow-emerald-50/40">
    <header class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-base font-semibold text-slate-700">AI 靈感圖像</h3>
        <p class="text-xs text-slate-500">用一段描述生成療癒風格的圖片，可作為專注成果的分享背景。</p>
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
      <input
        v-model="prompt"
        type="text"
        @input="handleInput"
        class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        placeholder="例：柔和日出下的海邊，象徵嶄新開始"
      />
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label class="flex items-center gap-2 text-xs text-slate-500">
          <span>視覺風格</span>
          <select
            v-model="styleId"
            @change="handleInput"
            class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
          >
            <option v-for="opt in styleOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
          </select>
        </label>
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-full border border-emerald-400 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="store.imageLoading || !promptReady"
        >
          <span v-if="store.imageLoading" class="flex items-center gap-2">
            <span class="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500/60 border-t-transparent"></span>
            生成中...
          </span>
          <span v-else>生成圖片</span>
        </button>
      </div>
    </form>

    <p v-if="store.imageError" class="text-xs text-rose-500">{{ store.imageError }}</p>

    <figure v-if="latest" class="space-y-2">
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <img :src="latest.imageBase64" :alt="`AI 圖像 ${formatDate(latest.createdAt)}`" class="h-auto w-full object-cover" />
      </div>
    </figure>

    <div v-if="showHistory && history.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <figure
        v-for="entry in history"
        :key="entry.id"
        class="space-y-1"
      >
        <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img :src="entry.imageBase64" :alt="`過往生成 ${formatDate(entry.createdAt)}`" class="h-28 w-full object-cover" />
        </div>
      </figure>
    </div>
    <p v-else-if="showHistory" class="text-xs text-slate-400">暫無歷史紀錄。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAiCoach } from '@/stores/useAiCoach'

interface StyleOption {
  id: string
  label: string
  prompt?: string
  negative?: string
}

const styleOptions: StyleOption[] = [
  {
    id: 'soft-illustration',
    label: '療癒插畫',
    prompt: 'soft pastel illustration, gentle lighting, hopeful mood'
  },
  {
    id: 'ambient-gradient',
    label: '漸層光暈',
    prompt: 'ambient gradient backdrop, smooth bokeh glow, minimal, abstract'
  },
  {
    id: 'nature-photography',
    label: '自然寫真',
    prompt: 'sunrise nature photography, calm ocean breeze, inspiring mood'
  }
]

const store = useAiCoach()
store.init()

const prompt = ref('完成任務後的達成感，柔和日光灑落書桌')
const styleId = ref<string>(styleOptions[0].id)
const showHistory = ref(false)

const promptReady = computed(() => prompt.value.trim().length > 3)
const latest = computed(() => store.latestImage)
const history = computed(() => store.supportImageHistory.slice(1, 7))
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

function handleInput() {
  if (store.imageError) {
    store.clearImageError()
  }
}

async function submit() {
  if (!promptReady.value) return
  const selected = styleOptions.find((opt) => opt.id === styleId.value)
  const basePrompt = prompt.value.trim()
  const builder: string[] = [basePrompt]
  if (selected?.prompt) {
    builder.push(selected.prompt)
  }
  await store.requestSupportImage({
    prompt: builder.join(', '),
    negativePrompt: selected?.negative
  })
}
</script>
