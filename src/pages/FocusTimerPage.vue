<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCountdown } from '@/components/useCountdown'
import ThreeBreathingSphere from '@/components/ThreeBreathingSphere.vue'

const route = useRoute()
const router = useRouter()
const { remaining, start, stop, fmt, running } = useCountdown()

onMounted(() => {
  const m = Number(route.query.m ?? 30)
  start(m * 60)
})

function handleStop() {
  stop()
  router.push({ path: '/done', query: { m: Math.ceil(remaining.value/60) } })
}
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-blue-50 to-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <section class="w-full max-w-[560px] space-y-6 sm:space-y-8 text-center">
      <!-- 呼吸圈 + 倒數文字 -->
      <div class="mx-auto relative w-full max-w-[360px] sm:max-w-[420px]">
        <ThreeBreathingSphere />
        <div class="absolute inset-0 grid place-items-center pointer-events-none">
          <div class="text-3xl md:text-4xl font-semibold tabular-nums drop-shadow-sm tracking-wide">
            {{ fmt() }}
          </div>
        </div>
      </div>

      <!-- Stop -->
      <button @click="handleStop"
        class="mx-auto px-6 py-3 rounded-full bg-red-500 text-white
               shadow hover:brightness-110 hover:shadow-md active:scale-[0.99] transition">
        Stop
      </button>

      <p v-if="!running" class="text-gray-500 leading-relaxed tracking-wide">Paused</p>
    </section>
  </main>
</template>
