<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { collection, limit, onSnapshot, orderBy, query, type Unsubscribe } from 'firebase/firestore'
import NewPostBar from '@/components/posts/NewPostBar.vue'
import PostCard from '@/components/posts/PostCard.vue'
import { db } from '@/lib/firebase'
import { useAuth } from '@/stores/useAuth'
import { useSessions } from '@/stores/useSessions'
import { sessionStatsHelpers } from '@/utils/sessionsStats'

interface WallPost {
  id: string
  author: string
  content: string
  createdAtLabel: string
  imageUrl?: string | null
  likeCount: number
  sessions: Array<{
    id?: string
    title: string
    minutesActual?: number
    minutesPlanned?: number
    finishedLabel: string
  }>
}

const auth = useAuth()
const sessions = useSessions()

const loading = ref(true)
const posts = ref<WallPost[]>([])
const error = ref('')
const notice = ref('')
let stop: Unsubscribe | null = null

const isAuthed = computed(() => auth.isAuthed)

function formatTimestamp(value: any) {
  const millis = sessionStatsHelpers.toMillis(value)
  if (!millis) return '剛剛'
  return new Date(millis).toLocaleString()
}

function attachListener() {
  if (stop) {
    stop()
    stop = null
  }
  const q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(50)
  )

  stop = onSnapshot(q, (snap) => {
    loading.value = false
    posts.value = snap.docs.map((doc) => {
      const data: any = doc.data()
      const rawSessions: Array<any> = Array.isArray(data.sessions)
        ? data.sessions
        : data.latestSession
          ? [data.latestSession]
          : []

      const mappedSessions = rawSessions.map((session: any) => {
        const finishedMillis = sessionStatsHelpers.toMillis(session.finishedAt)
        const finishedLabel = finishedMillis ? new Date(finishedMillis).toLocaleString() : '尚未完成'
        return {
          id: session.id ?? undefined,
          title: session.title ?? '專注時段',
          minutesActual: session.minutesActual ?? session.minutesPlanned ?? 0,
          minutesPlanned: session.minutesPlanned ?? session.minutesActual ?? 0,
          finishedLabel,
        }
      })

      return {
        id: doc.id,
        author: data.authorName ?? '匿名使用者',
        content: data.content ?? '',
        imageUrl: data.imageUrl ?? null,
        likeCount: data.likeCount ?? 0,
        createdAtLabel: formatTimestamp(data.createdAt),
        sessions: mappedSessions,
      }
    })
  }, (err) => {
    loading.value = false
    error.value = err?.message ?? String(err)
  })
}

onMounted(() => {
  sessions.listenMine().catch(() => {})
  attachListener()
})

onBeforeUnmount(() => {
  if (stop) {
    stop()
    stop = null
  }
})

function handlePosted() {
  notice.value = '已發布貼文！'
  window.setTimeout(() => {
    notice.value = ''
  }, 3000)
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 pb-24 pt-[env(safe-area-inset-top)]">
    <section class="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
      <header class="flex flex-col gap-4 text-left md:flex-row md:items-end md:justify-between">
        <div class="space-y-2">
          <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold tracking-[0.35em] text-emerald-600">COMMUNITY</span>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">流動留言牆</h1>
            <p class="mt-2 max-w-2xl text-sm text-slate-600">
              {{ isAuthed
                ? '分享你完成專注後的心得，也看看夥伴們如何保持節奏。'
                : '先完成一段專注再回來分享吧！登入後可挑選多筆成果一次發布。' }}
            </p>
          </div>
        </div>
        <router-link
          to="/timer"
          class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400"
        >
          開始一段專注
        </router-link>
      </header>

      <div class="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)] lg:items-start">
        <div class="space-y-6">
          <div v-if="notice" class="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {{ notice }}
          </div>
          <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 shadow-sm">
            {{ error }}
          </div>

          <div v-if="loading" class="grid place-content-center rounded-3xl border border-slate-200 bg-white/80 p-12 text-sm text-slate-400 shadow-inner">
            載入最新貼文...
          </div>

          <div v-else-if="posts.length === 0" class="rounded-3xl border border-emerald-100 bg-white/95 p-12 text-center shadow-lg shadow-emerald-100/60">
            <p class="text-base font-semibold text-emerald-600">目前還沒有貼文</p>
            <p class="mt-2 text-sm text-emerald-600/80">分享你的第一筆成果，鼓勵更多夥伴加入！</p>
          </div>

          <ul v-else class="space-y-5">
            <li v-for="post in posts" :key="post.id">
              <PostCard
                :author="post.author"
                :content="post.content"
                :created-at="post.createdAtLabel"
                :image-url="post.imageUrl"
                :like-count="post.likeCount"
                :sessions="post.sessions"
              />
            </li>
          </ul>
        </div>

        <aside class="space-y-6">
          <NewPostBar @posted="handlePosted" />

          <section class="rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-lg shadow-emerald-100/60">
            <h2 class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-500">分享小提醒</h2>
            <ul class="mt-3 space-y-2 text-sm text-slate-600">
              <li class="flex gap-2">
                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                選擇一至多筆完成紀錄，為每段專注留下重點。
              </li>
              <li class="flex gap-2">
                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                簡短描述帶來的改變、學到的事或下一步計畫。
              </li>
              <li class="flex gap-2">
                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                尊重彼此，保持正向互動，讓社群更加溫暖。
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  </main>
</template>
