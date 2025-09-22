<script setup lang="ts">
interface SessionSummary {
  id?: string
  title: string
  minutesActual?: number
  minutesPlanned?: number
  finishedLabel?: string
}

defineProps<{
  author: string
  content: string
  createdAt: string
  imageUrl?: string | null
  likeCount: number
  sessions?: SessionSummary[]
}>()
</script>

<template>
  <article class="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-xl shadow-emerald-100/60">
    <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-200 via-emerald-400 to-teal-400"></div>

    <header class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 place-content-center rounded-full bg-emerald-100 text-sm font-semibold uppercase tracking-wider text-emerald-600">
          {{ author.slice(0, 1) }}
        </span>
        <div>
          <p class="text-sm font-semibold text-slate-900">{{ author }}</p>
          <time class="text-xs text-slate-400">{{ createdAt }}</time>
        </div>
      </div>
      <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
        <svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 18.657l-6.828-6.829a4 4 0 010-5.656z" />
        </svg>
        {{ likeCount }}
      </span>
    </header>

    <p class="whitespace-pre-line text-base leading-relaxed text-slate-800">{{ content }}</p>

    <div v-if="imageUrl" class="mt-4 overflow-hidden rounded-2xl border border-slate-100">
      <img :src="imageUrl" alt="post image" class="h-52 w-full object-cover" />
    </div>

    <footer class="mt-5 space-y-3 text-xs text-slate-500">
      <ul v-if="sessions?.length" class="space-y-2">
        <li
          v-for="session in sessions"
          :key="session.id ?? session.title"
          class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-emerald-700"
        >
          <span class="text-sm font-semibold text-emerald-700">{{ session.title }}</span>
          <span class="text-xs text-emerald-600">
            {{ Math.round(session.minutesActual ?? session.minutesPlanned ?? 0) }} 分鐘完成
            <template v-if="session.finishedLabel"> · {{ session.finishedLabel }}</template>
          </span>
        </li>
      </ul>
    </footer>
  </article>
</template>
