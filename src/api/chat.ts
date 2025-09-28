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

export type ChatMessageType = 'text' | 'share'

export interface ChatSharePayload {
  url: string
  title?: string
  description?: string
  imageUrl?: string | null
  thumbnailUrl?: string | null
  iconUrl?: string | null
  siteName?: string | null
}

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  receiverId: string
  text: string
  type: ChatMessageType
  share?: ChatSharePayload | null
  timestamp?: Timestamp
}

export interface ChatThreadData {
  id: string
  participantIds: string[]
  lastMessage?: string
  lastSenderId?: string
  updatedAt?: Timestamp
  lastMessageAt?: Timestamp
  lastMessageType?: ChatMessageType
  lastShare?: ChatSharePayload | null
  unreadCount?: Record<string, number>
  lastReadAt?: Record<string, Timestamp>
}

function mapThread(docSnap: QueryDocumentSnapshot<DocumentData>): ChatThreadData {
  const data = docSnap.data() as Record<string, any>
  const share = normalizeSharePayload(data.lastShare)
  const type: ChatMessageType = data.lastMessageType === 'share' || share ? 'share' : 'text'
  return {
    id: docSnap.id,
    participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
    lastMessage: data.lastMessage ?? '',
    lastSenderId: data.lastSenderId ?? '',
    updatedAt: data.updatedAt,
    lastMessageAt: data.lastMessageAt ?? data.updatedAt,
    lastMessageType: type,
    lastShare: share,
    unreadCount: typeof data.unreadCount === 'object' && data.unreadCount ? data.unreadCount : {},
    lastReadAt: typeof data.lastReadAt === 'object' && data.lastReadAt ? data.lastReadAt : {},
  }
}

function mapMessage(docSnap: QueryDocumentSnapshot<DocumentData>): ChatMessage {
  const data = docSnap.data() as Record<string, any>
  const share = normalizeSharePayload(data.share)
  const type: ChatMessageType = data.type === 'share' || share ? 'share' : 'text'
  return {
    id: docSnap.id,
    chatId: data.chatId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    text: data.text ?? '',
    type,
    share,
    timestamp: data.timestamp,
  }
}

function normalizeSharePayload(raw: any): ChatSharePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const url = typeof raw.url === 'string' ? raw.url.trim() : ''
  if (!url) return null
  const payload: ChatSharePayload = { url }
  const append = (key: keyof ChatSharePayload, value: any) => {
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (!trimmed) return
    payload[key] = trimmed
  }
  append('title', raw.title)
  append('description', raw.description)
  append('imageUrl', raw.imageUrl)
  append('thumbnailUrl', raw.thumbnailUrl)
  append('iconUrl', raw.iconUrl)
  append('siteName', raw.siteName)
  return payload
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

export type SendMessageInput = string | {
  text?: string
  type?: ChatMessageType
  share?: ChatSharePayload | null
}

function extractMessageParts(input: SendMessageInput): { type: ChatMessageType; text: string; share: ChatSharePayload | null } {
  if (typeof input === 'string') {
    const textOnly = input.trim()
    if (!textOnly) throw new Error('Message text is required')
    return { type: 'text', text: textOnly, share: null }
  }

  const desiredType = input.type === 'share' || input.share ? 'share' : 'text'
  const text = (input.text ?? '').trim()
  const share = normalizeSharePayload(input.share)

  if (desiredType === 'share') {
    if (!share) {
      throw new Error('Share payload requires a valid url')
    }
    return { type: 'share', text, share }
  }

  if (!text) {
    throw new Error('Message text is required')
  }
  return { type: 'text', text, share: null }
}

export async function sendMessage(receiverId: string, input: SendMessageInput) {
  const user = auth.currentUser
  if (!user) throw new Error('Must be signed in to send messages')
  const senderId = user.uid
  const trimmedReceiver = receiverId?.trim()
  if (!trimmedReceiver) throw new Error('Missing receiverId')

  const { type, text, share } = extractMessageParts(input)

  const chatId = buildChatId(senderId, trimmedReceiver)
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
      participantIds = Array.from(new Set([...existing, senderId, trimmedReceiver])).sort()
      unreadCount = { ...(data.unreadCount ?? {}) }
      lastReadAt = { ...(data.lastReadAt ?? {}) }
    } else {
      participantIds = [senderId, trimmedReceiver].sort()
      unreadCount = {}
      lastReadAt = {}
    }

    unreadCount[senderId] = 0
    unreadCount[trimmedReceiver] = (unreadCount[trimmedReceiver] ?? 0) + 1
    lastReadAt[senderId] = now

    const summary = type === 'share'
      ? (text || share?.title || share?.url || '')
      : text

    const threadPayload: Record<string, any> = {
      chatId,
      participantIds,
      lastMessage: summary,
      lastSenderId: senderId,
      lastMessageAt: now,
      lastMessageType: type,
      lastShare: share ?? null,
      updatedAt: now,
      unreadCount,
      lastReadAt,
    }

    if (!threadSnap.exists()) {
      threadPayload.createdAt = now
    }

    const messagePayload: Record<string, any> = {
      chatId,
      senderId,
      receiverId: trimmedReceiver,
      text,
      type,
      share: share ?? null,
      timestamp: now,
    }

    tx.set(messageRef, messagePayload)
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
