<script setup lang="ts">
import Button from './Button.vue'
import { useToast } from '@/composables/useToast'
import type { ToastMessage } from '@/composables/useToast'

const { toasts, toast } = useToast()

function iconPath(type: string) {
  switch (type) {
    case 'success':
      return 'M5 11l3 3 7-7'
    case 'error':
      return 'M6 6l8 8M14 6l-8 8'
    default:
      return 'M12 18h.01M12 10a4 4 0 00-4 4v1h8v-1a4 4 0 00-4-4z'
  }
}

function runAction(item: ToastMessage) {
  item.action?.handler?.()
  toast.dismiss(item.id)
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-6 z-[1100] flex justify-center px-4 sm:top-8">
    <TransitionGroup name="toast-slide" tag="div" class="flex w-full max-w-sm flex-col gap-3">
      <article
        v-for="item in toasts"
        :key="item.id"
        class="pointer-events-auto overflow-hidden rounded-2xl border border-ink-200/50 bg-white/90 p-4 shadow-soft backdrop-blur"
      >
        <div class="flex items-start gap-3">
          <div
            class="grid h-10 w-10 place-content-center rounded-full text-white"
            :class="{
              'bg-brand-500': item.type === 'success',
              'bg-sky-500': item.type === 'info',
              'bg-rose-500': item.type === 'error',
            }"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 20 20">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath(item.type)" />
            </svg>
          </div>
          <div class="flex-1 space-y-2">
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-ink-800">
                {{ item.title }}
              </h3>
              <p v-if="item.description" class="text-sm text-ink-600">
                {{ item.description }}
              </p>
            </div>
            <div v-if="item.action" class="pt-1">
              <Button
                variant="ghost"
                class="px-3 py-1 text-xs"
                @click="runAction(item)"
              >
                {{ item.action.label }}
              </Button>
            </div>
          </div>
          <button
            type="button"
            class="text-ink-300 transition hover:text-ink-500"
            @click="toast.dismiss(item.id)"
            aria-label="Dismiss"
          >
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" d="M4 4l8 8M12 4L4 12" />
            </svg>
          </button>
        </div>
      </article>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.22s ease;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.toast-slide-move {
  transition: transform 0.2s ease;
}
</style>
