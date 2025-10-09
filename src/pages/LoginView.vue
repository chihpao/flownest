<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AvatarCreator from '@/components/auth/AvatarCreator.vue'
import LoginMascot from '@/components/auth/LoginMascot.vue'
import { useAuth } from '@/stores/useAuth'
import {
  LOGIN_REASON_MESSAGES,
  LOGIN_REDIRECT_FALLBACK,
  sanitizeLoginReason,
  sanitizeLoginRedirect,
  type LoginRedirectReason,
} from '@/composables/useLoginRedirect'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const email = ref('')
const password = ref('')
const busy = ref(false)
const showPassword = ref(false)
const skipAutoRedirect = ref(false)
const showAvatarCreator = ref(false)
const mascotMood = ref<'idle' | 'password' | 'reveal'>('idle')
const passwordField = ref<HTMLInputElement | null>(null)
const authed = computed(() => auth.isAuthed)

const showRegisterForm = ref(false)
const registerNickname = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerConfirm = ref('')
const registerBusy = ref(false)
const registerError = ref('')
const registrationSuccess = ref(false)

const trimmedRegisterEmail = computed(() => registerEmail.value.trim())
const trimmedRegisterNickname = computed(() => registerNickname.value.trim())
const registerPasswordsMatch = computed(() => registerPassword.value === registerConfirm.value)
const registerEmailValid = computed(() => {
  const value = trimmedRegisterEmail.value
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
})
const registerFormReady = computed(() => (
  trimmedRegisterNickname.value.length >= 1 &&
  registerEmailValid.value &&
  registerPassword.value.length >= 6 &&
  registerPasswordsMatch.value
))

const initialRedirect = sanitizeLoginRedirect(route.query.redirect)
const redirectTarget = ref(initialRedirect ?? LOGIN_REDIRECT_FALLBACK)
const hasExplicitRedirect = initialRedirect != null
const redirectLabel = computed(() => {
  const value = redirectTarget.value
  if (!value) return ''
  return value.length > 64 ? `${value.slice(0, 61)}…` : value
})

const initialReason = sanitizeLoginReason(route.query.reason)
const reasonKey = ref<LoginRedirectReason>(initialReason ?? 'general')
const reasonMessage = computed(() => LOGIN_REASON_MESSAGES[reasonKey.value])

if (route.query.redirect || route.query.reason) {
  const cleaned: Record<string, any> = { ...route.query }
  delete cleaned.redirect
  delete cleaned.reason
  void router.replace({ name: 'login', query: cleaned })
}

function goRedirect() {
  const target = redirectTarget.value || LOGIN_REDIRECT_FALLBACK
  router.replace(target).catch(() => {})
}

watch(
  () => auth.isAuthed,
  (isAuthed) => {
    if (!isAuthed) return
    if (skipAutoRedirect.value) return
    goRedirect()
  },
  { immediate: true }
)

let revealTimer: number | null = null

function setMascotMood(mood: 'idle' | 'password' | 'reveal') {
  mascotMood.value = mood
}

function queueRevealReset() {
  if (typeof window === 'undefined') return
  if (revealTimer !== null) {
    window.clearTimeout(revealTimer)
    revealTimer = null
  }
  revealTimer = window.setTimeout(() => {
    if (typeof document === 'undefined') {
      setMascotMood('idle')
      return
    }
    const field = passwordField.value
    if (field && document.activeElement === field) {
      setMascotMood('password')
    } else {
      setMascotMood('idle')
    }
  }, 1100)
}

function handleEmailFocus() {
  if (mascotMood.value !== 'idle') {
    setMascotMood('idle')
  }
}

function handlePasswordFocus() {
  if (mascotMood.value !== 'reveal') {
    setMascotMood('password')
  }
}

function handlePasswordBlur() {
  if (mascotMood.value === 'reveal') return
  setMascotMood('idle')
}

function handlePasswordInput() {
  if (mascotMood.value === 'reveal') return
  setMascotMood('password')
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
  setMascotMood('reveal')
  queueRevealReset()
}

onBeforeUnmount(() => {
  if (revealTimer !== null) {
    if (typeof window !== 'undefined') {
      window.clearTimeout(revealTimer)
    }
    revealTimer = null
  }
})

async function doGoogle() {
  busy.value = true
  try {
    await auth.loginWithGoogle()
  } finally {
    busy.value = false
  }
}

async function doLogin() {
  if (busy.value) return
  busy.value = true
  try {
    await auth.loginWithEmail(email.value.trim(), password.value)
  } finally {
    busy.value = false
  }
}

async function handleAvatarSaved(_newAvatar?: string) {
  showAvatarCreator.value = false
  skipAutoRedirect.value = false
  try {
    await auth.refreshUser()
  } catch {}
  goRedirect()
}

function handleAvatarSkip() {
  showAvatarCreator.value = false
  skipAutoRedirect.value = false
  goRedirect()
}

function openRegisterForm() {
  showRegisterForm.value = true
  registerError.value = ''
  registrationSuccess.value = false
  registerEmail.value = email.value
  registerPassword.value = ''
  registerConfirm.value = ''
  registerNickname.value = ''
}

function cancelRegisterForm() {
  showRegisterForm.value = false
  registerBusy.value = false
  registerError.value = ''
  registerPassword.value = ''
  registerConfirm.value = ''
}

async function submitRegister() {
  if (!registerFormReady.value || registerBusy.value) return
  registerBusy.value = true
  registerError.value = ''
  registrationSuccess.value = false
  skipAutoRedirect.value = true
  try {
    await auth.registerWithEmail(trimmedRegisterEmail.value, registerPassword.value, trimmedRegisterNickname.value)
    await auth.logout()
    registrationSuccess.value = true
    showRegisterForm.value = false
    email.value = trimmedRegisterEmail.value
    password.value = ''
    registerPassword.value = ''
    registerConfirm.value = ''
  } catch (error: any) {
    registerError.value = error?.message ?? '註冊失敗，請稍後再試。'
  } finally {
    registerBusy.value = false
    skipAutoRedirect.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.25),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_55%)]">
    <div class="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-sky-50"></div>
    <main class="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-8">
      <div class="grid w-full max-w-6xl items-stretch gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section class="relative overflow-hidden rounded-[2.5rem] border border-white/50 bg-gradient-to-br from-emerald-200/60 via-white/75 to-sky-100/55 p-8 shadow-[0_45px_90px_-45px_rgba(16,185,129,0.4)] sm:p-12">
          <div class="pointer-events-none absolute inset-4 rounded-[2.2rem] border border-white/60 backdrop-blur-xl"></div>
          <div class="relative flex h-full flex-col items-center justify-center gap-6">
            <LoginMascot :mood="mascotMood" />
          </div>
        </section>

        <section class="relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white/90 p-6 shadow-[0_35px_60px_rgba(15,118,110,0.18)] sm:p-10">
          <div class="space-y-6">
            <header class="space-y-3">
              <h1 class="text-3xl font-bold text-slate-900 sm:text-4xl">登入 FlowNest</h1>
              <div class="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700 sm:text-base">
                <span class="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">登入理由</span>
                <p class="font-semibold text-emerald-700">{{ reasonMessage }}</p>
                <p v-if="hasExplicitRedirect" class="text-xs text-emerald-600">
                  完成後將自動回到 <span class="font-mono text-emerald-700">{{ redirectLabel }}</span>
                </p>
              </div>
            </header>

            <button
              class="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow transition hover:border-emerald-200 hover:text-emerald-600 hover:shadow-md disabled:opacity-60 sm:text-base"
              :disabled="busy"
              @click="doGoogle"
            >
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 text-xs font-bold text-white">
                G
              </span>
              使用 Google 一鍵登入
            </button>

            <div class="text-center text-xs uppercase tracking-[0.4em] text-slate-400 sm:text-sm">
              或是使用 Email / 密碼
            </div>

            <form class="space-y-4" @submit.prevent="doLogin">
              <label class="space-y-2 text-sm">
                <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email</span>
                <input
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="your@email.com"
                  class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-base"
                  :disabled="busy"
                  @focus="handleEmailFocus"
                />
              </label>

              <label class="space-y-2 text-sm">
                <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">密碼</span>
                <div class="relative">
                  <input
                    ref="passwordField"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    minlength="6"
                    autocomplete="current-password"
                    placeholder="至少 6 個字元"
                    class="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm text-slate-800 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-base"
                    :disabled="busy"
                    @focus="handlePasswordFocus"
                    @blur="handlePasswordBlur"
                    @input="handlePasswordInput"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-3 flex items-center rounded-full px-2 text-slate-400 transition hover:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50"
                    :aria-pressed="showPassword"
                    :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
                    :disabled="busy"
                    @click="togglePasswordVisibility"
                  >
                    <svg
                      v-if="showPassword"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      class="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M2 2l20 20" />
                      <path d="M9.5 5c3.2 0 6 1.68 8.05 5-1 1.6-2.1 2.8-3.33 3.65" />
                      <path d="M6.32 6.32C4.44 7.3 2.88 8.88 1.68 11c2.03 3.32 4.85 5 7.98 5 .74 0 1.46-.1 2.17-.3" />
                      <path d="M12.2 12.2a3 3 0 0 0 3.9 3.9" />
                    </svg>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      class="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M1.66 12c2.05-3.32 4.86-5 8-5s5.95 1.68 8 5c-2.05 3.32-4.86 5-8 5s-5.95-1.68-8-5Z" />
                      <circle cx="9.66" cy="12" r="2.5" />
                    </svg>
                  </button>
                </div>
              </label>

              <div
                v-if="showRegisterForm"
                class="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-inner shadow-emerald-100/60"
              >
                <div class="grid gap-3">
                  <label class="space-y-1 text-sm">
                    <span class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">暱稱</span>
                    <input
                      v-model="registerNickname"
                      type="text"
                      placeholder="想讓大家怎麼稱呼你？"
                      class="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-base"
                      :disabled="registerBusy"
                    />
                  </label>

                  <label class="space-y-1 text-sm">
                    <span class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">電子郵件</span>
                    <input
                      v-model="registerEmail"
                      type="email"
                      placeholder="example@domain.com"
                      class="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-base"
                      :disabled="registerBusy"
                    />
                  </label>

                  <label class="space-y-1 text-sm">
                    <span class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">密碼</span>
                    <input
                      v-model="registerPassword"
                      type="password"
                      minlength="6"
                      placeholder="至少 6 個字元"
                      class="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-base"
                      :disabled="registerBusy"
                    />
                  </label>

                  <label class="space-y-1 text-sm">
                    <span class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">確認密碼</span>
                    <input
                      v-model="registerConfirm"
                      type="password"
                      minlength="6"
                      placeholder="再輸入一次密碼"
                      class="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-base"
                      :disabled="registerBusy"
                    />
                  </label>
                </div>

                <p v-if="registerPassword && !registerPasswordsMatch" class="text-xs text-rose-600">
                  兩次輸入的密碼不一致。
                </p>

                <div class="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    class="flex-1 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-300/50 transition hover:bg-emerald-400 disabled:opacity-60 sm:text-base"
                    :disabled="!registerFormReady || registerBusy"
                    @click="submitRegister"
                  >
                    確認
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded-2xl border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-500 disabled:opacity-60 sm:text-base"
                    :disabled="registerBusy"
                    @click="cancelRegisterForm"
                  >
                    取消
                  </button>
                </div>

                <p v-if="registerError" class="text-xs text-rose-600">
                  {{ registerError }}
                </p>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  class="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-600 disabled:opacity-60 sm:text-base"
                  :disabled="busy"
                >
                  登入
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-600 disabled:opacity-60 sm:text-base"
                  :disabled="busy"
                  @click="showRegisterForm ? cancelRegisterForm() : openRegisterForm()"
                >
                  {{ showRegisterForm ? '返回登入' : '建立新帳號' }}
                </button>
              </div>
            </form>

            <div class="space-y-2 text-sm">
              <p
                v-if="registrationSuccess"
                class="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-sm font-medium text-emerald-700"
              >
                帳戶註冊成功，請使用 Email、密碼登入。
              </p>
              <p
                v-if="registerError && !showRegisterForm"
                class="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-600"
              >
                {{ registerError }}
              </p>
              <p v-if="auth.error" class="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-600">
                {{ auth.error }}
              </p>
              <p v-if="authed" class="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-700">
                已登入：{{ auth.user?.email }}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>

    <AvatarCreator :open="showAvatarCreator" @saved="handleAvatarSaved" @skip="handleAvatarSkip" />
  </div>
</template>




