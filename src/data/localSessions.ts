export type LocalSession = {
  id: string
  title: string
  minutesPlanned: number
  minutesActual: number
  startedAt: number
  finishedAt: number
  source: 'guest'
  createdAt: number
}

export type LocalSessionInput = {
  title: string
  minutesPlanned: number
  minutesActual: number
  startedAt: number
  finishedAt: number
}

const STORAGE_KEY = 'flownest_sessions_v1'

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readRaw(): LocalSession[] {
  if (!hasStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isLocalSession)
  } catch {
    return []
  }
}

function persist(items: LocalSession[]) {
  if (!hasStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore storage errors */
  }
}

function isLocalSession(candidate: any): candidate is LocalSession {
  return candidate && typeof candidate.id === 'string' && typeof candidate.title === 'string'
    && typeof candidate.minutesPlanned === 'number' && typeof candidate.minutesActual === 'number'
    && typeof candidate.startedAt === 'number' && typeof candidate.finishedAt === 'number'
    && candidate.source === 'guest' && typeof candidate.createdAt === 'number'
}

function sortByFinishedAt(items: LocalSession[]) {
  return [...items].sort((a, b) => b.finishedAt - a.finishedAt)
}

export function listLocalSessions(): LocalSession[] {
  return sortByFinishedAt(readRaw())
}

export function addLocalSession(payload: LocalSessionInput): LocalSession[] {
  const finishedAt = payload.finishedAt
  const session: LocalSession = {
    id: `sess_${finishedAt}_${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title,
    minutesPlanned: payload.minutesPlanned,
    minutesActual: payload.minutesActual,
    startedAt: payload.startedAt,
    finishedAt,
    source: 'guest',
    createdAt: finishedAt,
  }
  const next = [session, ...readRaw()]
  persist(next)
  return sortByFinishedAt(next)
}

export function clearLocalSessions() {
  if (!hasStorage()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
