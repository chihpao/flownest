<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Timestamp, type Unsubscribe } from 'firebase/firestore'
import { useAuth } from '@/stores/useAuth'
import { useChatThreads } from '@/stores/useChatThreads'
import { fetchFollowingIds } from '@/api/posts'
import { fetchUsersByIds, type UserProfile } from '@/api/users'
import ChatSharePreview from '@/components/chat/ChatSharePreview.vue'
import { extractFirstUrl, fetchLinkPreview } from '@/utils/linkPreview'
import {
  buildChatId,
  listenToMessages,
  markThreadAsRead,
  sendMessage,
  type ChatMessage,
  type ChatThreadData,
  type ChatMessageType,
  type ChatSharePayload,
  type SendMessageInput,
} from '@/api/chat'

interface ChatPartner {
  uid: string
  displayName: string
  photoURL: string
  email: string
}

interface ConversationItem {
  chatId: string
  partner: ChatPartner
  lastMessage: string
  lastSenderId: string
  lastMessageAt: number | null
  lastMessageType: ChatMessageType
  lastShare: ChatSharePayload | null
  unreadCount: number
}

const auth = useAuth()
const router = useRouter()
const chatThreads = useChatThreads()

const contactMap = ref<Record<string, ChatPartner>>({})
const threadMap = ref<Record<string, ChatThreadData>>({})
const activeChatId = ref<string | null>(null)
const messages = ref<ChatMessage[]>([])
const messageDraft = ref('')
const loadingContacts = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)
const error = ref('')
const followingsLoaded = ref(false)

const messagesUnsub = ref<Unsubscribe | null>(null)
const messageListRef = ref<HTMLDivElement | null>(null)

const contactFetchPending = new Set<string>()

const myUid = computed(() => auth.user?.uid ?? null)
const isAuthed = computed(() => auth.isAuthed)
const contactList = computed(() => Object.values(contactMap.value))

const conversations = computed<ConversationItem[]>(() => {
  const uid = myUid.value
  if (!uid) return []
  const items: ConversationItem[] = []
  for (const partner of contactList.value) {
    if (partner.uid === uid) continue
    const chatId = buildChatId(uid, partner.uid)
    const thread = threadMap.value[chatId]
    const lastMessage = thread?.lastMessage ?? ''
    const lastSenderId = thread?.lastSenderId ?? ''
    const lastMessageAt = toMillis(thread?.lastMessageAt ?? thread?.updatedAt ?? null)
    const lastMessageType: ChatMessageType = thread?.lastMessageType ?? 'text'
    const lastShare = thread?.lastShare ?? null
    const unreadCount = thread?.unreadCount?.[uid] ?? 0
    items.push({ chatId, partner, lastMessage, lastSenderId, lastMessageAt, lastMessageType, lastShare, unreadCount })
  }
  items.sort((a, b) => {
    const diff = (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0)
    if (diff !== 0) return diff
    return a.partner.displayName.localeCompare(b.partner.displayName)
  })
  return items
})

const activeConversation = computed(() => conversations.value.find((c) => c.chatId === activeChatId.value) ?? null)
const activePartner = computed(() => activeConversation.value?.partner ?? null)

function toMillis(value: any): number | null {
  if (!value) return null
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value.toMillis === 'function') {
    try {
      return value.toMillis()
    } catch {
      return null
    }
  }
  return null
}

function formatTimeLabel(millis: number | null) {
  if (!millis) return ''
  const date = new Date(millis)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })
}

function formatMessageTime(timestamp?: Timestamp) {
  const millis = toMillis(timestamp)
  if (!millis) return ''
  const date = new Date(millis)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function messagePreview(item: ConversationItem) {
  const isMine = item.lastSenderId === myUid.value
  const prefix = isMine ? '我: ' : ''
  if (item.lastMessageType === 'share') {
    const base = (item.lastShare?.title ?? item.lastShare?.url ?? item.lastMessage ?? '').trim()
    if (!base) return prefix + '分享了一則內容'
    return prefix + (base.length > 42 ? `${base.slice(0, 42)}…` : base)
  }
  const message = (item.lastMessage ?? '').replace(/\s+/g, ' ').trim()
  if (!message) {
    return prefix + '發送了一則訊息'
  }
  return prefix + (message.length > 42 ? `${message.slice(0, 42)}…` : message)
}

const MESSAGE_LINK_REGEX = /https?:\/\/[^\s]+/gi

function formatMessageBody(text?: string) {
  if (!text) return ''
  const escaped = escapeHtml(text)
  const withLinks = escaped.replace(
    MESSAGE_LINK_REGEX,
    (match) =>
      '<a href="' +
      match +
      '" target="_blank" rel="noopener noreferrer" class="underline decoration-emerald-300 hover:decoration-emerald-500">' +
      match +
      '</a>'
  )
  return withLinks.replace(/\r?\n/g, '<br />')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function initialsFrom(partner: ChatPartner) {
  const source = partner.displayName || partner.email || ''
  return source ? source.charAt(0).toUpperCase() : '友'
}

async function ensureContacts(uids: string[]) {
  const uid = myUid.value
  const missing = uids.filter((id) => id && id !== uid && !contactMap.value[id] && !contactFetchPending.has(id))
  if (!missing.length) return
  missing.forEach((id) => contactFetchPending.add(id))
  try {
    const profiles = await fetchUsersByIds(missing)
    if (Object.keys(profiles).length) {
      const updated = { ...contactMap.value }
      for (const [id, profile] of Object.entries<UserProfile>(profiles)) {
        updated[id] = {
          uid: id,
          displayName: profile.displayName || profile.email || '匿名使用者',
          photoURL: profile.photoURL,
          email: profile.email,
        }
      }
      contactMap.value = updated
    }
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    missing.forEach((id) => contactFetchPending.delete(id))
  }
}

async function loadFollowings() {
  if (!isAuthed.value) {
    contactMap.value = {}
    followingsLoaded.value = true
    return
  }
  loadingContacts.value = true
  try {
    const ids = await fetchFollowingIds()
    await ensureContacts(Array.from(ids))
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    followingsLoaded.value = true
    loadingContacts.value = false
  }
}

function applyThreads(list: ChatThreadData[]) {
  const map: Record<string, ChatThreadData> = {}
  const others = new Set<string>()
  const uid = myUid.value
  for (const thread of list) {
    map[thread.id] = thread
    if (uid) {
      thread.participantIds.forEach((id) => {
        if (id && id !== uid) others.add(id)
      })
    }
  }
  threadMap.value = map
  if (others.size) {
    void ensureContacts(Array.from(others))
  }
}


function stopMessages() {
  if (messagesUnsub.value) {
    messagesUnsub.value()
    messagesUnsub.value = null
  }
}

function resetState() {
  stopMessages()
  contactMap.value = {}
  threadMap.value = {}
  messages.value = []
  activeChatId.value = null
  followingsLoaded.value = false
}

function scrollMessagesToBottom(behavior: ScrollBehavior = 'auto') {
  nextTick(() => {
    const el = messageListRef.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  })
}

function selectConversation(partnerId: string) {
  if (!isAuthed.value) {
    router.push({ name: 'login' }).catch(() => {})
    return
  }
  const uid = myUid.value
  if (!uid) return
  const chatId = buildChatId(uid, partnerId)
  if (activeChatId.value === chatId) return
  chatThreads.clearThreadUnread(chatId, uid)
  activeChatId.value = chatId
}

async function handleSend() {
  if (!isAuthed.value) {
    router.push({ name: 'login' }).catch(() => {})
    return
  }
  const partner = activePartner.value
  if (!partner) return
  const rawText = messageDraft.value
  const text = rawText.trim()
  if (!text || sending.value) return
  sending.value = true
  error.value = ''
  try {
    let payload: SendMessageInput = text
    const url = extractFirstUrl(text)
    if (url) {
      const preview = await fetchLinkPreview(url)
      if (preview) {
        payload = { text, type: 'share', share: preview }
      }
    }
    await sendMessage(partner.uid, payload)
    messageDraft.value = ''
    scrollMessagesToBottom('smooth')
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    sending.value = false
  }
}

watch(myUid, (uid) => {
  resetState()
  if (!uid) return
  void loadFollowings()
}, { immediate: true })

watch(() => chatThreads.threads, (items) => {
  applyThreads(items)
}, { immediate: true })

watch(() => chatThreads.error, (message) => {
  if (message) {
    error.value = message
  }
})

watch(conversations, (list) => {
  if (!isAuthed.value) return
  if (!list.length) {
    activeChatId.value = null
    return
  }
  if (activeChatId.value) return
  activeChatId.value = list[0]?.chatId ?? null
}, { immediate: true })

watch(activeChatId, (chatId, prev) => {
  if (chatId === prev) return
  stopMessages()
  messages.value = []
  const uid = myUid.value
  if (!chatId || !uid) return
  loadingMessages.value = true
  chatThreads.clearThreadUnread(chatId, uid)
  messagesUnsub.value = listenToMessages(chatId, (items) => {
    messages.value = items
    loadingMessages.value = false
    scrollMessagesToBottom('auto')
    void markThreadAsRead(chatId, uid)
    chatThreads.clearThreadUnread(chatId, uid)
  }, (err) => {
    loadingMessages.value = false
    error.value = err?.message ?? String(err)
  })
})

onBeforeUnmount(() => {
  resetState()
})
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 pb-24 pt-[env(safe-area-inset-top)]">
    <section class="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
      <header class="flex flex-col gap-4 text-left md:flex-row md:items-end md:justify-between">
        <div class="space-y-2">
          <span class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold tracking-[0.35em] text-emerald-600">MESSAGES</span>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">私人即時聊天</h1>
            <p class="mt-2 max-w-2xl text-sm text-slate-600">
              與專注夥伴保持連結，分享進度、交換靈感或互相打氣。追蹤的夥伴會出現在左側列表中，點擊即可展開對話。
            </p>
          </div>
        </div>
        <router-link
          v-if="isAuthed"
          to="/wall"
          class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400"
        >
          返回社群動態
        </router-link>
      </header>

      <div v-if="error" class="rounded-3xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 shadow-sm">
        {{ error }}
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside class="space-y-4">
          <section class="h-full rounded-3xl border border-emerald-100 bg-white/95 p-4 shadow-lg shadow-emerald-100/60">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-500">我的圈子</h2>
              <span v-if="loadingContacts" class="text-xs text-emerald-500">載入好友...</span>
            </div>

            <div v-if="!isAuthed" class="mt-6 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-700">
              <p class="font-semibold">登入後即可展開私人聊天</p>
              <p>追蹤感興趣的夥伴後，他們會出現在這裡，點一下就能開始對話。</p>
              <router-link
                to="/login"
                class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-400"
              >
                立即登入
              </router-link>
            </div>

            <ul v-else-if="conversations.length" class="mt-4 space-y-2">
              <li
                v-for="conversation in conversations"
                :key="conversation.chatId"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition"
                  :class="conversation.chatId === activeChatId
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200/60'
                    : 'hover:bg-emerald-50'
                  "
                  @click="selectConversation(conversation.partner.uid)"
                >
                  <span class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-600">
                    <img
                      v-if="conversation.partner.photoURL"
                      :src="conversation.partner.photoURL"
                      alt=""
                      class="h-full w-full object-cover"
                    />
                    <span v-else>{{ initialsFrom(conversation.partner) }}</span>
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                      <p class="truncate text-sm font-semibold" :class="conversation.chatId === activeChatId ? 'text-white' : 'text-slate-800'">
                        {{ conversation.partner.displayName }}
                      </p>
                      <span class="text-xs" :class="conversation.chatId === activeChatId ? 'text-emerald-50/80' : 'text-emerald-500'">
                        {{ formatTimeLabel(conversation.lastMessageAt) }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <p class="flex-1 truncate text-xs" :class="conversation.chatId === activeChatId ? 'text-emerald-50/80' : 'text-slate-500'">
                        {{ messagePreview(conversation) }}
                      </p>
                      <span
                        v-if="conversation.unreadCount"
                        class="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-white/90 px-2 text-[0.65rem] font-semibold text-emerald-600"
                      >
                        {{ conversation.unreadCount }}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            </ul>

            <div v-else-if="followingsLoaded" class="mt-6 space-y-3 rounded-2xl border border-emerald-100 bg-white/90 p-4 text-sm text-emerald-700">
              <p class="font-semibold text-emerald-600">尚未追蹤任何夥伴</p>
              <p class="text-emerald-600/80">去社群動態頁逛逛，追蹤幾位讓你受到啟發的朋友，回來就能開始聊天。</p>
              <router-link
                to="/wall"
                class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-400"
              >
                前往社群圈
              </router-link>
            </div>

            <div v-else class="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-500">
              正在整理你的夥伴清單...
            </div>
          </section>
        </aside>

        <section class="rounded-3xl border border-emerald-100 bg-white/95 shadow-lg shadow-emerald-100/60">
          <div v-if="!isAuthed" class="flex h-full flex-col items-center justify-center gap-4 p-10 text-center text-slate-500">
            <p class="text-lg font-semibold text-slate-700">登入後即可建立私人訊息</p>
            <p class="max-w-sm text-sm">加入 FlowNest 社群，追蹤專注夥伴並開啟一對一的即時對談。</p>
            <router-link
              to="/login"
              class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400"
            >
              立即登入
            </router-link>
          </div>

          <div v-else-if="!activePartner" class="flex h-full flex-col items-center justify-center gap-4 p-10 text-center text-slate-500">
            <p class="text-lg font-semibold text-slate-700">選一位夥伴開始聊天</p>
            <p class="max-w-sm text-sm">從左側選擇你追蹤的人，或到社群圈找幾位新的朋友。</p>
          </div>

          <div v-else class="flex h-full flex-col">
            <header class="flex items-center justify-between border-b border-emerald-100 px-6 py-4">
              <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-600">
                  <img
                    v-if="activePartner.photoURL"
                    :src="activePartner.photoURL"
                    alt=""
                    class="h-full w-full object-cover"
                  />
                  <span v-else>{{ initialsFrom(activePartner) }}</span>
                </span>
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ activePartner.displayName }}</p>
                  <p class="text-xs text-slate-500">保持專注，也別忘了適時休息。</p>
                </div>
              </div>
            </header>

            <div ref="messageListRef" class="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <div v-if="loadingMessages" class="grid min-h-[180px] place-content-center text-sm text-slate-400">載入訊息中...</div>

              <template v-else>
                <div v-if="messages.length === 0" class="grid min-h-[180px] place-content-center text-center text-sm text-slate-400">
                  開始第一則訊息，打個招呼吧！
                </div>

                                <ul v-else class="space-y-3">
                  <li
                    v-for="message in messages"
                    :key="message.id"
                    class="flex"
                    :class="message.senderId === myUid ? 'justify-end' : 'justify-start'"
                  >
                    <div class="max-w-[75%] space-y-1">
                      <div class="space-y-2">
                        <div
                          v-if="message.text"
                          class="rounded-2xl px-4 py-2 text-sm shadow"
                          :class="message.senderId === myUid
                            ? 'bg-emerald-500 text-white shadow-emerald-200/60'
                            : 'bg-white text-slate-700 shadow-emerald-100/30'
                          "
                        >
                          <p class="whitespace-pre-line break-words" v-html="formatMessageBody(message.text)"></p>
                        </div>
                        <ChatSharePreview
                          v-if="message.type === 'share' && message.share"
                          :share="message.share"
                          :variant="message.senderId === myUid ? 'outgoing' : 'incoming'"
                        />
                      </div>
                      <p class="text-xs"
                        :class="message.senderId === myUid ? 'text-emerald-400 text-right' : 'text-slate-400 text-left'"
                      >
                        {{ formatMessageTime(message.timestamp) }}
                      </p>
                    </div>
                  </li>
                </ul>
              </template>
            </div>

            <footer class="border-t border-emerald-100 bg-white/80 px-6 py-4">
              <form class="flex items-end gap-3" @submit.prevent="handleSend">
                <textarea
                  v-model="messageDraft"
                  rows="2"
                  placeholder="輸入訊息..."
                  class="h-20 flex-1 resize-none rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-700 shadow-inner shadow-emerald-100/50 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  @keydown.enter.exact.prevent="handleSend"
                ></textarea>
                <button
                  type="submit"
                  class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="sending || !messageDraft.trim()"
                >
                  {{ sending ? '傳送中...' : '發送' }}
                </button>
              </form>
            </footer>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>
