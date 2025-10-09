<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AvatarCreator from '@/components/auth/AvatarCreator.vue'
import { useAuth } from '@/stores/useAuth'

const auth = useAuth()
const router = useRouter()

const isAuthed = computed(() => auth.isAuthed)
const email = computed(() => auth.user?.email ?? '')
const uid = computed(() => auth.user?.uid ?? '')
const avatarUrl = computed(() => auth.user?.photoURL ?? '')

const displayName = ref(auth.user?.displayName ?? '')
watch(
  () => auth.user?.displayName,
  (value) => {
    displayName.value = value ?? ''
  }
)

const savingName = ref(false)
const nameMessage = ref('')
const nameError = ref('')

const showAvatarCreator = ref(false)
const avatarMessage = ref('')
const avatarLoading = ref(false)
const avatarError = ref('')
const avatarPreview = ref('')

watch(
  () => auth.user?.photoURL,
  () => {
    if (!avatarLoading.value) {
      avatarPreview.value = ''
    }
  }
)

function ensureAuth() {
  if (isAuthed.value) return true
  void router.push({ name: 'login' })
  return false
}

async function saveDisplayName() {
  if (!ensureAuth()) return
  const target = displayName.value.trim()
  if (!target) {
    nameError.value = '顯示名稱不能是空白。'
    return
  }
  if (target.length > 48) {
    nameError.value = '顯示名稱請限制在 48 個字以內。'
    return
  }

  savingName.value = true
  nameError.value = ''
  nameMessage.value = ''
  try {
    await auth.updateDisplayName(target)
    nameMessage.value = '名稱已更新。'
  } catch (error: any) {
    nameError.value = error?.message ?? '更新失敗，請稍後再試。'
  } finally {
    savingName.value = false
  }
}

function openAvatarCreator() {
  if (!ensureAuth()) return
  showAvatarCreator.value = true
  avatarMessage.value = ''
  avatarError.value = ''
}

async function handleAvatarSaved(newAvatar?: string) {
  showAvatarCreator.value = false
  avatarLoading.value = true
  avatarError.value = ''
  avatarMessage.value = ''
  if (newAvatar) {
    avatarPreview.value = newAvatar
  }
  try {
    await auth.refreshUser()
    avatarPreview.value = auth.user?.photoURL ?? avatarPreview.value
    avatarMessage.value = '頭像已更新，最近的畫面需要重新整理後才會全部同步。'
  } catch (error: any) {
    avatarError.value = error?.message ?? '頭像更新成功，但刷新資料時發生錯誤。'
  } finally {
    avatarLoading.value = false
  }
}

function handleAvatarSkip() {
  showAvatarCreator.value = false
}

async function goLogin() {
  await router.push({ name: 'login' }).catch(() => {})
}

const sendingReset = ref(false)
const resetMessage = ref('')
const resetError = ref('')

async function sendPasswordReset() {
  if (!ensureAuth()) return
  sendingReset.value = true
  resetMessage.value = ''
  resetError.value = ''
  try {
    await auth.sendPasswordReset()
    resetMessage.value = '我們已寄出重設密碼信件，請檢查您的信箱。'
  } catch (error: any) {
    resetError.value = error?.message ?? '寄送失敗，請稍後再試。'
  } finally {
    sendingReset.value = false
  }
}
</script>

<template>
  <main class="relative min-h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-4 pb-24 pt-8 sm:px-6">
    <section class="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header class="space-y-3">
        <h1 class="text-3xl font-bold text-slate-900 sm:text-4xl">帳戶設置</h1>
        <p class="text-sm text-slate-500 sm:text-base">
          管理您的基本資料、AI 頭像與登入安全設定。
        </p>
      </header>

      <div
        v-if="!isAuthed"
        class="rounded-3xl border border-emerald-200 bg-white/90 p-6 text-center shadow-lg shadow-emerald-100/50"
      >
        <p class="text-base font-semibold text-slate-700">請先登入以管理帳戶設定。</p>
        <button
          type="button"
          class="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-400"
          @click="goLogin"
        >
          前往登入頁
        </button>
      </div>

      <div
        v-else
        class="space-y-6"
      >
        <section class="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-emerald-100/60 sm:p-8">
          <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-slate-900">帳戶摘要</h2>
              <p class="text-sm text-slate-500">查看目前的登入資訊與識別碼。</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="relative h-16 w-16 overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 shadow-inner">
                <img
                  v-if="avatarPreview || avatarUrl"
                  :src="avatarPreview || avatarUrl"
                  alt="目前頭像"
                  class="h-full w-full object-cover transition duration-500"
                />
                <span
                  v-else
                  class="flex h-full w-full items-center justify-center text-2xl font-semibold text-emerald-500"
                >
                  {{ displayName.trim() ? displayName.trim().charAt(0) : email.charAt(0) }}
                </span>
              </div>
              <div class="flex flex-col items-start gap-1">
                <button
                  type="button"
                  class="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-500"
                  @click="openAvatarCreator"
                >
                  啟動 AI 頭像工作室
                </button>
                <p v-if="avatarPreview" class="text-[11px] text-emerald-500">
                  如未立即看到變更，重新整理或清除快取即可。
                </p>
              </div>
            </div>
          </header>

          <dl class="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div class="space-y-1">
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">電子郵件</dt>
              <dd class="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 font-medium text-slate-700">
                {{ email }}
              </dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">使用者識別碼</dt>
              <dd class="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 font-medium text-slate-700">
                {{ uid }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-emerald-100/60 sm:p-8">
          <header class="space-y-1">
            <h2 class="text-xl font-semibold text-slate-900">顯示名稱</h2>
            <p class="text-sm text-slate-500">這會顯示在留言與個人頁面上。</p>
          </header>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label class="flex-1 space-y-2 text-sm">
              <span class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">顯示名稱</span>
              <input
                v-model="displayName"
                type="text"
                maxlength="48"
                class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-base"
                :disabled="savingName"
              />
            </label>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-400 disabled:opacity-60"
              :disabled="savingName || !displayName.trim()"
              @click="saveDisplayName"
            >
              儲存名稱
            </button>
          </div>

          <p v-if="nameMessage" class="mt-2 text-xs font-semibold text-emerald-600">
            {{ nameMessage }}
          </p>
          <p v-if="nameError" class="mt-2 text-xs text-rose-600">
            {{ nameError }}
          </p>
        </section>

        <section class="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-emerald-100/60 sm:p-8">
          <header class="space-y-1">
            <h2 class="text-xl font-semibold text-slate-900">登入安全</h2>
            <p class="text-sm text-slate-500">建議定期更新密碼，並留意登入活動。</p>
          </header>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <p class="font-semibold text-slate-700">重設密碼</p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                直接從這裡寄送重設密碼信件到目前帳號信箱。
              </p>
              <button
                type="button"
                class="mt-3 inline-flex items-center justify-center rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-500 disabled:opacity-60"
                :disabled="sendingReset"
                @click="sendPasswordReset"
              >
                {{ sendingReset ? '寄送中…' : '寄送重設密碼連結' }}
              </button>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <p class="font-semibold text-slate-700">登入提醒</p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                建議開啟郵件通知，若發現可疑登入請立即更改密碼並通知我們。
              </p>
            </div>
          </div>

          <p v-if="resetMessage" class="mt-3 text-xs font-semibold text-emerald-600">
            {{ resetMessage }}
          </p>
          <p v-if="resetError" class="mt-3 text-xs text-rose-600">
            {{ resetError }}
          </p>
        </section>

        <div
          v-if="avatarLoading || avatarMessage || avatarError"
          class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700"
        >
          <span v-if="avatarLoading">正在同步新的頭像資料，請稍候…</span>
          <span v-else-if="avatarMessage">{{ avatarMessage }}</span>
          <span v-else-if="avatarError" class="text-rose-600">{{ avatarError }}</span>
        </div>
      </div>
    </section>

    <AvatarCreator :open="showAvatarCreator" @saved="handleAvatarSaved" @skip="handleAvatarSkip" />
  </main>
</template>

