<script setup lang="ts">
defineProps<{
  label: string
  value: string
  description?: string
}>()
</script>

<template>
  <div class="rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-lg shadow-emerald-100/40">
    <p class="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">{{ label }}</p>
    <p class="mt-3 text-3xl font-semibold text-slate-900">{{ value }}</p>
    <p v-if="description" class="mt-2 text-sm text-slate-500">{{ description }}</p>
  </div>
</template>
