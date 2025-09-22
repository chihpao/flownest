<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/useAuth'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const navItems = [
  { name: 'timer', label: '專注計時', to: { name: 'timer' } },
  { name: 'done', label: '成果紀錄', to: { name: 'done' } },
  { name: 'wall', label: '留言牆', to: { name: 'wall' } },
]

const showEmulatorBadge = import.meta.env.DEV || import.meta.env.VITE_USE_EMULATOR === 'true'

const menuOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const busyLogout = ref(false)

const isAuthed = computed(() => auth.isAuthed)
const initials = computed(() => {
  const name = auth.user?.displayName ?? auth.user?.email ?? ''
  return name ? name.charAt(0).toUpperCase() : '我'
})

function isActive(name: string) {
  if (name === 'timer') {
    return route.name === 'timer' || route.name === 'setup'
  }
  return route.name === name
}

function toggleMenu(event: MouseEvent) {
  event.stopPropagation()
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function handleDocumentClick(event: MouseEvent) {
  if (!dropdownRef.value) return
  if (!dropdownRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

async function goLogin() {
  await router.push({ name: 'login' }).catch(() => {})
}

async function goRecords() {
  closeMenu()
  await router.push({ name: 'done' }).catch(() => {})
}

async function logout() {
  busyLogout.value = true
  try {
    await auth.logout()
    closeMenu()
    await router.push({ name: 'welcome' }).catch(() => {})
  } finally {
    busyLogout.value = false
  }
}
</script>

<template>
  <nav class="sticky top-0 z-50 border-b border-white/30 bg-white/80 backdrop-blur">
    <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
      <router-link to="/" class="flex items-center gap-2 text-lg font-semibold text-emerald-600">
        <span>FlowNest</span>
      </router-link>

      <div class="hidden items-center gap-4 text-sm font-medium text-slate-600 md:flex">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.to"
          class="rounded-full px-4 py-2 transition"
          :class="isActive(item.name)
            ? 'bg-emerald-500 text-white shadow'
            : 'hover:bg-emerald-100 hover:text-emerald-600'
          "
        >
          {{ item.label }}
        </router-link>
      </div>

      <div class="flex items-center gap-3">
        <span v-if="showEmulatorBadge" class="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Emulator
        </span>

        <button
          v-if="!isAuthed"
          type="button"
          class="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
          @click="goLogin"
        >
          登入
        </button>

        <div v-else class="relative" ref="dropdownRef">
          <button
            type="button"
            class="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-600 shadow-sm transition hover:bg-emerald-50"
            @click="toggleMenu"
          >
            <span class="grid h-8 w-8 place-content-center rounded-full bg-emerald-500 text-sm font-bold text-white">
              {{ initials }}
            </span>
            <svg class="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <transition name="fade">
            <div
              v-if="menuOpen"
              class="absolute right-0 mt-2 w-48 rounded-2xl border border-emerald-100 bg-white p-2 text-sm text-slate-600 shadow-lg shadow-emerald-100/60"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-emerald-50"
                @click="goRecords"
              >
                成果紀錄
                <span class="text-xs text-emerald-500">Dashboard</span>
              </button>
              <button
                type="button"
                class="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                :disabled="busyLogout"
                @click="logout"
              >
                登出
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
