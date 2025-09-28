import type { ChatSharePayload } from '@/api/chat'

const URL_REGEX = /https?:\/\/[^\s]+/i

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX)
  return match ? normaliseUrl(match[0]) : null
}

function normaliseUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) return input
  return `https://${input}`
}

export async function fetchLinkPreview(url: string): Promise<ChatSharePayload | null> {
  if (typeof fetch === 'undefined') return null
  const normalised = normaliseUrl(url)
  const fromNoEmbed = await fetchFromNoEmbed(normalised)
  if (fromNoEmbed) return fromNoEmbed
  const fromOg = await fetchFromOpenGraph(normalised)
  return fromOg
}

async function fetchFromNoEmbed(url: string): Promise<ChatSharePayload | null> {
  try {
    const endpoint = `https://noembed.com/embed?nowrap=on&url=${encodeURIComponent(url)}`
    const res = await fetch(endpoint)
    if (!res.ok) return null
    const data = await res.json()
    if (!data) return null
    const payload: ChatSharePayload = { url }
    assignIfString(payload, 'title', data.title)
    assignIfString(payload, 'description', data.description)
    assignIfString(payload, 'siteName', data.provider_name || data.author_name)
    assignIfString(payload, 'imageUrl', data.thumbnail_url)
    if (payload.imageUrl) {
      payload.imageUrl = resolveAssetUrl(url, payload.imageUrl)
    }
    if (!payload.title && !payload.description && !payload.imageUrl) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

async function fetchFromOpenGraph(url: string): Promise<ChatSharePayload | null> {
  try {
    const proxyUrl = buildProxyUrl(url)
    const res = await fetch(proxyUrl, { headers: { 'x-fetch-purpose': 'link-preview' } })
    if (!res.ok) return null
    const html = await res.text()
    if (!html) return null
    const meta = parseDocument(html)
    if (!meta.title && !meta.description && !meta.imageUrl) return null
    const payload: ChatSharePayload = {
      url,
      title: meta.title ?? undefined,
      description: meta.description ?? undefined,
      imageUrl: meta.imageUrl ? resolveAssetUrl(url, meta.imageUrl) : undefined,
      siteName: meta.siteName ?? undefined,
      iconUrl: meta.iconUrl ? resolveAssetUrl(url, meta.iconUrl) : undefined,
    }
    return payload
  } catch {
    return null
  }
}

function buildProxyUrl(url: string): string {
  const sanitized = url.replace(/^https?:\/\//i, '')
  return `https://r.jina.ai/http://${sanitized}`
}

function parseDocument(html: string) {
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const get = (selector: string, attr = 'content') => doc.querySelector(selector)?.getAttribute(attr)?.trim() || null
    return {
      title: get('meta[property="og:title"], meta[name="og:title"], meta[name="title"]') || doc.querySelector('title')?.textContent?.trim() || null,
      description: get('meta[property="og:description"], meta[name="og:description"], meta[name="description"]'),
      imageUrl: get('meta[property="og:image"], meta[name="og:image"]'),
      siteName: get('meta[property="og:site_name"], meta[name="og:site_name"], meta[name="application-name"]'),
      iconUrl: get('link[rel="icon"], link[rel="shortcut icon"]', 'href'),
    }
  }
  return parseWithRegex(html)
}

function parseWithRegex(html: string) {
  const extract = (pattern: RegExp) => {
    const match = html.match(pattern)
    return match ? decodeHtml(match[1]) : null
  }
  return {
    title: extract(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || extract(/<title>([^<]+)<\/title>/i),
    description: extract(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) || extract(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
    imageUrl: extract(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i),
    siteName: extract(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i),
    iconUrl: extract(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i),
  }
}

function resolveAssetUrl(baseUrl: string, asset: string | null): string | undefined {
  if (!asset) return undefined
  try {
    return new URL(asset, baseUrl).toString()
  } catch {
    return asset
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function assignIfString<T extends object>(target: T, key: keyof T, value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) {
      ;(target as any)[key] = trimmed
    }
  }
}
