<script setup lang="ts">
const props = defineProps<{ label: string; active?: boolean }>()
const emit = defineEmits<{ (e: 'click'): void }>()
const onClick = () => emit('click')
</script>

<template>
  <button
    type="button"
    @click="onClick"
    class="w-full py-3 rounded-full border text-lg transition
           focus:outline-none focus:ring-2 focus:ring-blue-400
           hover:shadow-sm active:scale-[0.99]"
    :class="props.active
      ? 'border-blue-500 text-blue-700 bg-blue-50'
      : 'border-gray-300 text-gray-800 bg-white'"
  >
    {{ props.label }}
  </button>
</template>
