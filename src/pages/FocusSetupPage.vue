<script setup lang="ts">
import { ref } from 'vue'
import TimePill from '@/components/TimePill.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
const choices = [30, 45, 60]
const selected = ref<number | null>(null)
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6">
    <section class="w-full max-w-[420px] space-y-6">
      <h2 class="text-2xl font-semibold text-center">Choose Focus Time</h2>
      <div class="space-y-3">
        <button v-for="m in choices" :key="m" @click="selected = m" class="w-full">
          <TimePill :label="String(m)" :active="selected===m"/>
        </button>
      </div>
      <PrimaryButton
        label="Start"
        :to="selected ? { path: '/timer', query: { m: selected } } : undefined"
      />
    </section>
  </main>
</template>
