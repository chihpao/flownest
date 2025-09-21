<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/stores/useAuth'
import { useSessions } from '@/stores/useSessions'
import { seedDemo } from '@/dev/seed'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'

const auth = useAuth()
const sessions = useSessions()
const uid = computed(() => auth.user?.uid ?? '')

const log = ref('這裡會顯示查詢結果')
const lastThreadId = ref('')

function show(obj: any) {
  log.value = JSON.stringify(obj, null, 2)
}

async function onSeed() {
  if (!uid.value) return alert('請先登入（Email/密碼即可）')
  const res = await seedDemo(uid.value)
  lastThreadId.value = res.threadId
  show({ ok: true, threadId: res.threadId })
}

async function createSampleSession() {
  const now = Date.now()
  await sessions.logCompletion({
    title: 'DevTools 測試專注',
    minutesPlanned: 25,
    startedAt: now - 25 * 60_000,
    finishedAt: now,
  })
  show({ message: '已建立一筆範例 sessions', mode: sessions.mode })
}

async function querySessions() {
  await sessions.listenMine()
  show({ mode: sessions.mode, items: sessions.items })
}

async function queryMyPublicPosts() {
  if (!uid.value) return alert('請先登入')
  const q = query(
    collection(db, 'posts'),
    where('authorId', '==', uid.value),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  const snap = await getDocs(q)
  show(snap.docs.map(d => ({ id: d.id, ...d.data() })))
}

import { collection as col2, orderBy as ob2 } from 'firebase/firestore'
const inputThreadId = ref('')
async function queryMessages() {
  const tid = (inputThreadId.value || lastThreadId.value).trim()
  if (!tid) return alert('沒有 threadId，可先執行「建立假資料」取得')
  const q = query(
    col2(db, 'messages', tid, 'items'),
    ob2('createdAt', 'asc'),
    limit(50)
  )
  const snap = await getDocs(q)
  show({ threadId: tid, items: snap.docs.map(d => ({ id: d.id, ...d.data() })) })
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 p-6">
    <h1 class="text-xl font-bold">Dev 工具（Emulator 專用）</h1>

    <p>目前登入：<b>{{ uid || '（未登入）' }}</b></p>

    <div class="grid grid-cols-1 gap-3">
      <button class="rounded-xl bg-black px-4 py-2 text-white" @click="onSeed">
        建立假資料（users/sessions/posts/follows/messages）
      </button>

      <button class="rounded-xl border px-4 py-2" @click="createSampleSession">
        新增一筆範例專注紀錄（依登入狀態寫 local 或 Firestore）
      </button>

      <button class="rounded-xl border px-4 py-2" @click="querySessions">
        查看目前 sessions store 狀態
      </button>

      <button class="rounded-xl border px-4 py-2" @click="queryMyPublicPosts">
        查看自己的公開貼文（posts: public）
      </button>

      <div class="space-y-2">
        <div class="flex gap-2">
          <input
            v-model="inputThreadId"
            class="flex-1 rounded-xl border px-3 py-2"
            placeholder="輸入 threadId，未填則使用最近建立的"
          />
          <button class="rounded-xl border px-4 py-2" @click="queryMessages">
            查看聊天訊息（messages/{thread}/items）
          </button>
        </div>
        <p class="text-xs text-gray-500">
          最近建立的 threadId：<code>{{ lastThreadId || '尚未建立' }}</code>
        </p>
      </div>
    </div>

    <pre class="rounded-xl bg-gray-50 p-4 text-sm text-slate-700">{{ log }}</pre>
  </div>
</template>
