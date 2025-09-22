<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useSessions } from '@/stores/useSessions'

const sessions = useSessions()
const autoHideHandle = ref<number | null>(null)

const isVisible = computed(() => sessions.hasSyncNotice)
const message = computed(() => {
  const count = sessions.syncNotice.count
  return `已同步 ${count} 筆專注紀錄到雲端`
})

function clearTimer() {
  if (autoHideHandle.value !== null) {
    window.clearTimeout(autoHideHandle.value)
    autoHideHandle.value = null
  }
}

function queueAutoHide() {
  clearTimer()
  autoHideHandle.value = window.setTimeout(() => {
    sessions.dismissSyncNotice()
  }, 6000)
}

watch(isVisible, (visible) => {
  if (visible) {
    queueAutoHide()
  } else {
    clearTimer()
  }
})

onBeforeUnmount(() => {
  clearTimer()
})

function dismiss() {
  sessions.dismissSyncNotice()
}
</script>

<template>
  <transition name="sync-banner-fade">
    <div v-if="isVisible" class="pointer-events-none fixed inset-x-0 top-4 z-[999] flex justify-center px-4 sm:top-6">
      <div class="pointer-events-auto flex items-center gap-4 rounded-full border border-emerald-200 bg-white/95 px-5 py-3 text-sm text-emerald-700 shadow-xl shadow-emerald-200/60 backdrop-blur">
        <span class="font-medium">{{ message }}</span>
        <button
          type="button"
          class="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-400"
          @click="dismiss"
        >
          知道了
        </button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.sync-banner-fade-enter-active,
.sync-banner-fade-leave-active {
  transition: opacity 0.25s ease;
}

.sync-banner-fade-enter-from,
.sync-banner-fade-leave-to {
  opacity: 0;
}
</style>
