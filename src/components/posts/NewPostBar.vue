<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { postAchievement } from '@/api/posts'
import { useAuth } from '@/stores/useAuth'
import { useSessions } from '@/stores/useSessions'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { sessionStatsHelpers } from '@/utils/sessionsStats'

const emit = defineEmits<{ posted: [string] }>()

const auth = useAuth()
const sessions = useSessions()
const { pushLogin } = useLoginRedirect()
const content = ref('')
const busy = ref(false)
const error = ref('')
const selectedSessionId = ref<string>('')

const isAuthed = computed(() => auth.isAuthed)
const hasSessions = computed(() => sessionOptions.value.length > 0)

const selectedSession = computed(() => {
  if (!selectedSessionId.value) return null
  return sessions.items.find((item) => item.id === selectedSessionId.value) ?? null
})

watch(content, () => {
  if (error.value) error.value = ''
})

watch(selectedSessionId, () => {
  if (error.value) error.value = ''
})

const sessionOptions = computed(() => {
  return sessions.items
    .slice()
    .map((item) => {
      const finishedAt = sessionStatsHelpers.toMillis(item.finishedAt)
      const finishedLabel = finishedAt ? new Date(finishedAt).toLocaleString() : '尚未完成'
      return {
        id: item.id,
        title: item.title,
        minutes: item.minutesActual || item.minutesPlanned,
        finishedLabel,
      }
    })
})

watch(sessionOptions, (options) => {
  if (!options.length) {
    selectedSessionId.value = ''
    return
  }
  const exists = options.some((option) => option.id === selectedSessionId.value)
  if (!exists) {
    selectedSessionId.value = options[0]?.id ?? ''
  }
}, { immediate: true })

onMounted(() => {
  if (!sessions.items.length) {
    sessions.listenMine().catch(() => {})
  }
})

async function handleSubmit() {
  if (!isAuthed.value) {
    await pushLogin('share').catch(() => {})
    return
  }

  const text = content.value.trim()
  if (!text) {
    error.value = '請先寫下想分享的想法或內容。'
    return
  }

  busy.value = true
  try {
    const target = selectedSession.value
    const durationSec = target ? Math.max(1, Math.round(target.minutesActual || target.minutesPlanned || 0)) * 60 : undefined
    const finishedAt = target ? sessionStatsHelpers.toMillis(target.finishedAt) ?? undefined : undefined

    const { postId } = await postAchievement({
      contentText: text,
      imageUrl: null,
      durationSec,
      finishedAt,
    })
    content.value = ''
    emit('posted', postId)
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-xl shadow-emerald-100/60">
    <template v-if="isAuthed">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-slate-900">分享你的專注腳步</h2>
          <p class="mt-1 text-xs text-slate-500">挑選想公開的成果，也可以補充心情或重點。</p>
        </div>
        <span v-if="selectedSession" class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
          選擇：{{ selectedSession.title }}
        </span>
      </div>

      <div class="mt-4 space-y-3">
        <div
          v-if="hasSessions"
          class="max-h-56 space-y-2 overflow-y-auto pr-1"
        >
          <label
            v-for="option in sessionOptions"
            :key="option.id"
            class="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/60"
          >
            <input
              v-model="selectedSessionId"
              type="radio"
              :value="option.id"
              class="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
            />
            <div class="flex-1">
              <p class="font-semibold text-slate-800">{{ option.title }}</p>
              <p class="text-xs text-slate-500">{{ option.minutes }} 分鐘 · 完成於 {{ option.finishedLabel }}</p>
            </div>
          </label>
        </div>
        <div
          v-else
          class="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-600"
        >
          尚無可分享的專注紀錄，先到計時頁完成一段專注再回來吧！
        </div>

        <textarea
          v-model="content"
          rows="3"
          placeholder="想說的話（可選填）..."
          class="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        ></textarea>
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <p>系統會自動帶入每段成果的摘要與完成時間。</p>
        <PrimaryButton class="w-auto" :disabled="busy" label="發布" @click="handleSubmit" />
      </div>
      <p v-if="error" class="mt-2 text-xs text-rose-500">{{ error }}</p>
    </template>

    <div v-else class="flex flex-col items-center gap-3 text-center text-sm text-slate-600">
      <h2 class="text-base font-semibold text-slate-900">登入後即可分享</h2>
      <p class="max-w-xs text-xs text-slate-500">
        記錄你的專注成果、加上一句話鼓勵社群。登入之後即可挑選專注成果快速發布。
      </p>
      <PrimaryButton label="立即登入" class="w-auto" @click="() => pushLogin('share').catch(() => {})" />
    </div>
  </div>
</template>
