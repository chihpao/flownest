import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

export const LOGIN_REDIRECT_FALLBACK = '/setup'

export const LOGIN_REDIRECT_REASONS = [
  'general',
  'share',
  'support',
  'follow',
  'chat',
] as const

export type LoginRedirectReason = typeof LOGIN_REDIRECT_REASONS[number]

export const LOGIN_REASON_MESSAGES: Record<LoginRedirectReason, string> = {
  general: '登入後即可同步你的進度並使用 FlowNest 的完整功能。',
  share: '登入後即可把這次的專注成果分享給夥伴。',
  support: '登入後可為夥伴按讚、留言，送上立即的鼓勵。',
  follow: '登入後即可追蹤這位作者，掌握他們的最新分享。',
  chat: '登入後可加入聊天室並傳送訊息給夥伴。',
}

function normalizeRedirect(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.startsWith('/login')) return null
  return value
}

export function sanitizeLoginRedirect(raw: unknown): string | null {
  if (Array.isArray(raw)) raw = raw[0]
  if (typeof raw !== 'string') return null
  return normalizeRedirect(raw)
}

export function sanitizeLoginReason(raw: unknown): LoginRedirectReason | null {
  if (Array.isArray(raw)) raw = raw[0]
  if (typeof raw !== 'string') return null
  return LOGIN_REDIRECT_REASONS.includes(raw as LoginRedirectReason)
    ? (raw as LoginRedirectReason)
    : null
}

interface BuildLoginOptions {
  redirect?: string | null
}

export function useLoginRedirect() {
  const router = useRouter()
  const route = useRoute()

  function resolveRedirect(explicit?: string | null): string {
    const current = explicit ?? route.fullPath
    const sanitized = normalizeRedirect(current) ?? sanitizeLoginRedirect(route.query.redirect) ?? LOGIN_REDIRECT_FALLBACK
    return sanitized
  }

  function loginLocation(reason?: LoginRedirectReason, options?: BuildLoginOptions): RouteLocationRaw {
    const redirect = resolveRedirect(options?.redirect ?? null)
    const query: Record<string, string> = { redirect }
    if (reason) {
      query.reason = reason
    }
    return { name: 'login', query }
  }

  function pushLogin(reason?: LoginRedirectReason, options?: BuildLoginOptions) {
    return router.push(loginLocation(reason, options))
  }

  return { pushLogin, loginLocation }
}