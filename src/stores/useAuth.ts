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
  updateProfile,
  type User
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { sendPasswordResetEmail, reload } from 'firebase/auth'

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

    async registerWithEmail(email: string, password: string, displayName?: string) {
      this.error = ''
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password)
        const trimmed = displayName?.trim()
        if (trimmed) {
          try {
            await updateProfile(user, { displayName: trimmed })
          } catch {
            // ignore display name update failure, still proceed
          }
        }
        await upsertUserDoc(user)
      } catch (e: any) {
        this.error = e?.message ?? String(e)
        throw e
      }
    },

    async loginWithEmail(email: string, password: string) {
      this.error = ''
      await signInWithEmailAndPassword(auth, email, password)
    },

    async logout() {
      this.error = ''
      await signOut(auth)
    },

    async updateAvatar(photoURL: string) {
      if (!this.user) {
        throw new Error('User is not authenticated')
      }

      this.error = ''
      try {
        await updateProfile(this.user, { photoURL })
        await setDoc(
          doc(db, 'users', this.user.uid),
          {
            photoURL,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        )
        await this.refreshUser()
      } catch (e: any) {
        this.error = e?.message ?? 'Failed to update avatar.'
        throw e
      }
    },

    async updateDisplayName(name: string) {
      if (!this.user) {
        throw new Error('User is not authenticated')
      }

      const trimmed = name.trim()
      if (!trimmed) {
        throw new Error('顯示名稱不能是空白')
      }

      this.error = ''
      try {
        await updateProfile(this.user, { displayName: trimmed })
        await setDoc(
          doc(db, 'users', this.user.uid),
          {
            displayName: trimmed,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        )
        await this.refreshUser()
      } catch (e: any) {
        this.error = e?.message ?? 'Failed to update display name.'
        throw e
      }
    },

    async sendPasswordReset() {
      if (!this.user?.email) {
        throw new Error('尚未偵測到電子郵件地址')
      }
      this.error = ''
      try {
        await sendPasswordResetEmail(auth, this.user.email)
      } catch (e: any) {
        this.error = e?.message ?? '寄送失敗，請稍後再試。'
        throw e
      }
    },

    async refreshUser() {
      if (!auth.currentUser) return
      await reload(auth.currentUser)
      this.user = auth.currentUser
    }
  }
})



