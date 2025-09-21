import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

/** 建立 demo 資料（須已登入取得 uid） */
export async function seedDemo(uid: string) {
  if (!uid) throw new Error('需要登入後才能執行 seedDemo，請先取得 uid')

  // users
  await setDoc(doc(db, 'users', uid), {
    email: 'demo@demo.dev',
    displayName: 'Demo',
    photoURL: '',
    public: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  // sessions 範例
  const now = Date.now()
  await addDoc(collection(db, 'sessions'), {
    ownerId: uid,
    title: 'Demo 專注 25 分鐘',
    minutesPlanned: 25,
    minutesActual: 25,
    startedAt: Timestamp.fromMillis(now - 25 * 60_000),
    finishedAt: Timestamp.fromMillis(now),
    createdAt: serverTimestamp(),
    source: 'cloud',
  })

  // posts
  await addDoc(collection(db, 'posts'), {
    authorId: uid,
    content: 'Hello FlowNest!',
    visibility: 'public',
    likeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // follows：讓彼此看得到對方
  const other = 'user_B'
  await setDoc(doc(db, 'follows', `${uid}_${other}`), {
    followerId: uid,
    followingId: other,
    createdAt: serverTimestamp(),
  })

  // messages thread + items
  const threadRef = doc(collection(db, 'messages'))
  await setDoc(threadRef, {
    members: [uid, other],
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  })
  await addDoc(collection(threadRef, 'items'), {
    senderId: uid,
    text: '這是從 DevTools 建立的測試訊息',
    createdAt: serverTimestamp(),
  })

  // 回傳 threadId 方便 DevTools 後續查詢
  return { threadId: threadRef.id }
}
