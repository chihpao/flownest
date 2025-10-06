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
const subtitle = computed(() => activeTrack.value?.description ?? '恆流播放 · Live')

const artInitial = computed(() => {
  const name = title.value.trim()
  return name ? name.charAt(0).toUpperCase() : 'A'
})

const ART_GRADIENTS: Record<string, [string, string]> = {
  chillsynth: ['#2563eb', '#ec4899'],
  datawave: ['#047857', '#0ea5e9'],
  nightride: ['#0f172a', '#6366f1'],
  groove: ['#7c2d12', '#f97316'],
  lush: ['#15803d', '#22d3ee'],
  default: ['#334155', '#0f172a'],
}

const artStyle = computed(() => {
  const id = activeTrack.value?.id ?? 'default'
  const [from, to] = ART_GRADIENTS[id] ?? ART_GRADIENTS.default
  return {
    backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
  }
})

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
      <section class="bgm-section bgm-section--left">
        <div class="bgm-art" :style="artStyle" aria-hidden="true">
          <span>{{ artInitial }}</span>
        </div>
        <div class="bgm-meta">
          <p class="bgm-title">{{ title }}</p>
          <p class="bgm-subtitle">{{ subtitle }}</p>
        </div>
        <span class="bgm-status" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="11" stroke="rgba(34,197,94,0.45)" />
            <path d="M16 9l-5 6-3-3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </section>

      <section class="bgm-section bgm-section--middle">
        <div class="bgm-control-row">
          <button type="button" class="bgm-chip" aria-label="播放速度調整即將推出" title="播放速度調整即將推出" disabled>
            1×
          </button>
          <button type="button" class="bgm-icon-button" aria-label="倒轉15秒即將推出" title="倒轉15秒即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 8.25V3.75m0 0h4.5m-4.5 0l5.5 5.5" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6a8 8 0 108 8" />
              <text x="12" y="15" text-anchor="middle" font-size="5" fill="currentColor" font-family="'Inter', 'Segoe UI', sans-serif">15</text>
            </svg>
          </button>
          <button type="button" class="bgm-icon-button" aria-label="上一首即將推出" title="上一首即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 5h2v14H6zM19 12L9 6v12l10-6z" />
            </svg>
          </button>
          <button
            type="button"
            :aria-label="isPlaying ? '暫停背景音樂' : '播放背景音樂'"
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
          <button type="button" class="bgm-icon-button" aria-label="下一首即將推出" title="下一首即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 5h2v14h-2zM5 12l10 6V6L5 12z" />
            </svg>
          </button>
          <button type="button" class="bgm-icon-button" aria-label="快轉15秒即將推出" title="快轉15秒即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.25V3.75m0 0h-4.5m4.5 0l-5.5 5.5" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 6a8 8 0 11-8 8" />
              <text x="12" y="15" text-anchor="middle" font-size="5" fill="currentColor" font-family="'Inter', 'Segoe UI', sans-serif">15</text>
            </svg>
          </button>
          <button type="button" class="bgm-icon-button" aria-label="睡眠定時即將推出" title="睡眠定時即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="7" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l2.5 2.5" />
            </svg>
          </button>
        </div>
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
            aria-label="播放進度"
          />
          <span class="bgm-time">{{ formattedDuration }}</span>
        </div>
      </section>

      <section class="bgm-section bgm-section--right">
        <div class="bgm-right-icons">
          <button type="button" class="bgm-icon-button" aria-label="播放列表即將推出" title="播放列表即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16v2H4zM4 11h10v2H4zM4 16h10v2H4zM17 11h3v7h-3z" />
            </svg>
          </button>
          <button type="button" class="bgm-icon-button" aria-label="待播清單即將推出" title="待播清單即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="4" y="5" width="16" height="14" rx="2" />
              <path d="M8 9h8M8 13h5" stroke-linecap="round" />
            </svg>
          </button>
          <button type="button" class="bgm-icon-button" aria-label="字幕即將推出" title="字幕即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="4" y="6" width="16" height="12" rx="2" />
              <path d="M8 10h3M8 14h5M14 10h2" stroke-linecap="round" />
            </svg>
          </button>
          <div class="bgm-volume" role="group" aria-label="音量控制">
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
              aria-label="調整音量"
              @input="handleVolumeInput"
            />
            <span class="bgm-volume-value">{{ volumePercent }}</span>
          </div>
          <button type="button" class="bgm-icon-button" aria-label="裝置切換即將推出" title="裝置切換即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="3" y="5" width="18" height="12" rx="2" />
              <path d="M8 18h8" stroke-linecap="round" />
            </svg>
          </button>
          <button type="button" class="bgm-icon-button" aria-label="全螢幕即將推出" title="全螢幕即將推出" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M8 4H4v4M20 8V4h-4M4 16v4h4M16 20h4v-4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </section>
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
  display: flex;
  justify-content: center;
  pointer-events: none;
  padding: 0.75rem 1rem;
  padding-bottom: calc(env(safe-area-inset-bottom) + 0.75rem);
}

.bgm-shell {
  pointer-events: auto;
  width: 100%;
  max-width: 1200px;
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 24px;
  background: rgba(4, 6, 10, 0.92);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.15);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(18px);
}

.bgm-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bgm-section--left {
  flex: 1 1 28%;
  min-width: 0;
}

.bgm-section--middle {
  flex: 1 1 44%;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.bgm-section--right {
  flex: 1 1 28%;
  justify-content: flex-end;
}

.bgm-art {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 1.35rem;
  color: rgba(248, 250, 252, 0.9);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.bgm-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bgm-title {
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.2;
  color: #f8fafc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bgm-subtitle {
  font-size: 0.8rem;
  line-height: 1.2;
  color: rgba(148, 163, 184, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bgm-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #22c55e;
}

.bgm-control-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bgm-chip,
.bgm-icon-button,
.bgm-play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
  color: rgba(226, 232, 240, 0.85);
  background: rgba(15, 23, 42, 0.6);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.bgm-chip {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.bgm-icon-button {
  width: 38px;
  height: 38px;
}

.bgm-icon-button svg,
.bgm-chip svg {
  width: 18px;
  height: 18px;
}

.bgm-play {
  width: 54px;
  height: 54px;
  background: linear-gradient(135deg, #10b981, #22d3ee);
  color: #0b1120;
  box-shadow: 0 10px 30px rgba(34, 197, 94, 0.35);
}

.bgm-play svg {
  width: 22px;
  height: 22px;
}

.bgm-chip:disabled,
.bgm-icon-button:disabled {
  cursor: default;
  opacity: 0.55;
}

.bgm-play:active {
  transform: scale(0.96);
}

.bgm-progress-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.bgm-time {
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.9);
  min-width: 3ch;
  text-align: center;
}

.bgm-progress-bar {
  flex: 1 1 auto;
  height: 6px;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    rgba(226, 232, 240, 0.85) 0%,
    rgba(226, 232, 240, 0.85) calc(var(--progress, 0) * 100%),
    rgba(148, 163, 184, 0.35) calc(var(--progress, 0) * 100%)
  );
  appearance: none;
  cursor: pointer;
}

.bgm-progress-bar:disabled {
  cursor: default;
  background: linear-gradient(
    90deg,
    rgba(226, 232, 240, 0.65) 0%,
    rgba(226, 232, 240, 0.65) calc(var(--progress, 1) * 100%),
    rgba(148, 163, 184, 0.25) calc(var(--progress, 1) * 100%)
  );
}

.bgm-progress-bar::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #e2e8f0;
  box-shadow: 0 2px 6px rgba(148, 163, 184, 0.45);
}

.bgm-progress-bar::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #e2e8f0;
  border: none;
  box-shadow: 0 2px 6px rgba(148, 163, 184, 0.45);
}

.bgm-right-icons {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bgm-volume {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.55);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.bgm-volume-icon {
  width: 18px;
  height: 18px;
  color: rgba(226, 232, 240, 0.9);
}

.bgm-volume-slider {
  width: 110px;
  height: 6px;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    rgba(16, 185, 129, 0.75) 0%,
    rgba(16, 185, 129, 0.75) calc(var(--val, 0) * 100%),
    rgba(148, 163, 184, 0.4) calc(var(--val, 0) * 100%)
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

@media (max-width: 1100px) {
  .bgm-shell {
    gap: 1.5rem;
  }

  .bgm-section--middle {
    flex: 1 1 50%;
  }
}

@media (max-width: 900px) {
  .bgm-shell {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
    gap: 1.25rem;
  }

  .bgm-section {
    width: 100%;
  }

  .bgm-section--left,
  .bgm-section--right {
    justify-content: space-between;
  }

  .bgm-section--middle {
    order: 3;
  }

  .bgm-control-row {
    flex-wrap: wrap;
    justify-content: center;
  }

  .bgm-right-icons {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .bgm-volume-slider {
    width: 140px;
  }
}

@media (max-width: 640px) {
  .bgm-shell {
    border-radius: 20px;
    padding: 0.85rem;
  }

  .bgm-art {
    width: 52px;
    height: 52px;
    border-radius: 14px;
  }

  .bgm-section--left {
    gap: 0.75rem;
  }

  .bgm-title {
    font-size: 0.9rem;
  }

  .bgm-subtitle {
    font-size: 0.78rem;
  }

  .bgm-control-row {
    gap: 0.6rem;
  }

  .bgm-icon-button {
    width: 34px;
    height: 34px;
  }

  .bgm-play {
    width: 48px;
    height: 48px;
  }

  .bgm-volume-slider {
    width: 120px;
  }

  .bgm-volume-value {
    display: none;
  }
}

@media (max-width: 440px) {
  .bgm-shell {
    gap: 1rem;
  }

  .bgm-section--right {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
  }

  .bgm-right-icons {
    justify-content: center;
    gap: 0.6rem;
  }

  .bgm-volume {
    width: 100%;
    justify-content: center;
  }

  .bgm-progress-row {
    gap: 0.6rem;
  }
}
</style>
