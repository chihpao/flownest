import type { SessionItem } from '@/stores/useSessions'

function toMillis(value: SessionItem['finishedAt']): number | null {
  if (!value) return null
  if (typeof value === 'number') return value
  if (typeof (value as any).toMillis === 'function') {
    try {
      return (value as any).toMillis()
    } catch {
      return null
    }
  }
  return null
}

export function sumMinutes(items: SessionItem[]): number {
  return items.reduce((total, item) => {
    const minutes = Number.isFinite(item.minutesActual)
      ? item.minutesActual
      : item.minutesPlanned
    return total + Math.max(0, minutes)
  }, 0)
}

export function countByDuration(items: SessionItem[]): Array<{ minutes: number; count: number }> {
  const map = new Map<number, number>()
  for (const item of items) {
    const key = Math.max(1, item.minutesPlanned || item.minutesActual || 0)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([minutes, count]) => ({ minutes, count }))
    .sort((a, b) => a.minutes - b.minutes)
}

function formatDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function groupByDay(items: SessionItem[]): Array<{ date: string; minutes: number }> {
  const map = new Map<string, number>()
  for (const item of items) {
    const millis = toMillis(item.finishedAt)
    if (!millis) continue
    const key = formatDateKey(new Date(millis))
    map.set(key, (map.get(key) ?? 0) + (item.minutesActual || item.minutesPlanned || 0))
  }
  return Array.from(map.entries())
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

function getIsoWeek(date: Date) {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = temp.getUTCDay() || 7
  temp.setUTCDate(temp.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: temp.getUTCFullYear(), week }
}

export function groupByWeek(items: SessionItem[]): Array<{ week: string; minutes: number }> {
  const map = new Map<string, number>()
  for (const item of items) {
    const millis = toMillis(item.finishedAt)
    if (!millis) continue
    const { year, week } = getIsoWeek(new Date(millis))
    const key = `${year}-W${String(week).padStart(2, '0')}`
    map.set(key, (map.get(key) ?? 0) + (item.minutesActual || item.minutesPlanned || 0))
  }
  return Array.from(map.entries())
    .map(([week, minutes]) => ({ week, minutes }))
    .sort((a, b) => (a.week < b.week ? -1 : 1))
}

export const formatters = {
  minutesToHoursLabel(minutes: number) {
    if (minutes < 60) return `${minutes} 分鐘`
    const hours = minutes / 60
    const hasFraction = minutes % 60 !== 0
    const value = hasFraction ? hours.toFixed(1) : hours.toString()
    return `${value} 小時`
  },
  dayLabel(dateKey: string) {
    const [y, m, d] = dateKey.split('-')
    return `${Number(m)}/${Number(d)} (${y})`
  },
  weekLabel(weekKey: string) {
    const [yearPart, weekPart] = weekKey.split('-W')
    return `第 ${Number(weekPart)} 週 · ${yearPart}`
  },
}

export const sessionStatsHelpers = {
  toMillis,
}
