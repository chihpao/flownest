<template>
  <transition name="avatar-overlay">
    <div v-if="open" class="avatar-overlay">
      <div class="avatar-panel">
        <header class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">AI 頭像工作室</p>
          <h2 class="text-xl font-semibold text-slate-800">幫自己生成一張可愛的專屬形象</h2>
          <p class="text-sm text-slate-500">
            請用一句話描述你理想的頭像樣貌（可包含風格、姿態或情緒）。我們會自動套用建議光線與構圖設定，生成 512 x 512 的方形圖片。
          </p>
        </header>

        <form class="space-y-4" @submit.prevent="handleGenerate">
          <label class="space-y-2">
            <span class="text-xs font-semibold text-slate-600">提示 Prompt</span>
            <textarea
              v-model="prompt"
              rows="3"
              class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="例：柔和光線下的療癒系生物，圓滾滾身形、亮晶晶大眼睛，對著鏡頭微笑"
              @input="clearError"
            />
          </label>

          <div class="flex justify-end">
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400 disabled:opacity-60"
              :disabled="generateDisabled"
            >
              <span v-if="generating" class="flex items-center gap-2">
                <span class="h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
                生成中...
              </span>
              <span v-else>開始生成</span>
            </button>
          </div>
        </form>

        <p v-if="error" class="text-xs font-medium text-rose-500">{{ error }}</p>

        <div v-if="imageData" class="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <figure class="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div class="relative flex h-40 w-40 items-center justify-center rounded-full bg-white shadow-inner shadow-emerald-200">
              <img :src="imageData" alt="AI 頭像預覽" class="h-36 w-36 rounded-full object-cover" />
              <div class="pointer-events-none absolute inset-0 rounded-full ring-2 ring-emerald-300"></div>
            </div>
            <figcaption class="flex-1 space-y-1 text-xs text-emerald-700">
              <p>尺寸：{{ AVATAR_WIDTH }} x {{ AVATAR_HEIGHT }} px．PNG</p>
              <p>如果想調整，可以更換描述後再次生成。</p>
            </figcaption>
          </figure>

          <div class="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
              :disabled="saving"
              @click="handleSave"
            >
              <span v-if="saving" class="flex items-center gap-2">
                <span class="h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
                儲存中...
              </span>
              <span v-else>設為頭像</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
              :disabled="generating"
              @click="handleGenerate"
            >
              再試一次
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
              @click="handleSkip"
            >
              之後再說
            </button>
          </div>
        </div>

        <div v-else class="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-slate-400">
          點擊「開始生成」後會在這裡預覽結果。
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { generateSupportImage } from '@/api/encouragement'
import { useAuth } from '@/stores/useAuth'

const AVATAR_WIDTH = 512
const AVATAR_HEIGHT = 512
const STYLE_HINT = 'soft pastel character illustration, warm studio lighting, smooth shading, gentle smile, clean studio background'
const BASE_CONTEXT = 'centered portrait, shoulders up, high quality, no text, no watermark'
const NEGATIVE_HINT = 'text, watermark, logo, extra limbs, blurry, distorted, nsfw'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'skip'): void
  (e: 'saved', data: string): void
}>()

const auth = useAuth()

const prompt = ref('可愛療癒的小生物，圓滾滾身形，亮晶晶的大眼睛，看向右手邊，柔和光線。')
const generating = ref(false)
const saving = ref(false)
const error = ref('')
const imageData = ref<string | null>(null)

const promptReady = computed(() => prompt.value.trim().length > 6)
const generateDisabled = computed(() => generating.value || saving.value || !promptReady.value)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      reset()
    }
  }
)

function reset() {
  error.value = ''
  generating.value = false
  saving.value = false
  imageData.value = null
  prompt.value = '可愛療癒的小生物，圓滾滾身形，亮晶晶的大眼睛，看向右手邊，柔和光線。'
}

function clearError() {
  if (error.value) {
    error.value = ''
  }
}

async function handleGenerate() {
  if (!promptReady.value || generating.value) return
  generating.value = true
  error.value = ''

  try {
    const basePrompt = prompt.value.trim()
    const combinedPrompt = [basePrompt, STYLE_HINT, BASE_CONTEXT]

    const response = await generateSupportImage({
      prompt: combinedPrompt.join(', '),
      negativePrompt: NEGATIVE_HINT,
      width: AVATAR_WIDTH,
      height: AVATAR_HEIGHT,
      guidanceScale: 7.5,
      steps: 30
    })
    imageData.value = response.imageBase64
  } catch (e: any) {
    error.value = e?.message ?? '生成失敗，請稍後再試一次。'
  } finally {
    generating.value = false
  }
}

async function handleSave() {
  if (!imageData.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await auth.updateAvatar(imageData.value)
    emit('saved', imageData.value)
  } catch (e: any) {
    error.value = e?.message ?? '儲存失敗，請再試一次。'
  } finally {
    saving.value = false
  }
}

function handleSkip() {
  emit('skip')
}
</script>

<style scoped>
.avatar-overlay-enter-active,
.avatar-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.avatar-overlay-enter-from,
.avatar-overlay-leave-to {
  opacity: 0;
}

.avatar-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(8px);
  z-index: 40;
}

.avatar-panel {
  width: min(720px, 100%);
  max-height: calc(100vh - 3rem);
  overflow-y: auto;
  border-radius: 1.5rem;
  background: linear-gradient(160deg, rgba(240, 253, 250, 0.96), rgba(236, 254, 255, 0.9));
  padding: 2rem;
  box-shadow: 0 35px 65px -25px rgba(16, 185, 129, 0.3);
  border: 1px solid rgba(16, 185, 129, 0.18);
}
</style>
