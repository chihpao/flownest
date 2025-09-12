<script setup lang="ts">
defineProps<{ text: string }>()
</script>
<template>
  <div class="size-64 rounded-full border border-gray-300 grid place-items-center">
    <div class="text-3xl tabular-nums">{{ text }}</div>
  </div>
</template>
