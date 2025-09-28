import { defineStore } from 'pinia'
import { listenToThreads, type ChatThreadData } from '@/api/chat'
import { type Unsubscribe } from 'firebase/firestore'

interface ChatThreadsState {
  threads: ChatThreadData[]
  listeningUid: string | null
  unsub: Unsubscribe | null
  error: string
  ready: boolean
  lastUpdateAt: number
}

export const useChatThreads = defineStore('chatThreads', {
  state: (): ChatThreadsState => ({
    threads: [],
    listeningUid: null,
    unsub: null,
    error: '',
    ready: false,
    lastUpdateAt: 0,
  }),
  getters: {
    unreadTotal(state): number {
      const uid = state.listeningUid
      if (!uid) return 0
      return state.threads.reduce((sum, thread) => sum + (thread.unreadCount?.[uid] ?? 0), 0)
    },
    hasUnread(): boolean {
      return this.unreadTotal > 0
    },
  },
  actions: {
    start(uid: string | null) {
      if (!uid) {
        this.stop()
        return
      }
      if (this.listeningUid === uid && this.unsub) return
      this.stop()
      this.listeningUid = uid
      this.ready = false
      this.error = ''
      this.unsub = listenToThreads(uid, (threads) => {
        this.threads = threads
        this.ready = true
        this.lastUpdateAt = Date.now()
      }, (err) => {
        this.error = err?.message ?? String(err)
      })
    },
    stop() {
      if (this.unsub) {
        this.unsub()
        this.unsub = null
      }
      this.threads = []
      this.listeningUid = null
      this.ready = false
      this.error = ''
    },
    clearThreadUnread(chatId: string, uid?: string) {
      const userId = uid ?? this.listeningUid
      if (!userId) return
      this.threads = this.threads.map((thread) => {
        if (thread.id !== chatId) return thread
        const unread = { ...(thread.unreadCount ?? {}) }
        if (unread[userId] === 0) return thread
        unread[userId] = 0
        return {
          ...thread,
          unreadCount: unread,
        }
      })
    },
    setError(message: string) {
      this.error = message
    },
  },
})
