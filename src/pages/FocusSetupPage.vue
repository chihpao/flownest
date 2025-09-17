<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TimePill from '@/components/TimePill.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import BgmControl from '@/components/BgmControl.vue'
import { useBgm } from '@/components/useBgm'
import {
  FOCUS_INTENTS,
  BREAK_OPTIONS,
  AMBIENT_TRACKS,
  findIntentById,
} from '@/config/sessionPresets'

const baseDurations = [15, 20, 25, 30, 45, 60, 90]

const selectedIntentId = ref(FOCUS_INTENTS[0].id)
const selectedDuration = ref(FOCUS_INTENTS[0].recommendedMinutes)
const customDuration = ref('')
const selectedBreak = ref(FOCUS_INTENTS[0].suggestedBreak)
const breakManuallyPicked = ref(false)
const selectedAmbientId = ref(AMBIENT_TRACKS[0].id)

const selectedIntent = computed(() => findIntentById(selectedIntentId.value))
const selectedAmbient = computed(() => {
  const track = AMBIENT_TRACKS.find((item) => item.id === selectedAmbientId.value)
  return track ?? AMBIENT_TRACKS[0]
})

const availableDurations = computed(() => {
  const set = new Set(baseDurations)
  set.add(selectedIntent.value.recommendedMinutes)
  return Array.from(set).sort((a, b) => a - b)
})

const availableBreaks = computed(() => {
  const set = new Set(BREAK_OPTIONS)
  set.add(selectedIntent.value.suggestedBreak)
  return Array.from(set).sort((a, b) => a - b)
})

const parsedCustom = computed(() => {
  if (customDuration.value.trim() === '') return null
  const n = Number(customDuration.value)
  if (!Number.isFinite(n)) return NaN
  return Math.min(600, Math.max(5, Math.round(n)))
})

const isCustomValid = computed(() => parsedCustom.value !== null && !Number.isNaN(parsedCustom.value))
const effectiveMinutes = computed<number | null>(() => {
  if (customDuration.value.trim() === '') {
    return selectedDuration.value
  }
  return isCustomValid.value ? parsedCustom.value : null
})
const canStart = computed(() => effectiveMinutes.value !== null)

const { isPlaying, play: playBgm, setSource } = useBgm()

const selectIntent = (id: string) => {
  if (selectedIntentId.value === id) return
  selectedIntentId.value = id
  const intent = findIntentById(id)
  selectedDuration.value = intent.recommendedMinutes
  if (!breakManuallyPicked.value) {
    selectedBreak.value = intent.suggestedBreak
  }
  customDuration.value = ''
}

const handleTimeSelect = (minutes: number) => {
  selectedDuration.value = minutes
  customDuration.value = ''
}

const handleBreakSelect = (minutes: number) => {
  selectedBreak.value = minutes
  breakManuallyPicked.value = true
}

const resetBreak = () => {
  breakManuallyPicked.value = false
  selectedBreak.value = selectedIntent.value.suggestedBreak
}

const handleAmbientSelect = async (id: string) => {
  if (selectedAmbientId.value === id) return
  selectedAmbientId.value = id
  const track = AMBIENT_TRACKS.find((item) => item.id === id)
  if (!track) return
  try {
    await setSource(track.url)
    if (isPlaying.value) {
      await playBgm()
    }
  } catch {}
}

const handleStart = async () => {
  const track = selectedAmbient.value
  try {
    await setSource(track.url)
    if (isPlaying.value) {
      await playBgm()
    }
  } catch {}
}

const startDestination = computed(() => {
  if (!canStart.value || effectiveMinutes.value === null) return null
  const query: Record<string, string> = {
    m: String(effectiveMinutes.value),
    intent: selectedIntent.value.id,
    break: String(selectedBreak.value),
    ambient: selectedAmbient.value.id,
  }
  if (isPlaying.value) {
    query.autoplay = '1'
  }
  return { path: '/timer', query }
})

onMounted(() => {
  setSource(selectedAmbient.value.url).catch(() => {})
})
</script>

<template>
  <main class="relative min-h-screen w-full bg-gradient-to-b from-white via-emerald-50/40 to-slate-50 p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <div class="absolute top-4 right-4 z-20">
      <BgmControl />
    </div>

    <section class="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header class="space-y-3 text-center">
        <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold tracking-[0.25em] text-emerald-600">Flow 模式</span>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">打造你的專注儀式</h1>
        <p class="mx-auto max-w-2xl text-base leading-relaxed text-slate-500">
          選擇目標、定義節奏，FlowNest 會在整個專注旅程中協助你維持最佳狀態。
        </p>
      </header>

      <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-6">
          <div class="space-y-5 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm">
            <header class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-slate-800">專注模式</h2>
                <p class="text-xs text-slate-500">依照任務挑選最適合的節奏</p>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{{ selectedIntent.name }}</span>
            </header>

            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="intent in FOCUS_INTENTS"
                :key="intent.id"
                type="button"
                class="rounded-2xl border p-4 text-left transition"
                :class="intent.id === selectedIntentId
                  ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
                  : 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow'
                "
                @click="selectIntent(intent.id)"
              >
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-semibold text-slate-800">{{ intent.name }}</h3>
                  <span class="text-xs font-semibold text-emerald-500">推薦 {{ intent.recommendedMinutes }} 分</span>
                </div>
                <p class="mt-2 text-sm leading-relaxed text-slate-500">{{ intent.description }}</p>
              </button>
            </div>
          </div>

          <div class="space-y-5 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm">
            <header class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-800">專注時長</h2>
              <span class="text-xs font-semibold text-slate-500">建議 {{ selectedIntent.recommendedMinutes }} 分鐘</span>
            </header>

            <div class="grid gap-3 sm:grid-cols-3">
              <div
                v-for="minutes in availableDurations"
                :key="minutes"
                class="relative"
              >
                <TimePill
                  :label="String(minutes)"
                  :active="customDuration.trim() === '' && selectedDuration === minutes"
                  @click="handleTimeSelect(minutes)"
                />
                <span
                  v-if="minutes === selectedIntent.recommendedMinutes"
                  class="absolute -right-2 -top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white"
                >推薦</span>
              </div>
            </div>

            <div class="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">自訂分鐘</label>
              <div class="mt-2 flex items-center gap-3">
                <input
                  v-model="customDuration"
                  type="number"
                  inputmode="numeric"
                  min="5"
                  max="600"
                  placeholder="輸入 5 - 600"
                  class="w-full rounded-full border border-emerald-200 bg-white px-4 py-2 text-center text-lg font-semibold text-emerald-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <span class="text-sm text-slate-500">分鐘</span>
              </div>
              <p class="mt-2 text-xs text-slate-500">
                {{ isCustomValid || customDuration.trim() === '' ? '設定一個舒適的專注長度，建議 25 - 90 分鐘。' : '請輸入 5 至 600 之間的整數分鐘。' }}
              </p>
            </div>
          </div>

          <div class="space-y-5 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm">
            <header class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-800">休息長度</h2>
              <button
                v-if="breakManuallyPicked"
                type="button"
                class="text-xs font-semibold text-emerald-500 underline-offset-2 hover:underline"
                @click="resetBreak"
              >
                套用推薦 {{ selectedIntent.suggestedBreak }} 分
              </button>
            </header>

            <div class="flex flex-wrap gap-3">
              <button
                v-for="minutes in availableBreaks"
                :key="minutes"
                type="button"
                class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                :class="minutes === selectedBreak
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-600 shadow'
                  : 'border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600'
                "
                @click="handleBreakSelect(minutes)"
              >
                {{ minutes }} 分
              </button>
            </div>
          </div>
        </div>

        <aside class="space-y-6">
          <div class="space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm">
            <header class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-800">背景音樂</h2>
              <span class="text-xs text-slate-500">搭配專注節奏的聲景</span>
            </header>
            <div class="space-y-3">
              <button
                v-for="track in AMBIENT_TRACKS"
                :key="track.id"
                type="button"
                class="w-full rounded-2xl border p-4 text-left transition"
                :class="track.id === selectedAmbientId
                  ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
                  : 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow'
                "
                @click="handleAmbientSelect(track.id)"
              >
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-semibold text-slate-800">{{ track.label }}</h3>
                  <span class="text-xs font-semibold text-emerald-500">選用</span>
                </div>
                <p class="mt-1 text-sm leading-relaxed text-slate-500">{{ track.description }}</p>
              </button>
            </div>
          </div>

          <div class="space-y-5 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-lg shadow-emerald-100">
            <header class="space-y-1">
              <h2 class="text-lg font-semibold text-emerald-700">專注摘要</h2>
              <p class="text-sm text-emerald-600">{{ selectedIntent.affirmation }}</p>
            </header>

            <ul class="space-y-2 text-sm text-emerald-700">
              <li class="flex items-center justify-between">
                <span>專注模式</span>
                <span class="font-semibold">{{ selectedIntent.name }}</span>
              </li>
              <li class="flex items-center justify-between">
                <span>專注長度</span>
                <span class="font-semibold">{{ effectiveMinutes ?? '—' }} 分</span>
              </li>
              <li class="flex items-center justify-between">
                <span>休息建議</span>
                <span class="font-semibold">{{ selectedBreak }} 分</span>
              </li>
              <li class="flex items-center justify-between">
                <span>音樂氛圍</span>
                <span class="font-semibold">{{ selectedAmbient.label }}</span>
              </li>
            </ul>

            <PrimaryButton
              label="開始專注"
              :disabled="!canStart"
              :to="startDestination ?? undefined"
              @click="handleStart"
            />
            <p class="text-center text-xs text-emerald-600/80">開始後將自動帶你進入專注畫面，可隨時調整設定。</p>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>
