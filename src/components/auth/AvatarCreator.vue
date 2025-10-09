<template>
  <transition name="avatar-overlay">
    <div v-if="open" class="avatar-overlay">
      <div class="avatar-panel">
        <header class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">AI 頭像工作室</p>
          <h2 class="text-xl font-semibold text-slate-800">幫自己做一個可愛的分身</h2>
          <p class="text-sm text-slate-500">
            使用相同的 AI 生圖服務產出 512 x 512 的方形頭像。請輸入想像中的樣子，我們會輔助加入聚焦於臉部、乾淨背景的提示。
          </p>
        </header>

        <form class="space-y-4" @submit.prevent="handleGenerate">
          <label class="space-y-2">
            <span class="text-xs font-semibold text-slate-600">想像提示詞 Prompt</span>
            <textarea
              v-model="prompt"
              rows="3"
              class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="例：可愛療癒的小生物，圓滾滾身形，亮晶晶的大眼睛，看向右手邊，柔和光線。"
              @input="clearError"
            />
          </label>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label class="flex items-center gap-2 text-xs text-slate-500">
              <span>風格設定</span>
              <select
                v-model="styleId"
                class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                @change="clearError"
              >
                <option v-for="style in styles" :key="style.id" :value="style.id">
                  {{ style.label }}
                </option>
              </select>
            </label>

            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400 disabled:opacity-60"
              :disabled="generateDisabled"
            >
              <span v-if="generating" class="flex items-center gap-2">
                <span class="h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
                產生中...
              </span>
              <span v-else>產生頭像</span>
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
              <p>如果不喜歡可以重新輸入提示詞再試一次。</p>
            </figcaption>
          </figure>

          <div class="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 disabled:opacity-60"
              :disabled="saving"
              @click="handleSave"
            >
              <span v-if="saving" class="flex items-center gap-2">
                <span class="h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
                儲存頭像...
              </span>
              <span v-else>使用這張頭像</span>
            </button>
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center rounded-full border border-emerald-300 bg-white px-5 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-60"
              :disabled="generating || saving"
              @click="handleGenerate"
            >
              再試一張
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>隨時可以在個人設定中再次更換。</p>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-600"
            :disabled="saving || generating"
            @click="handleSkip"
          >
            先跳過，稍後再說
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { generateSupportImage } from '@/api/encouragement'
import { useAuth } from '@/stores/useAuth'

const AVATAR_WIDTH = 512
const AVATAR_HEIGHT = 512

interface StyleOption {
  id: string
  label: string
  promptSuffix: string
  negativePrompt?: string
}

const styles: StyleOption[] = [
  {
    id: 'kawaii-soft',
    label: '柔和插畫',
    promptSuffix: 'soft pastel colors, kawaii character design, smooth shading, simple clean background'
  },
  {
    id: 'bubble-toy',
    label: '玩具公仔',
    promptSuffix: 'vinyl toy render, studio lighting, glossy finish, centered composition'
  },
  {
    id: 'storybook',
    label: '故事書風',
    promptSuffix: 'storybook illustration, watercolor texture, warm lighting, gentle expression'
  }
]

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'skip'): void
  (e: 'saved', data: string): void
}>()

const auth = useAuth()

const prompt = ref('可愛療癒的小生物，圓滾滾身形，亮晶晶的大眼睛，看向右手邊，柔和光線。')
const styleId = ref<StyleOption['id']>(styles[0].id)
const generating = ref(false)
const saving = ref(false)
const error = ref('')
const imageData = ref<string | null>(null)

const activeStyle = computed(() => styles.find((style) => style.id === styleId.value) ?? styles[0])
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
  styleId.value = styles[0].id
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
    const style = activeStyle.value
    const combinedPrompt = [
      basePrompt,
      'centered portrait, shoulders up, big expressive eyes, looking slightly right',
      'clean studio background, high quality, no text'
    ]
    if (style?.promptSuffix) {
      combinedPrompt.push(style.promptSuffix)
    }

    const response = await generateSupportImage({
      prompt: combinedPrompt.join(', '),
      negativePrompt: style?.negativePrompt ?? 'text, watermark, logo, extra limbs, blurry, distorted, nsfw',
      width: AVATAR_WIDTH,
      height: AVATAR_HEIGHT,
      guidanceScale: 7.5,
      steps: 30
    })
    imageData.value = response.imageBase64
  } catch (e: any) {
    error.value = e?.message ?? '產生頭像失敗，請稍後再試。'
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
    error.value = e?.message ?? '儲存頭像失敗，請再試一次。'
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
