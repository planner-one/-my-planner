const MAX_TEXT_LENGTH = 30000
const MAX_IMAGE_COUNT = 8

const compactText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const decodeHtml = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))

const isPrivateHostname = (hostname) => {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (value === 'localhost' || value.endsWith('.localhost') || value === '0.0.0.0' || value === 'metadata.google.internal') return true
  if (value === '::1' || /^f[cd][0-9a-f:]*$/i.test(value) || /^fe8[0-9a-f:]*$/i.test(value)) return true
  if (/^(0|127|10|169\.254|192\.168)\./.test(value)) return true
  const carrierGradeNat = value.match(/^100\.(\d+)\./)
  if (carrierGradeNat && Number(carrierGradeNat[1]) >= 64 && Number(carrierGradeNat[1]) <= 127) return true
  const match = value.match(/^172\.(\d+)\./)
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31)
}

export function normalizeReaderUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) throw new Error('EMPTY_URL')
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) throw new Error('INVALID_URL')
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  let parsed
  try {
    parsed = new URL(candidate)
  } catch {
    throw new Error('INVALID_URL')
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('INVALID_URL')
  }
  if (isPrivateHostname(parsed.hostname)) throw new Error('UNSAFE_TARGET')
  parsed.hash = ''
  return parsed.toString()
}

export function safeImageUrl(raw, baseUrl) {
  try {
    const image = new URL(String(raw ?? '').trim(), baseUrl)
    if (!['http:', 'https:'].includes(image.protocol) || isPrivateHostname(image.hostname)) return ''
    const imageLocator = `${image.pathname}${image.search}`
    if (!/\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(imageLocator) && !/(?:downfile|fileurl|image|photo|thumb|attachment|file)[/_-]|(?:file|image|attach)[_-]?(?:no|id)=/i.test(imageLocator)) return ''
    if (/\/(icon|favicon|logo|sprite|blank|pixel|tracking|spacer|loading|close|button)[^/]*\./i.test(image.pathname)) return ''
    return image.toString()
  } catch {
    return ''
  }
}

const imageScore = (url) => {
  const value = url.toLowerCase()
  let decoded = value
  try { decoded = decodeURIComponent(value) } catch { /* Keep the encoded URL for scoring. */ }
  let score = 0
  if (/\/(successdata|addfile|uploads?|uploadfiles?|attachments?|board|contents?|editor|notice|recruit|posters?|data)\//.test(value)) score += 8
  if (/poster|recruit|채용|공고|모집|행사|교육|program|content/.test(decoded)) score += 5
  if (/googleusercontent\.com|saraminimage\.co\.kr|pds\.saramin\.co\.kr/.test(value)) score += 3
  if (/\/(header|footer|nav|menu|common|layout|skin|template|sns)\//.test(value)) score -= 7
  if (/(^|[/_-])(on|off|over|rollover)([_.-]|$)|subimg|banner|thumb_logo|social|sns[_-]?\d/i.test(value)) score -= 7
  if (/\/(?:\d{1,2}|arrow|bullet|bg|line|dot)[_-]?(?:on|off)?\.(png|gif)(\?|$)/.test(value)) score -= 7
  return score
}

export function rankImageUrls(urls) {
  return Array.from(new Set(urls.filter(Boolean)))
    .map((url, index) => ({ url, index, score: imageScore(url) }))
    .filter(candidate => candidate.score > -5)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(candidate => candidate.url)
}

export function buildJinaReaderUrl(target) {
  return `https://r.jina.ai/${normalizeReaderUrl(target)}`
}

const jsonText = (value, output = []) => {
  if (!value || output.length >= 80) return output
  if (typeof value === 'string') {
    const text = compactText(value)
    if (text.length >= 2) output.push(text)
    return output
  }
  if (Array.isArray(value)) {
    value.forEach(item => jsonText(item, output))
    return output
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (/^@context$|^@type$|url|logo|image|sameAs|identifier/i.test(key)) return
      jsonText(item, output)
    })
  }
  return output
}

const stripHtml = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|h[1-6]|tr|td|th|dt|dd|section|article|main|table|thead|tbody|tfoot|figure|figcaption|option)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map(line => compactText(decodeHtml(line)))
  .filter(Boolean)
  .join('\n')

export function buildPageResult(html, baseUrl) {
  const source = String(html ?? '')
  const title = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  const metaValues = []
  for (const match of source.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:title|og:description|description|title)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)) {
    metaValues.push(decodeHtml(match[1]))
  }
  for (const match of source.matchAll(/<meta\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["'](?:og:title|og:description|description|title)["'][^>]*>/gi)) {
    metaValues.push(decodeHtml(match[1]))
  }
  const structured = []
  for (const match of source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { structured.push(...jsonText(JSON.parse(decodeHtml(match[1])))) } catch { /* Ignore malformed JSON-LD. */ }
  }
  const text = [...new Set([title, ...metaValues, ...structured, stripHtml(source)]
    .map(value => String(value ?? '').trim())
    .filter(Boolean))]
    .join('\n').slice(0, MAX_TEXT_LENGTH)
  const imageUrls = []
  for (const match of source.matchAll(/<img\b[^>]*(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi)) {
    const image = safeImageUrl(decodeHtml(match[1]), baseUrl)
    if (image && !imageUrls.includes(image)) imageUrls.push(image)
  }
  for (const match of source.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    const image = safeImageUrl(decodeHtml(match[1].split(',')[0].trim().split(/\s+/)[0]), baseUrl)
    if (image && !imageUrls.includes(image)) imageUrls.push(image)
  }
  return { text, source: 'direct', imageUrls: rankImageUrls(imageUrls).slice(0, MAX_IMAGE_COUNT) }
}

export function buildReaderFailure(code, message) {
  return { text: '', source: 'none', imageUrls: [], status: code, message }
}

export { MAX_TEXT_LENGTH }
