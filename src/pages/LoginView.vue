<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/useAuth'

const router = useRouter()
const auth = useAuth()

const email = ref('')
const password = ref('')
const busy = ref(false)
const authed = computed(() => auth.isAuthed)

watch(
  () => auth.isAuthed,
  (isAuthed) => {
    if (isAuthed) router.push({ name: 'setup' })
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
  <div class="mx-auto max-w-md p-6 space-y-6">
    <h1 class="text-2xl font-bold">登入 FlowNest</h1>

    <button
      class="w-full rounded-2xl px-4 py-3 border shadow hover:shadow-md transition disabled:opacity-60"
      :disabled="busy"
      @click="doGoogle"
    >
      使用 Google 登入
    </button>

    <div class="text-center text-sm text-gray-500">或使用 Email / 密碼</div>

    <form class="space-y-3" @submit.prevent="doLogin">
      <input v-model="email" type="email" required placeholder="Email" class="w-full rounded-xl border px-3 py-2" />
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
          class="flex-1 rounded-xl bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
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

    <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>
    <p v-if="authed" class="text-sm text-green-600">已登入：{{ auth.user?.email }}</p>
  </div>
</template>
