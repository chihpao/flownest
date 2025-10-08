<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import { ensureThreeOnWindow } from '@/utils/loadThree'

const bgEl = ref<HTMLElement | null>(null)
const isReady = ref(false)
const isLoading = ref(true)
const error = ref<string | null>(null)

let vanta: any = null
let initTimer: number | null = null

function destroyVanta() {
  if (vanta) {
    if (typeof vanta.destroy === 'function') {
      vanta.destroy()
    }
    vanta = null
  }
  isReady.value = false
}

async function initVanta() {
  if (!bgEl.value || typeof window === 'undefined') return

  if (vanta) {
    destroyVanta()
  }

  isLoading.value = true
  error.value = null

  try {
    const [three, vantaModule] = await Promise.all([
      ensureThreeOnWindow(),
      import('vanta/dist/vanta.waves.min.js')
    ])

    const WAVES = (vantaModule as any)?.default ?? vantaModule
    if (typeof WAVES !== 'function') {
      throw new Error('無法載入 Vanta WAVES 模組')
    }
    const target = bgEl.value

    vanta = WAVES({
      el: target,
      THREE: three,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0x3b82f6,
      shininess: 50,
      waveHeight: 18.0,
      waveSpeed: 0.85,
      zoom: 0.7,
      forceAnimate: true,
      backgroundColor: 0xffffff00
    })

    if (typeof vanta?.resize === 'function') {
      vanta.resize()
    }

    window.requestAnimationFrame(() => {
      isReady.value = true
    })
  } catch (err) {
    console.error('初始化背景波浪時發生錯誤：', err)
    error.value = err instanceof Error ? err.message : String(err)
    destroyVanta()
  } finally {
    isLoading.value = false
  }
}

function handleResize() {
  if (vanta && typeof vanta.resize === 'function') {
    vanta.resize()
  }
}

onMounted(async () => {
  if (typeof window === 'undefined') return

  await nextTick()
  initTimer = window.setTimeout(() => {
    void initVanta()
  }, 10)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (initTimer !== null) {
    window.clearTimeout(initTimer)
    initTimer = null
  }
  window.removeEventListener('resize', handleResize)
  destroyVanta()
  isLoading.value = false
})
</script>

<template>
  <div class="background-wrapper">
    <div ref="bgEl" class="background-waves" :class="{ 'is-ready': isReady }" />
    <LoadingOverlay v-if="isLoading" label="喚醒波浪背景" />
    <div v-if="error" class="error-chip">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.background-wrapper {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -1;
  pointer-events: none;
}

.background-waves {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.background-waves.is-ready {
  opacity: 1;
}

.background-waves :deep(canvas) {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  z-index: -1 !important;
}

.error-chip {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  background: rgba(248, 113, 113, 0.85);
  color: white;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  box-shadow: 0 12px 30px rgba(248, 113, 113, 0.25);
}
</style>
