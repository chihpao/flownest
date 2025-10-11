<script setup lang="ts">
import { computed } from 'vue'

type SpinnerSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{ size?: SpinnerSize }>(), {
  size: 'md',
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-4 w-4 border-2'
    case 'lg':
      return 'h-7 w-7 border-[3px]'
    case 'md':
    default:
      return 'h-5 w-5 border-2'
  }
})
</script>

<template>
  <span
    role="status"
    class="inline-flex items-center"
    aria-live="polite"
    aria-busy="true"
  >
    <span
      class="inline-block animate-spin rounded-full border-current border-t-transparent"
      :class="sizeClass"
    />
    <span class="sr-only">Loading</span>
  </span>
</template>
