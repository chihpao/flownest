<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, type DocumentSnapshot, type Unsubscribe } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import NewPostBar from '@/components/posts/NewPostBar.vue'
import PostCard from '@/components/posts/PostCard.vue'
import { db } from '@/lib/firebase'
import { useAuth } from '@/stores/useAuth'
import { fetchFollowingIds, fetchLikedPostIds, followUser, likePost, unfollowUser, unlikePost } from '@/api/posts'

interface WallPost {
  id: string
  authorId: string
  authorName: string
  authorAvatar?: string | null
  contentText: string
  createdAtLabel: string
  imageUrl?: string | null
  likeCount: number
  liked: boolean
  likePending: boolean
  canLike: boolean
  canFollow: boolean
  following: boolean
  followPending: boolean
  durationSec?: number | null
  finishedAtLabel?: string | null
}

const PAGE_SIZE = 10

const auth = useAuth()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const notice = ref('')
const loadingMore = ref(false)
const hasMore = ref(true)

let stop: Unsubscribe | null = null
const headDocs = ref<DocumentSnapshot[]>([])
const olderDocs = ref<DocumentSnapshot[]>([])
const likedLookup = ref<Record<string, boolean>>({})
const likePending = ref<Record<string, boolean>>({})
const likeOverrides = ref<Record<string, number>>({})
const followLookup = ref<Record<string, boolean>>({})
const followPending = ref<Record<string, boolean>>({})

const currentUid = computed(() => auth.user?.uid ?? null)
const isAuthed = computed(() => auth.isAuthed)

function toMillis(value: any): number | null {
  if (!value) return null
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (typeof value.toMillis === 'function') {
    try {
      return value.toMillis()
    } catch {
      return null
    }
  }
  return null
}

function formatTimestamp(value: any) {
  const millis = toMillis(value)
  if (!millis) return '剛剛'
  return new Date(millis).toLocaleString()
}

function mapDocToPost(docSnap: DocumentSnapshot): WallPost {
  const data: any = docSnap.data() ?? {}
  const id = docSnap.id
  const authorId = data.authorId ?? ''
  const likeCount = likeOverrides.value[id] ?? data.likeCount ?? 0
  const liked = !!likedLookup.value[id]
  const following = authorId ? !!followLookup.value[authorId] : false
  const finishedLabel = data.finishedAt ? formatTimestamp(data.finishedAt) : null

  return {
    id,
    authorId,
    authorName: data.authorName ?? '匿名使用者',
    authorAvatar: data.authorAvatar ?? null,
    contentText: data.contentText ?? '',
    createdAtLabel: formatTimestamp(data.createdAt),
    imageUrl: data.imageUrl ?? null,
    likeCount,
    liked,
    likePending: !!likePending.value[id],
    canLike: isAuthed.value,
    canFollow: !!(isAuthed.value && authorId && authorId !== currentUid.value),
    following,
    followPending: !!followPending.value[authorId],
    durationSec: typeof data.durationSec === 'number' ? data.durationSec : null,
    finishedAtLabel: finishedLabel,
  }
}

const posts = computed(() => {
  const headIds = new Set(headDocs.value.map((doc) => doc.id))
  const mappedHead = headDocs.value.map(mapDocToPost)
  const mappedOlder = olderDocs.value
    .filter((doc) => !headIds.has(doc.id))
    .map(mapDocToPost)
  return [...mappedHead, ...mappedOlder]
})

function detachListener() {
  if (stop) {
    stop()
    stop = null
  }
}

function attachListener() {
  detachListener()
  const q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE)
  )

  stop = onSnapshot(q, (snap) => {
    loading.value = false
    const idsBefore = new Set(headDocs.value.map((doc) => doc.id))
    headDocs.value = snap.docs
    const currentIds = new Set(snap.docs.map((doc) => doc.id))
    if (idsBefore.size || olderDocs.value.length) {
      olderDocs.value = olderDocs.value.filter((doc) => !currentIds.has(doc.id))
    }
    if (snap.size < PAGE_SIZE) {
      hasMore.value = olderDocs.value.length > 0 ? hasMore.value : snap.size === PAGE_SIZE
    } else {
      hasMore.value = true
    }
  }, (err) => {
    loading.value = false
    error.value = err?.message ?? String(err)
  })
}

async function refreshRelationships() {
  if (!auth.user) {
    likedLookup.value = {}
    likeOverrides.value = {}
    followLookup.value = {}
    return
  }
  const [liked, follows] = await Promise.all([
    fetchLikedPostIds(),
    fetchFollowingIds(),
  ])

  const likedObj: Record<string, boolean> = {}
  liked.forEach((id) => { likedObj[id] = true })
  likedLookup.value = likedObj

  const followObj: Record<string, boolean> = {}
  follows.forEach((id) => { followObj[id] = true })
  followLookup.value = followObj
}

async function loadInitial() {
  loading.value = true
  error.value = ''
  hasMore.value = true
  olderDocs.value = []
  likeOverrides.value = {}
  await refreshRelationships()
  attachListener()
}

const lastDoc = computed(() => {
  const combined = [...headDocs.value, ...olderDocs.value]
  return combined[combined.length - 1] ?? null
})

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  const cursor = lastDoc.value
  if (!cursor) {
    hasMore.value = false
    return
  }
  loadingMore.value = true
  try {
    const nextQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(PAGE_SIZE)
    )
    const snap = await getDocs(nextQuery)
    if (snap.empty) {
      hasMore.value = false
      return
    }
    const existingIds = new Set([...headDocs.value, ...olderDocs.value].map((doc) => doc.id))
    const newDocs = snap.docs.filter((doc) => !existingIds.has(doc.id))
    olderDocs.value = [...olderDocs.value, ...newDocs]
    if (snap.size < PAGE_SIZE) {
      hasMore.value = false
    }
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    loadingMore.value = false
  }
}

function handlePosted() {
  notice.value = '已發布貼文！'
  window.setTimeout(() => {
    notice.value = ''
  }, 3000)
}

async function toggleLike(postId: string, liked: boolean) {
  if (!auth.user) {
    router.push({ name: 'login' }).catch(() => {})
    return
  }
  if (likePending.value[postId]) return
  likePending.value = { ...likePending.value, [postId]: true }
  try {
    const result = liked ? await unlikePost(postId) : await likePost(postId)
    likeOverrides.value = { ...likeOverrides.value, [postId]: result.likeCount }
    likedLookup.value = { ...likedLookup.value, [postId]: !liked }
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    const updated = { ...likePending.value }
    delete updated[postId]
    likePending.value = updated
  }
}

async function toggleFollow(authorId: string, following: boolean) {
  if (!auth.user) {
    router.push({ name: 'login' }).catch(() => {})
    return
  }
  if (!authorId || authorId === currentUid.value) return
  if (followPending.value[authorId]) return
  followPending.value = { ...followPending.value, [authorId]: true }
  try {
    if (following) {
      await unfollowUser(authorId)
    } else {
      await followUser(authorId)
    }
    followLookup.value = { ...followLookup.value, [authorId]: !following }
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    const updated = { ...followPending.value }
    delete updated[authorId]
    followPending.value = updated
  }
}

onMounted(() => {
  loadInitial().catch(() => {})
})

onBeforeUnmount(() => {
  detachListener()
})

watch(() => auth.user?.uid, async () => {
  await refreshRelationships()
})
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
                : '先完成一段專注再回來分享吧！登入後可快速分享你的成果。' }}
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
                :author-id="post.authorId"
                :author-name="post.authorName"
                :author-avatar="post.authorAvatar"
                :content-text="post.contentText"
                :created-at-label="post.createdAtLabel"
                :image-url="post.imageUrl"
                :like-count="post.likeCount"
                :liked="post.liked"
                :like-pending="post.likePending"
                :can-like="post.canLike"
                :can-follow="post.canFollow"
                :following="post.following"
                :follow-pending="post.followPending"
                :duration-sec="post.durationSec"
                :finished-at-label="post.finishedAtLabel"
                @toggle-like="toggleLike(post.id, post.liked)"
                @toggle-follow="toggleFollow(post.authorId, post.following)"
              />
            </li>
          </ul>

          <div v-if="posts.length && hasMore" class="flex justify-center pt-2">
            <button
              type="button"
              class="rounded-full border border-emerald-200 px-6 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-60"
              :disabled="loadingMore"
              @click="loadMore"
            >
              {{ loadingMore ? '載入中...' : '載入更多' }}
            </button>
          </div>
        </div>

        <aside class="space-y-6">
          <NewPostBar @posted="handlePosted" />

          <section class="rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-lg shadow-emerald-100/60">
            <h2 class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-500">分享小提醒</h2>
            <ul class="mt-3 space-y-2 text-sm text-slate-600">
              <li class="flex gap-2">
                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                挑選最近完成的成果，為每段專注留下重點。
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
