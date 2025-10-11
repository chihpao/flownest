<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import Spinner from './Spinner.vue'

type ButtonVariant = 'primary' | 'ghost' | 'danger'
type ButtonTag = 'button' | 'a'

const props = withDefaults(defineProps<{
  as?: ButtonTag
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  href?: string
  type?: 'button' | 'submit' | 'reset'
}>(), {
  as: 'button',
  variant: 'primary',
  loading: false,
  disabled: false,
  type: 'button',
})

const attrs = useAttrs()

const tag = computed(() => (props.as === 'a' ? 'a' : 'button'))
const isButton = computed(() => tag.value === 'button')
const isDisabled = computed(() => props.disabled || props.loading)

const variantClass = computed(() => {
  switch (props.variant) {
    case 'ghost':
      return 'btn-ghost'
    case 'danger':
      return 'btn-danger'
    case 'primary':
    default:
      return 'btn-primary'
  }
})

const disabledClass = computed(() => (props.as === 'a' && isDisabled.value ? 'pointer-events-none opacity-60' : undefined))
</script>

<template>
  <component
    :is="tag"
    class="btn"
    :class="[variantClass, disabledClass]"
    :href="props.as === 'a' ? props.href : undefined"
    :type="isButton ? props.type : undefined"
    :disabled="isButton ? isDisabled : undefined"
    :aria-disabled="!isButton && isDisabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    v-bind="attrs"
  >
    <div class="flex items-center gap-2">
      <Spinner v-if="loading" size="sm" />
      <span class="inline-flex items-center gap-1">
        <slot />
      </span>
    </div>
  </component>
</template>
