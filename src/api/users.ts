import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface UserProfile {
  uid: string
  displayName: string
  photoURL: string
  email: string
}

export async function fetchUsersByIds(ids: string[]): Promise<Record<string, UserProfile>> {
  const unique = Array.from(new Set(ids.filter((id) => !!id)))
  if (unique.length === 0) return {}

  const entries = await Promise.all(unique.map(async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    const data = snap.data() as Record<string, any>
    return [uid, {
      uid,
      displayName: resolveDisplayName(uid, data),
      photoURL: (data.photoURL ?? '').trim(),
      email: (data.email ?? '').trim(),
    } satisfies UserProfile] as const
  }))

  const result: Record<string, UserProfile> = {}
  for (const entry of entries) {
    if (!entry) continue
    const [uid, profile] = entry
    result[uid] = profile
  }
  return result
}

function resolveDisplayName(uid: string, data: Record<string, any>) {
  const displayName = (data.displayName ?? '').trim()
  if (displayName) return displayName
  const email = (data.email ?? '').trim()
  if (email) {
    const local = email.split('@')[0]?.trim()
    if (local) return local
  }
  return `使用者_${uid.slice(0, 6)}`
}
