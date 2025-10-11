<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="card text-center">
    <div class="space-y-4 px-8 py-10">
      <div
        v-if="$slots.icon"
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500 shadow-soft"
      >
        <slot name="icon" />
      </div>

      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-ink-800">
          {{ title }}
        </h3>
        <p v-if="description" class="text-sm text-ink-500">
          {{ description }}
        </p>
      </div>

      <div v-if="$slots.action" class="pt-2">
        <slot name="action" />
      </div>
    </div>
  </div>
</template>
