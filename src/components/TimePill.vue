<script setup lang="ts">
defineProps<{ label: string; active?: boolean }>()
</script>
<template>
  <button
    class="w-full py-3 rounded-full border text-lg transition
           hover:bg-gray-100"
    :class="active ? 'border-gray-900 font-medium' : 'border-gray-300'"
  >
    {{ label }}
  </button>
</template>
