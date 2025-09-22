<script setup lang="ts">
import { computed } from 'vue'

type TrendPoint = {
  label: string
  value: number
}

const props = defineProps<{
  title?: string
  points: TrendPoint[]
}>()

const maxValue = computed(() => {
  const values = props.points.map((p) => Math.max(0, p.value))
  return values.length ? Math.max(...values) : 0
})

const normalized = computed(() => {
  const max = maxValue.value || 1
  return props.points.map((item) => ({
    ...item,
    percent: Math.round((Math.max(0, item.value) / max) * 100),
  }))
})
</script>

<template>
  <div class="rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-lg shadow-emerald-100/40">
    <header v-if="title" class="mb-4 text-sm font-semibold text-slate-600">{{ title }}</header>
    <div v-if="normalized.length" class="flex items-end gap-3">
      <div
        v-for="point in normalized"
        :key="point.label"
        class="flex-1 text-center text-xs text-slate-500"
      >
        <div class="mx-auto flex h-32 w-6 items-end overflow-hidden rounded-full bg-emerald-100">
          <div
            class="w-full rounded-full bg-emerald-400 transition-all"
            :style="{ height: `${Math.max(point.percent, 4)}%` }"
          ></div>
        </div>
        <p class="mt-2 font-medium text-slate-700">{{ Math.round(point.value) }}</p>
        <p>{{ point.label }}</p>
      </div>
    </div>
    <p v-else class="text-xs text-slate-400">尚無趨勢資料</p>
  </div>
</template>
