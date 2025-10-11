<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { UiButton, UiCard } from '@/components/ui'
import { useBgm } from '@/components/useBgm'
import { AMBIENT_TRACKS, findAmbientById } from '@/config/sessionPresets'

const router = useRouter()
const { isPlaying, play: playBgm, setSource, source } = useBgm()

const title = ref('')
const presetDurations = [15, 30, 45]
const selectedDuration = ref(presetDurations[1])
const customDuration = ref('')
const selectedAmbientId = ref(AMBIENT_TRACKS[0]?.id ?? '')

const selectedAmbient = computed(() => findAmbientById(selectedAmbientId.value) ?? AMBIENT_TRACKS[0])

const previewTitle = computed(() => {
  const trimmed = title.value.trim()
  return trimmed.length ? trimmed : '專注任務'
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
const canStart = computed(() => effectiveMinutes.value !== null && !!selectedAmbient.value)

onMounted(() => {
  if (!selectedAmbient.value) return
  const current = source.value
  const matched = current ? AMBIENT_TRACKS.find((track) => track.url && current.includes(track.url)) : null
  if (matched) {
    selectedAmbientId.value = matched.id
    return
  }
  const desired = selectedAmbient.value.url
  if (desired && (!current || !current.includes(desired))) {
    setSource(desired).catch(() => {})
  }
})

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
  if (!canStart.value || effectiveMinutes.value === null || !selectedAmbient.value) return
  const query: Record<string, string> = {
    m: String(effectiveMinutes.value),
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
  <div class="space-y-8">
    <header class="space-y-2 text-center md:text-left motion-safe:animate-fade-up">
      <h1 class="text-2xl font-semibold text-ink-900">規劃下一段專注時段</h1>
      <p class="text-sm text-ink-500">
        在開始計時前設定標題、時間與環境音。
      </p>
    </header>

    <div class="grid gap-6 md:grid-cols-[minmax(0,_1fr)_minmax(0,_0.85fr)]">
      <UiCard class="motion-safe:animate-fade-up">
        <template #header>
          專注內容
        </template>
        <div class="space-y-6">
          <div class="space-y-2">
            <label for="focus-title" class="text-sm font-semibold text-ink-600">專注標題</label>
            <input
              id="focus-title"
              v-model="title"
              type="text"
              autocomplete="off"
              placeholder="例如：深度工作衝刺"
              class="field"
            />
          </div>

          <div class="space-y-4">
            <div class="space-y-2">
              <p class="text-sm font-semibold text-ink-600">專注時長</p>
              <div class="grid gap-2 sm:grid-cols-3">
                <UiButton
                  v-for="minutes in presetDurations"
                  :key="minutes"
                  type="button"
                  :variant="customDuration.trim() === '' && selectedDuration === minutes ? 'primary' : 'ghost'"
                  class="w-full justify-center"
                  :aria-pressed="customDuration.trim() === '' && selectedDuration === minutes"
                  @click="handleTimeSelect(minutes)"
                >
                  {{ minutes }} 分鐘
                </UiButton>
              </div>
            </div>

            <div class="space-y-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">自訂時長</p>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  id="custom-duration"
                  v-model="customDuration"
                  type="number"
                  inputmode="numeric"
                  min="5"
                  max="600"
                  placeholder="5 - 600"
                  class="field text-center text-lg font-semibold"
                  aria-describedby="custom-duration-help"
                />
                <span class="text-sm font-medium text-ink-500 sm:ml-1">分鐘</span>
              </div>
              <p id="custom-duration-help" class="text-xs text-ink-500">
                {{ isCustomValid || customDuration.trim() === '' ? '建議維持在 25 到 90 分鐘，最能保持專注。' : '請輸入 5 到 600 的數字。' }}
              </p>
            </div>
          </div>
        </div>
        <template #footer>
          <div class="flex flex-col gap-3">
            <UiButton
              type="button"
              variant="primary"
              class="w-full justify-center"
              :disabled="!canStart"
              @click="handleStart"
            >
              開始專注計時
            </UiButton>
            <p class="text-xs text-ink-400">
              提示：保持分頁在前景以確保倒數準確，完成後會自動儲存紀錄。
            </p>
          </div>
        </template>
      </UiCard>

      <div class="space-y-6">
        <UiCard class="motion-safe:animate-fade-up">
          <template #header>
            環境音
          </template>
          <ul class="space-y-2">
            <li v-for="track in AMBIENT_TRACKS" :key="track.id">
              <UiButton
                type="button"
                :variant="track.id === selectedAmbientId ? 'primary' : 'ghost'"
                class="w-full items-start justify-between text-left"
                :aria-pressed="track.id === selectedAmbientId"
                @click="handleAmbientSelect(track.id)"
              >
                <span class="flex flex-col gap-1 text-sm">
                  <span class="font-semibold text-ink-800">{{ track.label }}</span>
                  <span class="text-xs text-ink-500">{{ track.description }}</span>
                </span>
                <span v-if="track.id === selectedAmbientId" class="badge">已選擇</span>
              </UiButton>
            </li>
          </ul>
        </UiCard>

        <UiCard class="motion-safe:animate-fade-up">
          <template #header>
            設定摘要
          </template>
          <dl class="space-y-3 text-sm text-ink-600">
            <div class="flex items-center justify-between gap-4">
              <dt>標題</dt>
              <dd class="font-semibold text-ink-800">{{ previewTitle }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt>預計時長</dt>
              <dd class="font-semibold text-ink-800">
                {{ effectiveMinutes ?? '—' }} 分鐘
              </dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt>環境音</dt>
              <dd class="font-semibold text-ink-800">
                {{ selectedAmbient?.label ?? '預設' }}
              </dd>
            </div>
          </dl>
        </UiCard>
      </div>
    </div>
  </div>
</template>
