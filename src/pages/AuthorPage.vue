<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, where, type DocumentSnapshot, type Unsubscribe } from 'firebase/firestore'
import PostCard from '@/components/posts/PostCard.vue'
import { db } from '@/lib/firebase'
import { useAuth } from '@/stores/useAuth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { fetchFollowingIds, fetchLikedPostIds, followUser, likePost, unfollowUser, unlikePost } from '@/api/posts'

interface AuthorPost {
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
  following: boolean
  followPending: boolean
  durationSec?: number | null
  finishedAtLabel?: string | null
}

const PAGE_SIZE = 10

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { pushLogin } = useLoginRedirect()

const authorId = computed(() => route.params.uid as string)
const safeAuthorId = computed(() => (authorId.value ? String(authorId.value) : ''))
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const error = ref('')
const likedLookup = ref<Record<string, boolean>>({})
const likeOverrides = ref<Record<string, number>>({})
const likePending = ref<Record<string, boolean>>({})
const followLookup = ref<Record<string, boolean>>({})
const followPending = ref<Record<string, boolean>>({})
let stop: Unsubscribe | null = null
const headDocs = ref<DocumentSnapshot[]>([])
const olderDocs = ref<DocumentSnapshot[]>([])

const isAuthed = computed(() => auth.isAuthed)
const currentUid = computed(() => auth.user?.uid ?? null)
const canFollowAuthor = computed(() => isAuthed.value && !!safeAuthorId.value && safeAuthorId.value !== currentUid.value)
const authorFollowing = computed(() => !!followLookup.value[safeAuthorId.value])
const authorFollowPending = computed(() => !!followPending.value[safeAuthorId.value])

const authorName = ref('')
const authorAvatar = ref<string | null>(null)

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

function mapDoc(docSnap: DocumentSnapshot): AuthorPost {
  const data: any = docSnap.data() ?? {}
  const id = docSnap.id
  const likeCount = likeOverrides.value[id] ?? data.likeCount ?? 0
  const liked = !!likedLookup.value[id]
  const finishedLabel = data.finishedAt ? formatTimestamp(data.finishedAt) : null

  if (!authorName.value) {
    authorName.value = data.authorName ?? '匿名使用者'
  }
  if (!authorAvatar.value) {
    authorAvatar.value = data.authorAvatar ?? null
  }

  return {
    id,
    authorId: data.authorId ?? safeAuthorId.value,
    authorName: data.authorName ?? (authorName.value || '匿名使用者'),
    authorAvatar: data.authorAvatar ?? authorAvatar.value ?? null,
    contentText: data.contentText ?? '',
    createdAtLabel: formatTimestamp(data.createdAt),
    imageUrl: data.imageUrl ?? null,
    likeCount,
    liked,
    likePending: !!likePending.value[id],
    canLike: isAuthed.value,
    following: !!followLookup.value[safeAuthorId.value],
    followPending: !!followPending.value[safeAuthorId.value],
    durationSec: typeof data.durationSec === 'number' ? data.durationSec : null,
    finishedAtLabel: finishedLabel,
  }
}

const posts = computed(() => {
  const headIds = new Set(headDocs.value.map((doc) => doc.id))
  const mappedHead = headDocs.value.map(mapDoc)
  const mappedOlder = olderDocs.value
    .filter((doc) => !headIds.has(doc.id))
    .map(mapDoc)
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
  if (!safeAuthorId.value) return
  const q = query(
    collection(db, 'posts'),
    where('authorId', '==', safeAuthorId.value),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE)
  )

  stop = onSnapshot(q, (snap) => {
    loading.value = false
    headDocs.value = snap.docs
    const currentIds = new Set(snap.docs.map((doc) => doc.id))
    olderDocs.value = olderDocs.value.filter((doc) => !currentIds.has(doc.id))
    if (snap.size < PAGE_SIZE) {
      hasMore.value = olderDocs.value.length > 0 ? hasMore.value : false
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
  if (!safeAuthorId.value) {
    error.value = '找不到作者'
    return
  }
  loading.value = true
  hasMore.value = true
  olderDocs.value = []
  likeOverrides.value = {}
  authorName.value = ''
  authorAvatar.value = null
  await refreshRelationships()
  attachListener()
}

const lastDoc = computed(() => {
  const combined = [...headDocs.value, ...olderDocs.value]
  return combined[combined.length - 1] ?? null
})

async function loadMore() {
  if (loadingMore.value || !hasMore.value || !safeAuthorId.value) return
  const cursor = lastDoc.value
  if (!cursor) {
    hasMore.value = false
    return
  }
  loadingMore.value = true
  try {
    const nextQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', safeAuthorId.value),
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

async function toggleLike(postId: string, liked: boolean) {
  if (!auth.user) {
    await pushLogin('support').catch(() => {})
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

async function toggleFollow(currentlyFollowing: boolean) {
  if (!auth.user) {
    await pushLogin('follow').catch(() => {})
    return
  }
  if (!safeAuthorId.value || safeAuthorId.value === currentUid.value) return
  if (followPending.value[safeAuthorId.value]) return
  followPending.value = { ...followPending.value, [safeAuthorId.value]: true }
  try {
    if (currentlyFollowing) {
      await unfollowUser(safeAuthorId.value)
    } else {
      await followUser(safeAuthorId.value)
    }
    followLookup.value = { ...followLookup.value, [safeAuthorId.value]: !currentlyFollowing }
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    const updated = { ...followPending.value }
    delete updated[safeAuthorId.value]
    followPending.value = updated
  }
}

function goBackToWall() {
  router.push({ name: 'wall' }).catch(() => {})
}

onMounted(() => {
  loadInitial().catch(() => {})
})

onBeforeUnmount(() => {
  detachListener()
})

watch(() => route.params.uid, () => {
  loadInitial().catch(() => {})
})

watch(() => auth.user?.uid, async () => {
  await refreshRelationships()
})
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 pb-24">
    <section class="mx-auto w-full max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-xl shadow-emerald-100/60 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <span
            v-if="authorAvatar"
            class="h-16 w-16 overflow-hidden rounded-full border border-emerald-200"
          >
            <img :src="authorAvatar" :alt="`${authorName} avatar`" class="h-full w-full object-cover" />
          </span>
          <span v-else class="grid h-16 w-16 place-content-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-600">
            {{ (authorName || '用戶').slice(0, 1) }}
          </span>
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">{{ authorName || '使用者' }}</h1>
            <p class="text-sm text-slate-500">分享他的專注成果與節奏</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            @click="goBackToWall"
          >
            返回留言牆
          </button>
          <button
            v-if="canFollowAuthor"
            type="button"
            class="rounded-full border px-4 py-2 text-sm font-semibold transition"
            :class="authorFollowing ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'"
            :disabled="authorFollowPending"
            @click="toggleFollow(authorFollowing)"
          >
            {{ authorFollowing ? '已追蹤' : '追蹤作者' }}
          </button>
        </div>
      </div>

      <div v-if="error" class="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-600 shadow-sm">
        {{ error }}
      </div>

      <div v-else-if="loading" class="grid place-content-center rounded-3xl border border-slate-200 bg-white/80 p-12 text-sm text-slate-400 shadow-inner">
        正在載入貼文...
      </div>

      <div v-else-if="posts.length === 0" class="rounded-3xl border border-emerald-100 bg-white/95 p-12 text-center shadow-lg shadow-emerald-100/60">
        <p class="text-base font-semibold text-emerald-600">這位作者還沒有分享任何貼文。</p>
        <p class="mt-2 text-sm text-emerald-600/80">追蹤他，第一時間獲得新分享！</p>
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
            :can-follow="false"
            :following="false"
            :follow-pending="false"
            :duration-sec="post.durationSec"
            :finished-at-label="post.finishedAtLabel"
            @toggle-like="toggleLike(post.id, post.liked)"
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
    </section>
  </main>
</template>

