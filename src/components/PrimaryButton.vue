<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

type ClickEvent = {
  (e: 'click', event: MouseEvent): void
}

const props = defineProps<{ label: string; to?: RouteLocationRaw; disabled?: boolean }>()
const emit = defineEmits<ClickEvent>()
const isLink = computed(() => !!props.to && !props.disabled)

const handleClick = (event: MouseEvent) => {
  if (props.disabled) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <component
    :is="isLink ? 'router-link' : 'button'"
    :to="isLink ? props.to : undefined"
    :type="isLink ? undefined : 'button'"
    :disabled="isLink ? undefined : props.disabled"
    :aria-disabled="isLink && props.disabled ? 'true' : undefined"
    class="block w-full py-3 rounded-full text-white text-lg text-center transition
           bg-gradient-to-r from-blue-500 to-indigo-500 shadow
           enabled:hover:brightness-110 enabled:hover:shadow-md
           enabled:active:scale-[0.99]
           disabled:opacity-40 disabled:cursor-not-allowed"
    @click="handleClick"
  >
    {{ props.label }}
  </component>
</template>
