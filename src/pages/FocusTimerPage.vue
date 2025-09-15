<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCountdown } from '@/components/useCountdown'
import ThreeBreathingSphere from '@/components/ThreeBreathingSphere.vue'

const route = useRoute()
const router = useRouter()

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
    router.push({ path: '/done', query: { m: minutes.value } })
  }
})

// 監聽路由參數變化並開始計時
onMounted(() => {
  if (route.query.m) {
    const m = Number(route.query.m)
    if (!isNaN(m) && m > 0) {
      minutes.value = m
      setTime(m)
    }
  }
  // 自動開始計時
  startTimer(minutes.value)
})

function handleStop() {
  stopTimer()
  router.push({ path: '/done', query: { m: Math.ceil(remaining.value/60) } })
}
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-slate-50 to-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <div class="w-full max-w-[420px] space-y-8 text-center">
      <!-- 計時器顯示 -->
      <div class="grid place-items-center">
        <div class="px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm shadow-sm border border-white/60">
          <div class="text-6xl md:text-7xl font-mono font-bold tabular-nums tracking-wide text-slate-900">
            {{ countdownTime }}
          </div>
        </div>
      </div>
      
      <!-- 呼吸球體 -->
      <div class="relative w-full max-w-[320px] mx-auto aspect-square">
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="relative w-full h-full max-w-[280px] max-h-[280px] m-auto">
            <ThreeBreathingSphere 
              :is-running="running" 
              :progress="progress"
              :breath-intensity="running ? 0.8 : 0.3"
              class="w-full h-full"
            />
            <div class="progress-ring" :style="{ '--progress': (progress*360) + 'deg' }" />
          </div>
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
