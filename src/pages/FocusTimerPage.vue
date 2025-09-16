<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCountdown } from '@/components/useCountdown'
import ThreeBreathingSphere from '@/components/ThreeBreathingSphere.vue'
import BgmControl from '@/components/BgmControl.vue'
import { useBgm } from '@/components/useBgm'

const route = useRoute()
const router = useRouter()

// Background music control handled in code (no manual URL input)
const { play: playBgm, pause: pauseBgm } = useBgm()

// 從路由參數獲取分鐘數，預設為25分鐘
const minutes = ref(route.query.m ? Number(route.query.m) : 25)

// 使用改進的 useCountdown
const { 
  remaining, 
  running, 
  progress, 
  formattedTime: countdownTime,
  start: startTimer, 
  stop: stopTimer,
  setTime
} = useCountdown({
  initialMinutes: minutes.value,
  onComplete: () => {
    try { pauseBgm() } catch {}
    router.push({ path: '/done', query: { m: minutes.value } })
  }
})

// 監聽路由參數變化
onMounted(() => {
  if (route.query.m) {
    const m = Number(route.query.m)
    if (!isNaN(m) && m > 0) {
      minutes.value = m
      setTime(m)
    }
  }
  // 開始計時
  startTimer(minutes.value)
})

function handleStop() {
  stopTimer()
  try { pauseBgm() } catch {}
  router.push({ path: '/done', query: { m: Math.ceil(remaining.value/60) } })
}
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-slate-50 to-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] relative">
    <div class="absolute top-4 right-4 z-20">
      <BgmControl />
    </div>
    <div class="w-full max-w-[420px] space-y-8 text-center">
      <!-- 計時器顯示 -->
      <div class="grid place-items-center">
        <button
        type="button"
        class="relative inline-flex items-center justify-center select-none
              px-3 py-1.5 md:px-4 md:py-2 rounded-2xl
              ring-1 ring-transparent
              transition-all duration-200 motion-reduce:transition-none
              hover:ring-slate-300/60 hover:shadow-md hover:bg-white/30 hover:backdrop-blur-sm
              active:ring-slate-300/60 active:bg-white/30
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70">
          <span class="text-6xl md:text-7xl font-mono font-bold tabular-nums tracking-wide text-slate-900">
            {{ countdownTime }}
          </span>
        </button>
      </div>

      
      <!-- 呼吸球體 -->
      <div class="relative w-full max-w-[320px] mx-auto aspect-square">
        <div class="absolute inset-0 flex items-center justify-center">
          <!-- 這一層只放 3D 球；保留圓角裁切 -->
          <div class="relative w-full h-full max-w-[280px] max-h-[280px] m-auto rounded-full overflow-hidden isolate">
            <ThreeBreathingSphere class="absolute inset-0 w-full h-full" />
          </div>

          <!-- 把進度環放到外一層（避免 overflow-hidden 截到） -->
          <svg class="pointer-events-none absolute w-[280px] h-[280px]" viewBox="0 0 100 100">
            <!-- 底線 -->
            <circle cx="50" cy="50" r="47" fill="none"
                    stroke="rgba(148,163,184,.25)" stroke-width="2" />
            <!-- 進度線 -->
            <circle cx="50" cy="50" r="47" fill="none"
                    stroke="#34d399" stroke-width="2" stroke-linecap="round" pathLength="100"
                    :style="{
                      strokeDasharray: 100,
                      strokeDashoffset: 100 - (progress * 100),
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%'
                    }" />
          </svg>
        </div>
      </div>


      <!-- Stop 按鈕 -->
      <button 
        @click="handleStop"
        class="mx-auto px-8 py-3 text-lg rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold shadow-lg hover:brightness-110 hover:shadow-xl active:scale-[0.98] transition-all duration-200 ring-1 ring-rose-300/40"
      >
        STOP
      </button>
    </div>
  </main>
</template>

<style scoped>
.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  transform: translateZ(0);
  backface-visibility: hidden;
  transform-style: preserve-3d;
  border-radius: 9999px;  
  overflow: hidden;     
}

.progress-ring::before,
.progress-ring::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
}

.progress-ring::before {
  top: -6px;
  left: -6px;
  right: -6px;
  bottom: -6px;
  background: conic-gradient(
    from -90deg, 
    rgba(16, 185, 129, 0.5) 0deg, 
    rgba(16, 185, 129, 0.5) var(--progress), 
    rgba(209, 250, 229, 0.1) var(--progress)
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0);
  mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0);
  filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.3));
  z-index: 1;
  transition: all 0.3s ease-out;
}

.progress-ring::after {
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  background: radial-gradient(
    40% 40% at 50% 50%, 
    rgba(16, 185, 129, 0.15), 
    rgba(255, 255, 255, 0) 70%
  );
  filter: blur(8px);
  z-index: 0;
  opacity: 0.8;
}
.stop-btn { color: #fff !important; }
.stop-btn:disabled { color: rgba(255,255,255,0.75) !important; }
</style>
