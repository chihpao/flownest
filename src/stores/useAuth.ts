// src/stores/useAuth.ts
import { defineStore } from 'pinia'
import { auth, db, googleProvider } from '@/lib/firebase'
import { useSessions } from '@/stores/useSessions'
import { useChatThreads } from '@/stores/useChatThreads'
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

async function upsertUserDoc(user: User) {
  await setDoc(
    doc(db, 'users', user.uid),
    {
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      public: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  )
}

export const useAuth = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    ready: false,
    error: '' as string
  }),
  getters: {
    isAuthed: (s) => !!s.user,
    uid: (s) => s.user?.uid ?? null
  },
  actions: {
    init() {
      if (this.ready) return
      onAuthStateChanged(auth, async (u) => {
        this.user = u
        this.ready = true

        const sessions = useSessions()
        const chatThreads = useChatThreads()
        if (u) {
          chatThreads.start(u.uid)
        } else {
          chatThreads.stop()
        }

        try {
          if (u) {
            await sessions.migrateLocalToCloud()
          }
        } catch {
          // �Y�ϥ��Ѥ]���n���׬y�{
        }

        sessions.listenMine().catch(() => {})
      })
    },

    async loginWithGoogle() {
      this.error = ''
      try {
        const res = await signInWithPopup(auth, googleProvider)
        await upsertUserDoc(res.user)
      } catch (e: any) {
        this.error = e?.message ?? String(e)
        throw e
      }
    },

    async registerWithEmail(email: string, password: string) {
      this.error = ''
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await upsertUserDoc(user)
    },

    async loginWithEmail(email: string, password: string) {
      this.error = ''
      await signInWithEmailAndPassword(auth, email, password)
    },

    async logout() {
      this.error = ''
      await signOut(auth)
    }
  }
})
