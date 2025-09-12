<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
defineProps<{ label: string; to?: RouteLocationRaw }>()
</script>
<template>
  <component
    :is="to ? 'router-link' : 'button'"
    :to="to"
    class="w-full py-3 rounded-full text-white text-lg
           bg-gradient-to-r from-blue-500 to-indigo-500 shadow
           active:scale-[0.99] transition"
  >
    {{ label }}
  </component>
</template>
