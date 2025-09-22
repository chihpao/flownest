<script setup lang="ts">
import { computed } from 'vue'

type PieSlice = {
  label: string
  value: number
  color?: string
}

const props = defineProps<{
  data: PieSlice[]
}>()

const palette = ['#34d399', '#22d3ee', '#a855f7', '#f97316', '#38bdf8', '#facc15']

const total = computed(() => {
  return props.data.reduce((sum, item) => sum + Math.max(0, item.value), 0)
})

const slices = computed(() => {
  const totalValue = total.value || 1
  let cursor = 0
  return props.data.map((item, index) => {
    const ratio = Math.max(0, item.value) / totalValue
    const start = cursor
    const end = cursor + ratio
    cursor = end
    return {
      ...item,
      color: item.color ?? palette[index % palette.length],
      start,
      end,
      ratio,
    }
  })
})

const gradient = computed(() => {
  if (!slices.value.length || total.value === 0) {
    return 'radial-gradient(circle at center, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.15) 70%, rgba(16, 185, 129, 0.05) 100%)'
  }
  const stops = slices.value.map((slice) => {
    const start = `${(slice.start * 100).toFixed(2)}%`
    const end = `${(slice.end * 100).toFixed(2)}%`
    return `${slice.color} ${start} ${end}`
  })
  return `conic-gradient(${stops.join(', ')})`
})
</script>

<template>
  <div class="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-lg shadow-emerald-100/40">
    <div class="mx-auto h-40 w-40 rounded-full" :style="{ backgroundImage: gradient }"></div>
    <ul class="space-y-2 text-sm text-slate-600">
      <li v-for="slice in slices" :key="slice.label" class="flex items-center gap-3">
        <span class="inline-flex h-3 w-3 rounded-full" :style="{ backgroundColor: slice.color }"></span>
        <span class="flex-1">{{ slice.label }}</span>
        <span class="font-medium text-slate-800">{{ (slice.ratio * 100).toFixed(0) }}%</span>
      </li>
      <li v-if="!slices.length || total === 0" class="text-xs text-slate-400">尚無資料</li>
    </ul>
  </div>
</template>
