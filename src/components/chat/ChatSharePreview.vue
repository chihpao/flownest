<script setup lang="ts">
import { computed } from 'vue'
import type { ChatSharePayload } from '@/api/chat'

const props = defineProps<{ share: ChatSharePayload; variant?: 'incoming' | 'outgoing' }>()

const previewImage = computed(() => props.share.imageUrl || props.share.thumbnailUrl || '')

const hostLabel = computed(() => {
  const fallback = (props.share.siteName || '').trim()
  if (fallback) return fallback
  try {
    const parsed = new URL(props.share.url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return props.share.url
  }
})

const containerClass = computed(() => props.variant === 'outgoing'
  ? 'border-emerald-300 bg-emerald-400/95 text-emerald-50 hover:bg-emerald-400'
  : 'border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50/80'
)

const titleClass = computed(() => props.variant === 'outgoing' ? 'text-white' : 'text-slate-800')
const descriptionClass = computed(() => props.variant === 'outgoing' ? 'text-emerald-50/90' : 'text-slate-500')
const metaClass = computed(() => props.variant === 'outgoing' ? 'text-emerald-50/75' : 'text-emerald-600')
</script>

<template>
  <a
    :href="share.url"
    target="_blank"
    rel="noopener noreferrer"
    class="block overflow-hidden rounded-2xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
    :class="containerClass"
  >
    <div v-if="previewImage" class="h-40 w-full overflow-hidden border-b border-white/10 bg-black/10">
      <img :src="previewImage" alt="share preview" class="h-full w-full object-cover" loading="lazy" />
    </div>
    <div class="space-y-2 px-4 py-3">
      <p v-if="share.title" class="text-sm font-semibold" :class="titleClass">
        {{ share.title }}
      </p>
      <p v-if="share.description" class="text-xs leading-snug" :class="descriptionClass">
        {{ share.description }}
      </p>
      <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide" :class="metaClass">
        <img
          v-if="share.iconUrl"
          :src="share.iconUrl"
          alt=""
          class="h-4 w-4 rounded"
          loading="lazy"
        />
        <span class="truncate">{{ hostLabel }}</span>
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </a>
</template>
