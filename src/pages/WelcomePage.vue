<template>
    <main class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-blue-50 to-white">
      <section class="w-full max-w-[420px] text-center space-y-8">
        <h1 class="text-4xl font-bold">FlowNest</h1>
        <p class="text-gray-600">Enter your flow, stay focused</p>
        <PrimaryButton label="Get Started" to="/setup" />
      </section>
    </main>
  </template>
  <script setup lang="ts">
  import PrimaryButton from '@/components/PrimaryButton.vue'
  </script>
  