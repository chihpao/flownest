<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

type ModalAlign = 'center' | 'top'

const props = withDefaults(defineProps<{
  open: boolean
  closeOnBackdrop?: boolean
  align?: ModalAlign
}>(), {
  closeOnBackdrop: true,
  align: 'center',
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const overlayRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const previouslyFocused = ref<HTMLElement | null>(null)
const isClient = typeof window !== 'undefined'

const alignmentClass = computed(() => (props.align === 'top' ? 'items-start pt-20' : 'items-center'))

function emitClose() {
  emit('update:open', false)
}

function handleBackdropClick(event: MouseEvent) {
  if (!props.closeOnBackdrop) return
  if (event.target === overlayRef.value) {
    emitClose()
  }
}

function trapFocus(event: KeyboardEvent) {
  if (!panelRef.value) return
  const focusables = panelRef.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  )
  if (focusables.length === 0) {
    event.preventDefault()
    panelRef.value.focus()
    return
  }

  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emitClose()
    return
  }
  if (event.key === 'Tab') {
    trapFocus(event)
  }
}

function lockBodyScroll() {
  if (!isClient) return
  document.body.style.setProperty('overflow', 'hidden')
}

function unlockBodyScroll() {
  if (!isClient) return
  document.body.style.removeProperty('overflow')
}

watch(
  () => props.open,
  (value) => {
    if (!isClient) return

    if (value) {
      previouslyFocused.value = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', handleKeydown)
      lockBodyScroll()

      nextTick(() => {
        if (!panelRef.value) return
        const initial = panelRef.value.querySelector<HTMLElement>('[data-autofocus]')
          ?? panelRef.value.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ;(initial ?? panelRef.value).focus()
      })
    } else {
      document.removeEventListener('keydown', handleKeydown)
      unlockBodyScroll()
      previouslyFocused.value?.focus()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (!isClient) return
  document.removeEventListener('keydown', handleKeydown)
  unlockBodyScroll()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div
        v-if="open"
        ref="overlayRef"
        class="fixed inset-0 z-[1000] flex bg-ink-900/30 px-4 py-6 backdrop-blur-sm sm:px-6"
        :class="alignmentClass"
        @click="handleBackdropClick"
      >
        <Transition name="modal-panel" appear>
          <div
            ref="panelRef"
            class="relative w-full max-w-lg rounded-2xl border border-ink-200/70 bg-white p-6 shadow-soft outline-none"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
          >
            <button
              type="button"
              class="absolute right-4 top-4 text-ink-400 transition hover:text-ink-600 focus-visible:ring-brand-200"
              aria-label="Close modal"
              @click="emitClose"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" d="M5 5l10 10M15 5 5 15" />
              </svg>
            </button>

            <div class="space-y-4">
              <header v-if="$slots.header" class="pr-8 text-lg font-semibold text-ink-800">
                <slot name="header" />
              </header>
              <section class="text-sm text-ink-600">
                <slot />
              </section>
              <footer v-if="$slots.footer" class="pt-2">
                <slot name="footer" />
              </footer>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop-enter-active,
.modal-backdrop-leave-active {
  transition: opacity 0.18s ease;
}

.modal-backdrop-enter-from,
.modal-backdrop-leave-to {
  opacity: 0;
}

.modal-panel-enter-active,
.modal-panel-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.modal-panel-enter-from,
.modal-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
