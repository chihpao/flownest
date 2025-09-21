<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BgmControl from '@/components/BgmControl.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { useBgm } from '@/components/useBgm'
import {
  FOCUS_INTENTS,
  AMBIENT_TRACKS,
  findIntentById,
} from '@/config/sessionPresets'

const router = useRouter()
const { isPlaying, play: playBgm, setSource } = useBgm()

const title = ref('')
const baseDurations = [15, 20, 25, 30, 45, 60, 90]
const selectedIntentId = ref(FOCUS_INTENTS[0].id)
const selectedDuration = ref(FOCUS_INTENTS[0].recommendedMinutes)
const customDuration = ref('')
const selectedAmbientId = ref(AMBIENT_TRACKS[0].id)

const selectedIntent = computed(() => findIntentById(selectedIntentId.value))
const selectedAmbient = computed(() => {
  const found = AMBIENT_TRACKS.find((track) => track.id === selectedAmbientId.value)
  return found ?? AMBIENT_TRACKS[0]
})
const selectedBreakMinutes = computed(() => selectedIntent.value.suggestedBreak)

const availableDurations = computed(() => {
  const set = new Set(baseDurations)
  set.add(selectedIntent.value.recommendedMinutes)
  return Array.from(set).sort((a, b) => a - b)
})

const parsedCustom = computed(() => {
  const raw = customDuration.value.trim()
  if (!raw) return null
  const num = Number(raw)
  if (!Number.isFinite(num)) return NaN
  return Math.min(600, Math.max(5, Math.round(num)))
})

const effectiveMinutes = computed<number | null>(() => {
  if (customDuration.value.trim() === '') {
    return selectedDuration.value
  }
  return parsedCustom.value !== null && !Number.isNaN(parsedCustom.value)
    ? parsedCustom.value
    : null
})

const isCustomValid = computed(() => parsedCustom.value !== null && !Number.isNaN(parsedCustom.value))
const canStart = computed(() => effectiveMinutes.value !== null)

onMounted(() => {
  setSource(selectedAmbient.value.url).catch(() => {})
})

function selectIntent(id: string) {
  if (selectedIntentId.value === id) return
  selectedIntentId.value = id
  const intent = findIntentById(id)
  selectedDuration.value = intent.recommendedMinutes
  customDuration.value = ''
}

function handleTimeSelect(minutes: number) {
  selectedDuration.value = minutes
  customDuration.value = ''
}

async function handleAmbientSelect(id: string) {
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

async function handleStart() {
  if (!canStart.value || effectiveMinutes.value === null) return
  const query: Record<string, string> = {
    m: String(effectiveMinutes.value),
    intent: selectedIntent.value.id,
    break: String(selectedBreakMinutes.value),
    ambient: selectedAmbient.value.id,
  }
  const trimmed = title.value.trim()
  if (trimmed) {
    query.title = trimmed
  }
  if (isPlaying.value) {
    query.autoplay = '1'
  }
  await router.push({ name: 'timer', query })
}
</script>

<template>
  <main class="relative min-h-screen w-full bg-gradient-to-b from-white via-emerald-50/40 to-slate-50 px-4 pb-28 pt-[env(safe-area-inset-top)] sm:px-6 sm:pb-[env(safe-area-inset-bottom)]">
    <div class="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 sm:absolute sm:inset-auto sm:right-4 sm:top-4 sm:bottom-auto sm:justify-end sm:px-0">
      <BgmControl />
    </div>

    <section class="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header class="space-y-3 text-center">
        <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold tracking-[0.25em] text-emerald-600">專注儀式</span>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">安排一段理想的專注時光</h1>
        <p class="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
          未登入也能完整體驗。專注完成後會先保存於瀏覽器，登入帳號時系統會自動把成果同步到你的專注紀錄。
        </p>
      </header>

      <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article class="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm">
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-slate-700">專注主題</label>
            <input
              v-model="title"
              type="text"
              placeholder="例如：整理會議紀要"
              class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-semibold text-slate-700">專注模式</label>
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
                  <span class="text-xs font-semibold text-emerald-500">建議 {{ intent.recommendedMinutes }} 分鐘</span>
                </div>
                <p class="mt-1 text-sm leading-relaxed text-slate-500">{{ intent.description }}</p>
              </button>
            </div>
          </div>

          <div class="space-y-4">
            <label class="block text-sm font-semibold text-slate-700">專注時長</label>
            <div class="grid gap-3 sm:grid-cols-3">
              <div v-for="minutes in availableDurations" :key="minutes" class="relative">
                <button
                  type="button"
                  class="w-full rounded-2xl border px-4 py-2 text-sm font-semibold transition"
                  :class="customDuration.trim() === '' && selectedDuration === minutes
                    ? 'border-emerald-400 bg-emerald-100 text-emerald-700 shadow'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-600'
                  "
                  @click="handleTimeSelect(minutes)"
                >
                  {{ minutes }} 分鐘
                </button>
                <span
                  v-if="minutes === selectedIntent.recommendedMinutes"
                  class="absolute -right-2 -top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white"
                >推薦</span>
              </div>
            </div>

            <div class="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">自訂時長</label>
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
                {{ isCustomValid || customDuration.trim() === '' ? '設定一個合適的專注時長，建議 25 - 90 分鐘' : '請輸入 5 到 600 的整數分鐘' }}
              </p>
            </div>
          </div>

          <div class="space-y-4 pt-2">
            <PrimaryButton
              label="開始專注"
              :disabled="!canStart"
              @click="handleStart"
            />
            <p class="text-xs text-slate-500">提醒：專注期間請保持視窗開啟，倒數歸零時會自動產生一筆專注紀錄。</p>
          </div>
        </article>

        <aside class="space-y-6">
          <article class="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm">
            <header class="space-y-1">
              <h2 class="text-lg font-semibold text-slate-800">環境音景配方</h2>
            </header>
            <ul class="space-y-3">
              <li
                v-for="track in AMBIENT_TRACKS"
                :key="track.id"
                class="rounded-2xl border px-4 py-3 transition"
                :class="track.id === selectedAmbientId
                  ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
                  : 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow'
                "
                @click="handleAmbientSelect(track.id)"
              >
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-semibold text-slate-800">{{ track.label }}</h3>
                  <span class="text-xs font-semibold text-emerald-500">{{ track.id === selectedAmbientId ? '已選擇' : '點擊套用' }}</span>
                </div>
                <p class="mt-1 text-sm leading-relaxed text-slate-500">{{ track.description }}</p>
              </li>
            </ul>
          </article>

          <article class="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-lg shadow-emerald-100">
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
                <span>專注時長</span>
                <span class="font-semibold">{{ (effectiveMinutes ?? '—') }} 分鐘</span>
              </li>
              <li class="flex items-center justify-between">
                <span>環境氛圍</span>
                <span class="font-semibold">{{ selectedAmbient.label }}</span>
              </li>
              <li class="flex items-center justify-between">
                <span>建議休息</span>
                <span class="font-semibold">{{ selectedBreakMinutes }} 分鐘</span>
              </li>
            </ul>
          </article>
        </aside>
      </div>
    </section>
  </main>
</template>
