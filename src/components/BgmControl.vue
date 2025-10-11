<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBgm } from './useBgm'
import { AMBIENT_TRACKS } from '@/config/sessionPresets'

const PROGRESS_STEPS = 1000

const { isPlaying, toggle, volume, setVolume, source, currentTime, duration, seekTo } = useBgm()

const activeTrack = computed(() => {
  const src = source.value
  if (!src) return null
  return AMBIENT_TRACKS.find(track => src.includes(track.url)) ?? null
})

const title = computed(() => activeTrack.value?.label ?? 'Ambient Mix')

const isSeekable = computed(() => duration.value != null && duration.value > 0)

const computedProgress = computed(() => {
  if (!isSeekable.value || !duration.value) {
    return PROGRESS_STEPS
  }
  const ratio = Math.min(1, Math.max(0, currentTime.value / duration.value))
  return Math.round(ratio * PROGRESS_STEPS)
})

const progressValue = ref(PROGRESS_STEPS)
const isScrubbing = ref(false)

watch(isSeekable, (seekable) => {
  if (!seekable) {
    progressValue.value = PROGRESS_STEPS
    isScrubbing.value = false
  }
}, { immediate: true })

watch(computedProgress, (val) => {
  if (!isScrubbing.value) {
    progressValue.value = val
  }
}, { immediate: true })

const formattedCurrentTime = computed(() => formatTime(currentTime.value))
const formattedDuration = computed(() => (isSeekable.value && duration.value ? formatTime(duration.value) : 'LIVE'))

const volumePercent = computed(() => `${Math.round(volume.value * 100)}%`)

const progressStyle = computed(() => {
  const ratio = isSeekable.value && duration.value ? progressValue.value / PROGRESS_STEPS : 1
  const clamped = Math.min(1, Math.max(0, ratio))
  return {
    '--progress': `${clamped}`,
  }
})

function handleVolumeInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const value = Number(target.value)
  if (Number.isFinite(value)) {
    setVolume(value)
  }
}

function handleProgressInput(event: Event) {
  if (!isSeekable.value) return
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const value = Number(target.value)
  if (!Number.isFinite(value)) return
  isScrubbing.value = true
  progressValue.value = value
}

function handleProgressChange(event: Event) {
  if (!isSeekable.value || !duration.value) {
    isScrubbing.value = false
    return
  }
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const value = Number(target.value)
  if (!Number.isFinite(value)) {
    isScrubbing.value = false
    return
  }
  const ratio = value / PROGRESS_STEPS
  seekTo(duration.value * ratio)
  isScrubbing.value = false
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}
</script>

<template>
  <div class="bgm-dock">
    <div class="bgm-shell">
      <div class="bgm-track">
        <span class="bgm-live-dot" aria-hidden="true"></span>
        <p class="bgm-title" :title="title">{{ title }}</p>
      </div>

      <div class="bgm-center">
        <button
          type="button"
          :aria-label="isPlaying ? '?怠???單?' : '?剜??單?'"
          class="bgm-play"
          @click="toggle"
        >
          <svg v-if="!isPlaying" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
          </svg>
        </button>
        <div class="bgm-progress-row">
          <span class="bgm-time">{{ formattedCurrentTime }}</span>
          <input
            class="bgm-progress-bar"
            type="range"
            min="0"
            :max="PROGRESS_STEPS"
            :value="progressValue"
            :disabled="!isSeekable"
            :style="progressStyle"
            @input="handleProgressInput"
            @change="handleProgressChange"
            aria-label="?剜?脣漲"
          />
          <span class="bgm-time">{{ formattedDuration }}</span>
        </div>
      </div>

      <div class="bgm-volume" role="group" aria-label="?喲??批">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="bgm-volume-icon" aria-hidden="true">
          <path d="M4 9h3l4-4v14l-4-4H4z" />
          <path d="M16.5 12a3.5 3.5 0 01-2.47 3.35v-6.7A3.5 3.5 0 0116.5 12z" />
          <path d="M19 12a6 6 0 01-4.5 5.82v-1.98A4 4 0 0017 12a4 4 0 00-2.5-3.64V6.38A6 6 0 0119 12z" />
        </svg>
        <input
          class="bgm-volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          :style="{ '--val': volume }"
          aria-label="隤踵?喲?"
          @input="handleVolumeInput"
        />
        <span class="bgm-volume-value">{{ volumePercent }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bgm-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  pointer-events: none;
  padding-bottom: env(safe-area-inset-bottom);
}

.bgm-shell {
  pointer-events: auto;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 220px) minmax(0, 1fr) minmax(0, 220px);
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem clamp(1.25rem, 4vw, 2rem);
  background: rgba(7, 10, 18, 0.94);
  color: #f8fafc;
  border-top: 1px solid rgba(100, 116, 139, 0.25);
  box-shadow: 0 -12px 30px rgba(15, 23, 42, 0.2);
}

.bgm-track {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.bgm-live-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: radial-gradient(circle at 50% 50%, #22c55e 0%, rgba(34, 197, 94, 0.25) 70%, rgba(34, 197, 94, 0) 100%);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

.bgm-title {
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bgm-center {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.bgm-play {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 9999px;
  background: linear-gradient(135deg, #10b981, #22d3ee);
  color: #04121c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
  box-shadow: 0 12px 24px rgba(34, 197, 94, 0.28);
}

.bgm-play svg {
  width: 22px;
  height: 22px;
}

.bgm-play:active {
  transform: scale(0.95);
}

.bgm-progress-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1 1 auto;
  min-width: 0;
}

.bgm-time {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: rgba(148, 163, 184, 0.9);
  min-width: 3.4ch;
  text-align: center;
}

.bgm-progress-bar {
  flex: 1 1 auto;
  height: 4px;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    rgba(241, 245, 249, 0.85) 0%,
    rgba(241, 245, 249, 0.85) calc(var(--progress, 0) * 100%),
    rgba(100, 116, 139, 0.35) calc(var(--progress, 0) * 100%)
  );
  appearance: none;
  cursor: pointer;
}

.bgm-progress-bar:disabled {
  cursor: default;
  background: rgba(100, 116, 139, 0.35);
}

.bgm-progress-bar::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #e2e8f0;
  box-shadow: 0 2px 6px rgba(148, 163, 184, 0.4);
}

.bgm-progress-bar::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #e2e8f0;
  border: none;
  box-shadow: 0 2px 6px rgba(148, 163, 184, 0.4);
}

.bgm-volume {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.55);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.bgm-volume-icon {
  width: 16px;
  height: 16px;
  color: rgba(226, 232, 240, 0.9);
}

.bgm-volume-slider {
  width: 110px;
  height: 4px;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    rgba(16, 185, 129, 0.75) 0%,
    rgba(16, 185, 129, 0.75) calc(var(--val, 0) * 100%),
    rgba(148, 163, 184, 0.35) calc(var(--val, 0) * 100%)
  );
  appearance: none;
  cursor: pointer;
}

.bgm-volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #10b981;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.35);
}

.bgm-volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #10b981;
  border: none;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.35);
}

.bgm-volume-value {
  font-size: 0.75rem;
  color: rgba(203, 213, 225, 0.9);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1024px) {
  .bgm-shell {
    grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
    gap: 1rem;
  }

  .bgm-center {
    justify-content: center;
  }

  .bgm-volume {
    display: none;
  }
}

@media (max-width: 820px) {
  .bgm-shell {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }

  .bgm-track {
    justify-content: center;
    text-align: center;
  }

  .bgm-center {
    justify-content: center;
  }

  .bgm-volume {
    justify-self: center;
  }

  .bgm-volume-value {
    display: none;
  }
}

@media (max-width: 520px) {
  .bgm-shell {
    padding: 0.65rem 0.75rem;
  }

  .bgm-play {
    width: 42px;
    height: 42px;
  }

  .bgm-progress-row {
    gap: 0.5rem;
  }

  .bgm-time {
    font-size: 0.7rem;
  }

  .bgm-volume {
    width: 100%;
    justify-content: center;
  }

  .bgm-volume-slider {
    width: 140px;
  }
}
</style>
