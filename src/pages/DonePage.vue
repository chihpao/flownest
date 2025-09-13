<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()
const m = Number(route.query.m ?? 30)
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-white to-green-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <section class="w-full max-w-[420px] space-y-5 sm:space-y-6 text-center">
      <h2 class="text-3xl font-bold tracking-wide">Task Completed!</h2>
      <p class="text-gray-700 leading-relaxed tracking-wide">You completed {{ m }} minutes of focus 🎉</p>
      <button @click="router.push('/setup')"
        class="w-full py-3 rounded-full text-white bg-gradient-to-r from-blue-500 to-indigo-500">
        Return Home
      </button>
    </section>
  </main>
</template>
