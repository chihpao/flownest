<script setup lang="ts">
import { computed } from 'vue'
import { useBgm } from './useBgm'

const props = defineProps<{ compact?: boolean }>()
const { isPlaying, toggle, volume, setVolume } = useBgm()

const label = computed(() => (isPlaying.value ? 'Pause' : 'Play'))
</script>

<template>
  <div 
    class="flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-white/60 shadow-sm px-3 py-1.5 select-none"
  >
    <button 
      class="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold tracking-wide hover:brightness-110 active:scale-95 transition"
      @click="toggle"
    >
      LOFI {{ label }}
    </button>
    <input
      class="w-24 cursor-pointer accent-emerald-500"
      type="range" min="0" max="1" step="0.01"
      :value="volume"
      @input="(e:any) => setVolume(Number(e.target.value))"
      aria-label="Background music volume"
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
</style>

