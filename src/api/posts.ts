import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/stores/useAuth'

export type PostAchievementInput = {
  contentText: string
  imageUrl?: string | null
  durationSec?: number | null
  finishedAt?: number | Date | Timestamp | null
}

export async function postAchievement({ contentText, imageUrl = null, durationSec, finishedAt }: PostAchievementInput) {
  const authStore = useAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('需要登入後才能發文')
  }

  const trimmed = contentText.trim()
  if (!trimmed) {
    throw new Error('請輸入想分享的內容')
  }

  const payload: Record<string, any> = {
    authorId: user.uid,
    contentText: trimmed,
    imageUrl: imageUrl ?? null,
    likeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (typeof durationSec === 'number' && durationSec > 0) {
    payload.durationSec = Math.round(durationSec)
  }

  if (finishedAt) {
    if (finishedAt instanceof Timestamp) {
      payload.finishedAt = finishedAt
    } else if (finishedAt instanceof Date) {
      payload.finishedAt = Timestamp.fromDate(finishedAt)
    } else if (typeof finishedAt === 'number' && Number.isFinite(finishedAt)) {
      payload.finishedAt = Timestamp.fromMillis(finishedAt)
    }
  }

  const displayName = authStore.user?.displayName ?? user.displayName ?? ''
  const email = authStore.user?.email ?? user.email ?? ''
  const avatar = authStore.user?.photoURL ?? user.photoURL ?? ''

  if (displayName) payload.authorName = displayName
  if (avatar) payload.authorAvatar = avatar
  if (!payload.authorName && email) payload.authorName = email

  const docRef = await addDoc(collection(db, 'posts'), payload)
  return { postId: docRef.id }
}

export async function likePost(postId: string) {
  const user = auth.currentUser
  if (!user) throw new Error('需要登入後才能按讚')

  const likeDocRef = doc(db, 'postLikes', `${postId}_${user.uid}`)
  const postRef = doc(db, 'posts', postId)

  await runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeDocRef)
    if (likeSnap.exists()) return

    const postSnap = await tx.get(postRef)
    if (!postSnap.exists()) throw new Error('貼文不存在或已被移除')

    tx.set(likeDocRef, {
      postId,
      userId: user.uid,
      createdAt: serverTimestamp(),
    })
    tx.update(postRef, {
      likeCount: (postSnap.data().likeCount ?? 0) + 1,
      updatedAt: serverTimestamp(),
    })
  })

  const updated = await getDoc(postRef)
  return { likeCount: updated.data()?.likeCount ?? 0 }
}

export async function unlikePost(postId: string) {
  const user = auth.currentUser
  if (!user) throw new Error('需要登入後才能取消按讚')

  const likeDocRef = doc(db, 'postLikes', `${postId}_${user.uid}`)
  const postRef = doc(db, 'posts', postId)

  await runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeDocRef)
    if (!likeSnap.exists()) return

    const postSnap = await tx.get(postRef)
    if (!postSnap.exists()) throw new Error('貼文不存在或已被移除')

    tx.delete(likeDocRef)
    const current = postSnap.data().likeCount ?? 0
    tx.update(postRef, {
      likeCount: Math.max(0, current - 1),
      updatedAt: serverTimestamp(),
    })
  })

  const updated = await getDoc(postRef)
  return { likeCount: updated.data()?.likeCount ?? 0 }
}

export async function followUser(targetUserId: string) {
  const user = auth.currentUser
  if (!user) throw new Error('需要登入後才能追蹤')
  if (!targetUserId) throw new Error('追蹤對象不存在')
  if (targetUserId === user.uid) throw new Error('無需追蹤自己')

  const docId = `${user.uid}_${targetUserId}`
  await setDoc(doc(db, 'follows', docId), {
    followerId: user.uid,
    followeeId: targetUserId,
    createdAt: serverTimestamp(),
  }, { merge: true })

  return { ok: true }
}

export async function unfollowUser(targetUserId: string) {
  const user = auth.currentUser
  if (!user) throw new Error('需要登入後才能取消追蹤')
  if (!targetUserId) throw new Error('追蹤對象不存在')
  const docId = `${user.uid}_${targetUserId}`
  await deleteDoc(doc(db, 'follows', docId))
  return { ok: true }
}

export async function fetchLikedPostIds() {
  const user = auth.currentUser
  if (!user) return new Set<string>()
  const q = query(collection(db, 'postLikes'), where('userId', '==', user.uid))
  const snap = await getDocs(q)
  const liked = new Set<string>()
  snap.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.postId) liked.add(data.postId)
  })
  return liked
}

export async function fetchFollowingIds() {
  const user = auth.currentUser
  if (!user) return new Set<string>()
  const q = query(collection(db, 'follows'), where('followerId', '==', user.uid))
  const snap = await getDocs(q)
  const follows = new Set<string>()
  snap.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.followeeId) follows.add(data.followeeId)
  })
  return follows
}
