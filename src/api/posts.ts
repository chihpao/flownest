import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/stores/useAuth'
import { useSessions } from '@/stores/useSessions'
import { sessionStatsHelpers } from '@/utils/sessionsStats'

export type PostAchievementPayload = {
  content: string
  imageUrl?: string | null
  sessionIds: string[]
}

export async function postAchievement({ content, imageUrl = null, sessionIds }: PostAchievementPayload) {
  const authStore = useAuth()
  const sessions = useSessions()
  const user = auth.currentUser

  if (!user) {
    throw new Error('需要登入後才能發文')
  }

  const uniqueIds = Array.from(new Set(sessionIds)).filter(Boolean)
  if (!uniqueIds.length) {
    throw new Error('請至少選擇一筆要分享的專注成果')
  }

  const available = sessions.items
  const summaries = uniqueIds.map((id) => {
    const matched = available.find((item) => item.id === id)
    if (!matched) {
      throw new Error('找不到選擇的專注成果，請重新整理後再試一次')
    }

    const startedAt = sessionStatsHelpers.toMillis(matched.startedAt)
    const finishedAt = sessionStatsHelpers.toMillis(matched.finishedAt)

    const summary: Record<string, any> = {
      id: matched.id,
      title: matched.title,
      minutesPlanned: matched.minutesPlanned,
      minutesActual: matched.minutesActual,
    }
    if (startedAt) summary.startedAt = Timestamp.fromMillis(startedAt)
    if (finishedAt) summary.finishedAt = Timestamp.fromMillis(finishedAt)
    return summary
  })

  const authorName = authStore.user?.displayName
    || authStore.user?.email
    || user.displayName
    || user.email
    || '匿名使用者'

  const baseContent = content.trim()
  const message = baseContent.length
    ? baseContent
    : `完成專注：「${summaries[0]?.title ?? '專注時段'}」`

  const docRef = await addDoc(collection(db, 'posts'), {
    authorId: user.uid,
    authorName,
    content: message,
    imageUrl,
    createdAt: serverTimestamp(),
    likeCount: 0,
    visibility: 'public',
    sessions: summaries,
  })

  return docRef.id
}
