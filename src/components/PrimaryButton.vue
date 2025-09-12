<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
defineProps<{ label: string; to?: RouteLocationRaw; disabled?: boolean }>()
</script>

<template>
  <component
    :is="to && !disabled ? 'router-link' : 'button'"
    :to="disabled ? undefined : to"
    :disabled="disabled"
    class="w-full py-3 rounded-full text-white text-lg transition
           bg-gradient-to-r from-blue-500 to-indigo-500 shadow
           enabled:hover:brightness-110 enabled:hover:shadow-md
           enabled:active:scale-[0.99]
           disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {{ label }}
  </component>
</template>
