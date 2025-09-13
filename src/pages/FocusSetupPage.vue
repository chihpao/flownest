<script setup lang="ts">
import { ref } from 'vue'
import TimePill from '@/components/TimePill.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
const choices = [25, 30, 45, 60]
const selected = ref<number | null>(null)
const handleSelect = (m: number) => { selected.value = m }
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-white to-blue-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <section class="w-full max-w-[520px] space-y-6 sm:space-y-8">
      <header class="space-y-1.5 sm:space-y-2 text-center">
        <h2 class="text-2xl md:text-3xl font-semibold tracking-wide">Choose Focus Time</h2>
        <p class="text-gray-500 text-sm leading-relaxed tracking-wide">Pick a session length to begin</p>
      </header>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TimePill
          v-for="m in choices"
          :key="m"
          :label="String(m)"
          :active="selected===m"
          @click="handleSelect(m)"
        />
      </div>

      <div class="pt-2">
        <PrimaryButton
          label="Start"
          :disabled="!selected"
          :to="selected ? { path: '/timer', query: { m: selected } } : undefined"
        />
        <p class="mt-2 text-center text-sm text-gray-500 leading-relaxed tracking-wide">
          <span v-if="!selected">Select a duration to continue</span>
          <span v-else>Ready to start a {{ selected }} min session</span>
        </p>
      </div>
    </section>
  </main>
  
</template>
