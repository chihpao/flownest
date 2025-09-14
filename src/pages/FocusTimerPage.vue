<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCountdown } from '@/components/useCountdown'
import ThreeBreathingSphere from '@/components/ThreeBreathingSphere.vue'

const route = useRoute()
const router = useRouter()
const { remaining, start, stop, fmt, running } = useCountdown()
const minutes = ref(30)
const total = computed(() => minutes.value * 60)
const progress = computed(() => {
  const t = total.value
  if (!t) return 0
  const p = 1 - remaining.value / t
  return Math.min(1, Math.max(0, p))
})

onMounted(() => {
  const m = Math.max(1, Number(route.query.m ?? 30))
  minutes.value = m
  start(m * 60)
})

function handleStop() {
  stop()
  router.push({ path: '/done', query: { m: Math.ceil(remaining.value/60) } })
}

// Auto-finish: when countdown hits 0, go to Done
watch(remaining, (now, prev) => {
  if (prev > 0 && now <= 0) {
    router.push({ path: '/done', query: { m: minutes.value } })
  }
})
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-slate-50 to-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <section class="w-full max-w-[560px] space-y-6 sm:space-y-8 text-center">
      <header class="space-y-1">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Stay Focused</p>
      </header>

      <!-- Sphere + Progress Ring + Timer -->
      <div class="mx-auto relative w-full max-w-[340px] sm:max-w-[420px] ring-wrap" :style="{ '--progress': (progress*360) + 'deg' }">
        <ThreeBreathingSphere />
        <div class="absolute inset-0 grid place-items-center pointer-events-none">
          <div class="px-3.5 py-1.5 rounded-full bg-white/65 backdrop-blur-sm shadow-sm border border-white/60">
            <div class="text-3xl md:text-4xl font-semibold tabular-nums tracking-wide select-none text-slate-900">
              {{ fmt() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Stop -->
      <button @click="handleStop"
        class="stop-btn relative z-10 mx-auto px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold shadow hover:brightness-110 hover:shadow-md active:scale-[0.99] transition ring-1 ring-rose-300/40 select-none">
        STOP
      </button>

      <p v-if="!running" class="text-gray-500 leading-relaxed tracking-wide">Paused</p>
    </section>
  </main>
</template>

<style scoped>
.ring-wrap { position: relative; }
.ring-wrap::before {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 9999px;
  background:
    conic-gradient(from -90deg, rgba(99,102,241,0.2) 0deg, rgba(99,102,241,0.2) var(--progress), rgba(148,163,184,0.12) var(--progress));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 12px), #000 0);
  mask: radial-gradient(farthest-side, transparent calc(100% - 12px), #000 0);
  pointer-events: none;
  filter: saturate(1.05);
}
.ring-wrap::after{
  content: '';
  position: absolute;
  inset: -18px;
  border-radius: 9999px;
  background:
    radial-gradient(40% 40% at 50% 30%, rgba(138,180,255,0.24), rgba(255,255,255,0) 70%),
    radial-gradient(50% 50% at 70% 70%, rgba(255,170,210,0.12), rgba(255,255,255,0) 72%);
  filter: blur(14px) saturate(1.02);
  pointer-events: none;
}
.ring-wrap::before, .ring-wrap::after { z-index: 0; }
.stop-btn { color: #fff !important; }
.stop-btn:disabled { color: rgba(255,255,255,0.75) !important; }
</style>
