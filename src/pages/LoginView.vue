<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
const authed = computed(() => auth.isAuthed)

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

watch(
  () => auth.isAuthed,
  (isAuthed) => {
    if (!isAuthed) return
    const target = redirectTarget.value || LOGIN_REDIRECT_FALLBACK
    router.replace(target).catch(() => {})
  },
  { immediate: true }
)

async function doGoogle() {
  busy.value = true
  try {
    await auth.loginWithGoogle()
  } finally {
    busy.value = false
  }
}

async function doRegister() {
  busy.value = true
  try {
    await auth.registerWithEmail(email.value.trim(), password.value)
  } finally {
    busy.value = false
  }
}

async function doLogin() {
  busy.value = true
  try {
    await auth.loginWithEmail(email.value.trim(), password.value)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6 p-6">
    <header class="space-y-3">
      <h1 class="text-2xl font-bold text-slate-900">登入 FlowNest</h1>
      <div class="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
        <span class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">正在等待的操作</span>
        <p class="font-semibold text-emerald-700">{{ reasonMessage }}</p>
        <p v-if="hasExplicitRedirect" class="text-xs text-emerald-600">
          登入完成後會自動帶你回 <span class="font-mono text-emerald-700">{{ redirectLabel }}</span>
        </p>
      </div>
    </header>

    <button
      class="w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700 shadow transition hover:shadow-md disabled:opacity-60"
      :disabled="busy"
      @click="doGoogle"
    >
      使用 Google 登入
    </button>

    <div class="text-center text-sm text-slate-500">或使用 Email / 密碼</div>

    <form class="space-y-3" @submit.prevent="doLogin">
      <input v-model="email" type="email" required placeholder="電子郵件" class="w-full rounded-xl border px-3 py-2" />
      <input
        v-model="password"
        type="password"
        required
        minlength="6"
        placeholder="密碼（至少 6 碼）"
        class="w-full rounded-xl border px-3 py-2"
      />
      <div class="flex gap-3">
        <button
          type="submit"
          class="flex-1 rounded-xl bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-60"
          :disabled="busy"
        >
          登入
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
          :disabled="busy"
          @click="doRegister"
        >
          註冊
        </button>
      </div>
    </form>

    <p v-if="auth.error" class="text-sm text-rose-600">{{ auth.error }}</p>
    <p v-if="authed" class="text-sm text-emerald-600">已登入：{{ auth.user?.email }}</p>
  </div>
</template>