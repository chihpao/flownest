import { defineStore } from 'pinia'
import { auth, db } from '@/lib/firebase'
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import {
  addLocalSession,
  clearLocalSessions,
  listLocalSessions,
  type LocalSession,
  type LocalSessionInput,
} from '@/data/localSessions'

export type SessionLogPayload = {
  title: string
  minutesPlanned: number
  startedAt: number
  finishedAt: number
}

export type SessionItem = {
  id: string
  title: string
  minutesPlanned: number
  minutesActual: number
  startedAt: number | Timestamp | null
  finishedAt: number | Timestamp | null
  createdAt?: number | Timestamp | null
  ownerId?: string
  source: 'guest' | 'cloud'
}

type SessionsMode = 'guest' | 'cloud'

type SyncNoticeState = {
  count: number
  at: number | null
  visible: boolean
}

type SessionsState = {
  items: SessionItem[]
  mode: SessionsMode
  error: string
  unsub: Unsubscribe | null
  syncNotice: SyncNoticeState
}

function mapLocalSession(session: LocalSession): SessionItem {
  return {
    id: session.id,
    title: session.title,
    minutesPlanned: session.minutesPlanned,
    minutesActual: session.minutesActual,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    createdAt: session.createdAt,
    source: 'guest',
  }
}

function mapCloudSession(id: string, data: any): SessionItem {
  return {
    id,
    title: data.title ?? '專注時段',
    minutesPlanned: data.minutesPlanned ?? data.minutesActual ?? 0,
    minutesActual: data.minutesActual ?? data.minutesPlanned ?? 0,
    startedAt: data.startedAt ?? null,
    finishedAt: data.finishedAt ?? null,
    createdAt: data.createdAt ?? null,
    ownerId: data.ownerId ?? null,
    source: data.source === 'guest' ? 'guest' : 'cloud',
  }
}

export const useSessions = defineStore('sessions', {
  state: (): SessionsState => ({
    items: [],
    mode: 'guest',
    error: '',
    unsub: null,
    syncNotice: {
      count: 0,
      at: null,
      visible: false,
    },
  }),
  getters: {
    isGuest: (state) => state.mode === 'guest',
    hasSyncNotice: (state) => state.syncNotice.visible && state.syncNotice.count > 0,
    latestSession: (state) => (state.items.length ? state.items[0] : null),
  },
  actions: {
    resetListener() {
      if (this.unsub) {
        this.unsub()
        this.unsub = null
      }
    },

    setError(message: string) {
      this.error = message
    },

    dismissSyncNotice() {
      this.syncNotice.visible = false
    },

    publishSyncNotice(count: number) {
      if (count <= 0) return
      this.syncNotice = {
        count,
        at: Date.now(),
        visible: true,
      }
    },

    loadLocal() {
      this.mode = 'guest'
      this.items = listLocalSessions().map(mapLocalSession)
    },

    async listenMine() {
      this.error = ''
      this.resetListener()
      const uid = auth.currentUser?.uid
      if (!uid) {
        this.loadLocal()
        return
      }

      this.mode = 'cloud'
      const q = query(
        collection(db, 'sessions'),
        where('ownerId', '==', uid),
        orderBy('finishedAt', 'desc')
      )
      this.unsub = onSnapshot(
        q,
        (snap) => {
          this.items = snap.docs.map((docSnap) => mapCloudSession(docSnap.id, docSnap.data()))
        },
        (err) => {
          this.setError(err?.message ?? String(err))
          this.items = []
        }
      )
    },

    async logCompletion(payload: SessionLogPayload) {
      const minutesActual = Math.max(1, Math.round((payload.finishedAt - payload.startedAt) / 60_000))
      const data: LocalSessionInput = {
        title: payload.title,
        minutesPlanned: payload.minutesPlanned,
        minutesActual,
        startedAt: payload.startedAt,
        finishedAt: payload.finishedAt,
      }
      const uid = auth.currentUser?.uid

      if (!uid) {
        this.mode = 'guest'
        this.items = addLocalSession(data).map(mapLocalSession)
        return
      }

      this.mode = 'cloud'
      try {
        await addDoc(collection(db, 'sessions'), {
          ownerId: uid,
          title: data.title,
          minutesPlanned: data.minutesPlanned,
          minutesActual: data.minutesActual,
          startedAt: Timestamp.fromMillis(data.startedAt),
          finishedAt: Timestamp.fromMillis(data.finishedAt),
          createdAt: serverTimestamp(),
          source: 'cloud',
        })
      } catch (err: any) {
        this.setError(err?.message ?? String(err))
        throw err
      }
    },

    async migrateLocalToCloud() {
      const uid = auth.currentUser?.uid
      if (!uid) return 0
      const locals = listLocalSessions()
      if (!locals.length) return 0

      try {
        const col = collection(db, 'sessions')
        for (const session of locals) {
          await addDoc(col, {
            ownerId: uid,
            title: session.title,
            minutesPlanned: session.minutesPlanned,
            minutesActual: session.minutesActual,
            startedAt: Timestamp.fromMillis(session.startedAt),
            finishedAt: Timestamp.fromMillis(session.finishedAt),
            createdAt: serverTimestamp(),
            source: 'guest',
          })
        }
        clearLocalSessions()
        this.publishSyncNotice(locals.length)
        return locals.length
      } catch (err: any) {
        this.setError(err?.message ?? String(err))
        throw err
      }
    },
  },
})
