import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  updateDoc,
  type Unsubscribe,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { auth, db } from '@/lib/firebase'

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  receiverId: string
  text: string
  timestamp?: Timestamp
}

export interface ChatThreadData {
  id: string
  participantIds: string[]
  lastMessage?: string
  lastSenderId?: string
  updatedAt?: Timestamp
  lastMessageAt?: Timestamp
  unreadCount?: Record<string, number>
  lastReadAt?: Record<string, Timestamp>
}

function mapThread(docSnap: QueryDocumentSnapshot<DocumentData>): ChatThreadData {
  const data = docSnap.data() as Record<string, any>
  return {
    id: docSnap.id,
    participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
    lastMessage: data.lastMessage ?? '',
    lastSenderId: data.lastSenderId ?? '',
    updatedAt: data.updatedAt,
    lastMessageAt: data.lastMessageAt ?? data.updatedAt,
    unreadCount: typeof data.unreadCount === 'object' && data.unreadCount ? data.unreadCount : {},
    lastReadAt: typeof data.lastReadAt === 'object' && data.lastReadAt ? data.lastReadAt : {},
  }
}

function mapMessage(docSnap: QueryDocumentSnapshot<DocumentData>): ChatMessage {
  const data = docSnap.data() as Record<string, any>
  return {
    id: docSnap.id,
    chatId: data.chatId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    text: data.text ?? '',
    timestamp: data.timestamp,
  }
}

export function buildChatId(a: string, b: string) {
  return [a, b].sort((lhs, rhs) => (lhs < rhs ? -1 : lhs > rhs ? 1 : 0)).join('_')
}

export function listenToThreads(
  uid: string,
  onUpdate: (threads: ChatThreadData[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'chatThreads'),
    where('participantIds', 'array-contains', uid),
    orderBy('updatedAt', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(mapThread)
    onUpdate(items)
  }, onError)
}

export function listenToMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'asc')
  )
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(mapMessage)
    onUpdate(items)
  }, onError)
}

export async function sendMessage(receiverId: string, text: string) {
  const user = auth.currentUser
  if (!user) throw new Error('Must be signed in to send messages')
  const senderId = user.uid
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Message text is required')
  if (!receiverId) throw new Error('Missing receiverId')

  const chatId = buildChatId(senderId, receiverId)
  const threadRef = doc(db, 'chatThreads', chatId)
  const messageRef = doc(collection(db, 'messages'))

  await runTransaction(db, async (tx) => {
    const threadSnap = await tx.get(threadRef)
    const now = serverTimestamp()

    let participantIds: string[]
    let unreadCount: Record<string, number>
    let lastReadAt: Record<string, Timestamp | any>

    if (threadSnap.exists()) {
      const data = threadSnap.data() as Record<string, any>
      const existing = Array.isArray(data.participantIds) ? data.participantIds : []
      participantIds = Array.from(new Set([...existing, senderId, receiverId])).sort()
      unreadCount = { ...(data.unreadCount ?? {}) }
      lastReadAt = { ...(data.lastReadAt ?? {}) }
    } else {
      participantIds = [senderId, receiverId].sort()
      unreadCount = {}
      lastReadAt = {}
    }

    unreadCount[senderId] = 0
    unreadCount[receiverId] = (unreadCount[receiverId] ?? 0) + 1
    lastReadAt[senderId] = now

    const threadPayload: Record<string, any> = {
      chatId,
      participantIds,
      lastMessage: trimmed,
      lastSenderId: senderId,
      lastMessageAt: now,
      updatedAt: now,
      unreadCount,
      lastReadAt,
    }

    if (!threadSnap.exists()) {
      threadPayload.createdAt = now
    }

    tx.set(messageRef, {
      chatId,
      senderId,
      receiverId,
      text: trimmed,
      timestamp: now,
    })

    tx.set(threadRef, threadPayload, { merge: true })
  })
}

export async function markThreadAsRead(chatId: string, uid?: string) {
  const userId = uid ?? auth.currentUser?.uid
  if (!userId) return
  const threadRef = doc(db, 'chatThreads', chatId)
  try {
    await updateDoc(threadRef, {
      [`unreadCount.${userId}`]: 0,
      [`lastReadAt.${userId}`]: serverTimestamp(),
    })
  } catch (error) {
    const err = error as FirebaseError
    if (err?.code !== 'not-found') {
      throw err
    }
  }
}

