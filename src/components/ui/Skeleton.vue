<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ lines?: number }>(), {
  lines: 3,
})

const placeholders = computed(() => Array.from({ length: Math.max(1, props.lines) }, (_, index) => index))
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(placeholder, index) in placeholders"
      :key="placeholder"
      class="relative h-3 overflow-hidden rounded-full bg-ink-100/70"
      :class="index === placeholders.length - 1 ? 'w-2/3' : 'w-full'"
    >
      <span class="shimmer"></span>
    </div>
  </div>
</template>

<style scoped>
.shimmer {
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.65), transparent);
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
