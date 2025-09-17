<script setup lang="ts">
import { computed } from 'vue'
import { useBgm } from './useBgm'
import { AMBIENT_TRACKS } from '@/config/sessionPresets'

defineProps<{ compact?: boolean }>()

const { isPlaying, toggle, volume, setVolume, source } = useBgm()

const label = computed(() => (isPlaying.value ? '暫停' : '播放'))
const currentTrack = computed(() => {
  const src = source.value
  if (!src) return '未選擇音景'
  const match = AMBIENT_TRACKS.find(track => src.includes(track.url))
  return match ? match.label : 'Ambient Mix'
})
</script>

<template>
  <div
    class="flex items-center gap-3 rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur"
  >
    <button
      class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.95]"
      @click="toggle"
    >
      {{ label }}
    </button>
    <span class="hidden text-xs text-slate-500 sm:inline-flex">{{ currentTrack }}</span>
    <input
      class="h-1 w-28 cursor-pointer accent-emerald-500 sm:w-24"
      type="range"
      min="0"
      max="1"
      step="0.01"
      :value="volume"
      :style="{ '--val': volume }"
      @input="(e: any) => setVolume(Number(e.target.value))"
      aria-label="背景音樂音量"
    />
  </div>
</template>

<style scoped>
input[type="range"] {
  appearance: none;
  height: 6px;
  border-radius: 9999px;
  background: linear-gradient(90deg, rgba(16,185,129,0.8) 0%, rgba(16,185,129,0.8) calc(var(--val, 0) * 100%), rgba(203,213,225,0.6) calc(var(--val, 0) * 100%));
}
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #10b981;
  border-radius: 50%;
  border: none;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
</style>
