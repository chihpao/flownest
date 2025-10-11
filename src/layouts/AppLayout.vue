<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from '@/components/ui/Button.vue'
import ToastProvider from '@/components/ui/ToastProvider.vue'
import { useAuth } from '@/stores/useAuth'
import { useChatThreads } from '@/stores/useChatThreads'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import pkg from '../../package.json' with { type: 'json' }

type NavItem = {
  name: string
  label: string
  to: { name: string }
  requiresAuth?: boolean
}

const version = `v${pkg.version ?? '0.0.0'}`

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const chatThreads = useChatThreads()
const { pushLogin } = useLoginRedirect()

const navItems: NavItem[] = [
  { name: 'timer', label: '專注計時', to: { name: 'timer' } },
  { name: 'wall', label: '動態牆', to: { name: 'wall' } },
  { name: 'done', label: '完成紀錄', to: { name: 'done' } },
  { name: 'chat', label: '聊天', to: { name: 'chat' } },
  { name: 'profile', label: '個人設定', to: { name: 'account-settings' }, requiresAuth: true },
]

const showEmulatorBadge = import.meta.env.DEV || import.meta.env.VITE_USE_EMULATOR === 'true'

const menuOpen = ref(false)
const mobileOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const busyLogout = ref(false)

const isAuthed = computed(() => auth.isAuthed)
const unreadTotal = computed(() => chatThreads.unreadTotal)
const unreadBadge = computed(() => (unreadTotal.value > 99 ? '99+' : String(unreadTotal.value)))

const initials = computed(() => {
  const name = auth.user?.displayName ?? auth.user?.email ?? ''
  return name ? name.charAt(0).toUpperCase() : '??'
})

function navIsActive(item: NavItem) {
  if (item.name === 'timer') {
    return route.name === 'timer' || route.name === 'setup'
  }
  if (item.name === 'profile') {
    return route.name === 'account-settings'
  }
  return route.name === item.name
}

async function goLogin() {
  await pushLogin('general').catch(() => {})
}

async function goRecords() {
  menuOpen.value = false
  await router.push({ name: 'done' }).catch(() => {})
}

async function go帳戶() {
  menuOpen.value = false
  await router.push({ name: 'account-settings' }).catch(() => {})
}

async function goChat() {
  menuOpen.value = false
  await router.push({ name: 'chat' }).catch(() => {})
}

async function logout() {
  if (busyLogout.value) return
  busyLogout.value = true
  try {
    await auth.logout()
    menuOpen.value = false
    await router.push({ name: 'welcome' }).catch(() => {})
  } finally {
    busyLogout.value = false
  }
}

function toggleMenu(event?: MouseEvent) {
  event?.stopPropagation()
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function toggleMobileNav() {
  mobileOpen.value = !mobileOpen.value
}

function handleDocumentClick(event: MouseEvent) {
  if (!dropdownRef.value) return
  if (!dropdownRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

async function handleNav(item: NavItem) {
  if (item.requiresAuth && !isAuthed.value) {
    await goLogin()
    return
  }
  mobileOpen.value = false
  await router.push(item.to).catch(() => {})
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="relative min-h-screen bg-gradient-to-b from-brand-50 via-accent-50/60 to-white text-ink-900">
    <div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_50%)]"></div>

    <header class="sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <div class="flex items-center gap-3">
          <RouterLink to="/" class="flex items-center gap-2 text-lg font-semibold text-brand-600 hover:text-brand-700">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-500 text-sm font-bold text-white shadow-soft">FN</span>
            <span>FlowNest</span>
          </RouterLink>
          <span
            v-if="showEmulatorBadge"
            class="hidden rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 sm:inline-flex"
          >
            Emulator
          </span>
        </div>

        <nav class="hidden items-center gap-1 text-sm font-medium md:flex">
          <button
            v-for="item in navItems"
            :key="item.name"
            type="button"
            class="relative rounded-full px-4 py-2 transition"
            :class="[
              navIsActive(item)
                ? 'bg-brand-500 text-white shadow-soft'
                : 'text-ink-500 hover:bg-brand-100/60 hover:text-brand-700',
            ]"
            @click="handleNav(item)"
          >
            <span class="inline-flex items-center gap-2">
              {{ item.label }}
              <span
                v-if="item.name === 'chat' && unreadTotal"
                class="badge !bg-rose-100 !text-rose-600"
              >
                {{ unreadBadge }}
              </span>
            </span>
          </button>
        </nav>

        <div class="flex items-center gap-2">
          <span
            v-if="showEmulatorBadge"
            class="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 md:hidden"
          >
            Emulator
          </span>

          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-200/60 text-ink-500 transition hover:text-brand-600 md:hidden"
            @click="toggleMobileNav"
            aria-label="Toggle navigation"
          >
            <svg v-if="!mobileOpen" class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" d="M3 6h14M3 10h14M3 14h14" />
            </svg>
            <svg v-else class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>

          <Button
            v-if="!isAuthed"
            variant="primary"
            @click="goLogin"
          >
            登入 / 註冊
          </Button>

          <div v-else ref="dropdownRef" class="relative">
            <button
              type="button"
              class="flex items-center gap-3 rounded-2xl border border-ink-200/80 bg-white/80 px-3 py-2 text-sm font-semibold text-ink-600 shadow-soft transition hover:border-brand-200 hover:text-brand-700"
              @click="toggleMenu"
            >
              <span class="grid h-9 w-9 place-content-center rounded-2xl bg-brand-500 text-base font-bold text-white shadow-soft">
                {{ initials }}
              </span>
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 8l5 5 5-5" />
              </svg>
            </button>

            <Transition name="dropdown-fade">
              <div
                v-if="menuOpen"
                class="absolute right-0 mt-3 w-56 rounded-2xl border border-ink-200 bg-white/95 p-2 text-sm text-ink-600 shadow-soft"
              >
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-xl px-3 py-2 transition hover:bg-brand-50/80"
                  @click="goRecords"
                >
                  完成總覽
                  <span class="text-xs text-brand-500">儀表板</span>
                </button>
                <button
                  type="button"
                  class="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 transition hover:bg-brand-50/80"
                  @click="go帳戶"
                >
                  個人資料設定
                  <span class="text-xs text-brand-500">帳戶</span>
                </button>
                <button
                  type="button"
                  class="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 transition hover:bg-brand-50/80"
                  @click="goChat"
                >
                  私人聊天
                  <span v-if="unreadTotal" class="badge !bg-rose-100 !text-rose-600">{{ unreadBadge }}</span>
                </button>
                <button
                  type="button"
                  class="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-rose-600 transition hover:bg-rose-50"
                  :disabled="busyLogout"
                  @click="logout"
                >
                  登出
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <Transition name="dropdown-fade">
        <div v-if="mobileOpen" class="mx-auto mb-4 w-full max-w-6xl px-4 sm:px-6 md:hidden">
          <div class="rounded-2xl border border-ink-200/60 bg-white/90 p-2 shadow-soft">
            <button
              v-for="item in navItems"
              :key="item.name"
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition"
              :class="navIsActive(item) ? 'bg-brand-500 text-white shadow-soft' : 'text-ink-600 hover:bg-brand-50/80 hover:text-brand-700'"
              @click="handleNav(item)"
            >
              <span>{{ item.label }}</span>
              <span
                v-if="item.name === 'chat' && unreadTotal"
                class="badge !bg-rose-100 !text-rose-600"
              >
                {{ unreadBadge }}
              </span>
            </button>
          </div>
        </div>
      </Transition>
    </header>

    <section v-if="$slots.banner" class="border-b border-white/60 bg-white/70">
      <div class="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <slot name="banner" />
      </div>
    </section>

    <main class="relative">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <slot />
      </div>
    </main>

    <footer class="border-t border-white/70 bg-white/80">
      <div class="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-4 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span class="font-medium text-ink-600">FlowNest {{ version }}</span>
        <div class="flex items-center gap-3">
          <a href="https://flownest.app/privacy" target="_blank" rel="noopener" class="hover:text-brand-600">隱私權政策</a>
          <a href="https://flownest.app/terms" target="_blank" rel="noopener" class="hover:text-brand-600">服務條款</a>
        </div>
      </div>
    </footer>

    <ToastProvider />
  </div>
</template>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

