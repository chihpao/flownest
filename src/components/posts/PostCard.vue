<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  authorId: string
  authorName: string
  authorAvatar?: string | null
  contentText: string
  createdAtLabel: string
  imageUrl?: string | null
  likeCount: number
  liked: boolean
  likePending?: boolean
  canLike: boolean
  canFollow: boolean
  following: boolean
  followPending?: boolean
  durationSec?: number | null
  finishedAtLabel?: string | null
}>()

const emit = defineEmits<{ 'toggle-like': []; 'toggle-follow': [] }>()

const durationLabel = computed(() => {
  if (!props.durationSec) return ''
  const minutes = Math.max(1, Math.round(props.durationSec / 60))
  return `${minutes} 分鐘`
})

const avatarFallback = computed(() => {
  if (props.authorAvatar) return null
  const base = props.authorName?.trim() || '用戶'
  return base.slice(0, 1).toUpperCase()
})
</script>

<template>
  <article class="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-xl shadow-emerald-100/60">
    <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-200 via-emerald-400 to-teal-400"></div>

    <header class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <RouterLink :to="`/u/${authorId}`" class="flex items-center gap-3">
          <span
            v-if="props.authorAvatar"
            class="h-12 w-12 overflow-hidden rounded-full border border-emerald-200"
          >
            <img :src="props.authorAvatar" :alt="`${props.authorName} avatar`" class="h-full w-full object-cover" />
          </span>
          <span
            v-else
            class="grid h-12 w-12 place-content-center rounded-full bg-emerald-100 text-sm font-semibold uppercase tracking-wider text-emerald-600"
          >
            {{ avatarFallback }}
          </span>
          <div>
            <p class="text-sm font-semibold text-slate-900">{{ authorName }}</p>
            <time class="text-xs text-slate-400">{{ createdAtLabel }}</time>
          </div>
        </RouterLink>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="canFollow"
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-semibold transition"
          :class="following
            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
            : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
          "
          :disabled="followPending"
          @click="emit('toggle-follow')"
        >
          {{ following ? '已追蹤' : '追蹤作者' }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition"
          :class="liked ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-500'"
          :disabled="likePending || !canLike"
          @click="emit('toggle-like')"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              :class="liked ? 'text-rose-500' : 'text-slate-400'
              "
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 18.657l-6.828-6.829a4 4 0 010-5.656z"
            />
          </svg>
          {{ likeCount }}
        </button>
      </div>
    </header>

    <p class="whitespace-pre-line break-words text-base leading-relaxed text-slate-800">{{ contentText }}</p>

    <div v-if="imageUrl" class="mt-4 overflow-hidden rounded-2xl border border-slate-100">
      <img :src="imageUrl" alt="post image" class="h-52 w-full object-cover" />
    </div>

    <footer class="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <template v-if="durationLabel">
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4a.75.75 0 00-1.5 0v4c0 .199.079.39.22.53l2.5 2.5a.75.75 0 101.06-1.06L10.75 9.69V6z" />
          </svg>
          {{ durationLabel }}
        </span>
      </template>
      <template v-if="finishedAtLabel">
        <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
          <svg class="h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6 2a1 1 0 000 2h.25v1.103C4.165 5.568 2.5 7.39 2.5 9.5v.628a2 2 0 01-.553 1.372l-.615.676A1 1 0 001.5 13h17a1 1 0 00.168-1.985l-.615-.676A2 2 0 0117.5 10.13V9.5c0-2.11-1.665-3.932-3.75-4.397V4H14a1 1 0 100-2H6zm12 11.5H2c.022.032.04.066.063.097l.615.676A4 4 0 003 15v1a2 2 0 002 2h10a2 2 0 002-2v-1a4 4 0 00.322-1.727l.615-.676c.023-.03.041-.065.063-.097z" />
          </svg>
          完成於 {{ finishedAtLabel }}
        </span>
      </template>
    </footer>
  </article>
</template>
