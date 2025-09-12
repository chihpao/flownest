<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCountdown } from '@/components/useCountdown'
import TimerCircle from '@/components/TimerCircle.vue'

const route = useRoute()
const router = useRouter()
const { remaining, start, stop, fmt, running } = useCountdown()

onMounted(() => {
  const m = Number(route.query.m ?? 30)
  start(m * 60) // 分 → 秒
})

function handleStop() {
  stop()
  router.push({ path: '/done', query: { m: Math.ceil(remaining.value/60) } })
}
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6">
    <section class="w-full max-w-[420px] space-y-8 text-center">
      <TimerCircle :text="fmt()" />
      <button @click="handleStop"
        class="mx-auto px-6 py-3 rounded-full bg-red-500 text-white">Stop</button>
      <p v-if="!running" class="text-gray-500">Paused</p>
    </section>
  </main>
</template>
