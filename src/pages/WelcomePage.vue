<template>
  <main class="min-h-[100dvh] flex flex-col items-center p-6 bg-gradient-to-b from-blue-50 to-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <!-- Top spacer for even vertical distribution -->
    <div class="flex-1" aria-hidden="true"></div>
    <section class="w-full max-w-[520px] text-center flex flex-col items-center gap-6 sm:gap-8 py-4 sm:py-6">
      <!-- Title + Subtitle moved to top -->
      <header class="space-y-2 sm:space-y-3 w-full">
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-wide">
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">FlowNest</span>
        </h1>
        <p class="text-gray-600 leading-relaxed tracking-wide">
          Enter your flow, stay focused
        </p>
      </header>

      <!-- Insert your SVG illustration between text and button -->
      <img :src="hero" alt="Focus illustration" class="w-56 sm:w-72 md:w-80 h-auto select-none pointer-events-none" />

      <PrimaryButton label="Get Started" to="/setup" />

      <p class="text-xs text-gray-400">A lightweight focus timer</p>
    </section>
    <!-- Bottom spacer for even vertical distribution -->
    <div class="flex-1" aria-hidden="true"></div>
  </main>
</template>
<script setup lang="ts">
import PrimaryButton from '@/components/PrimaryButton.vue'
import hero from '@/assets/hero.svg'
</script>
