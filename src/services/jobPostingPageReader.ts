import { hasUsefulJobText } from '../utils/jobPostingDraft'

export type JobPostingPageTextSource = 'direct' | 'reader' | 'none'

export interface JobPostingPageTextResult {
  text: string
  source: JobPostingPageTextSource
  imageUrls: string[]
  status?: string
  message?: string
  finalUrl?: string
  fallback?: 'direct' | 'jina'
}

const emptyResult = (status?: string, message?: string): JobPostingPageTextResult => ({
  text: '',
  source: 'none',
  imageUrls: [],
  status,
  message,
})

const markAccessRestriction = (result: JobPostingPageTextResult): JobPostingPageTextResult => {
  const strongAccessWall = /로그인\s*(?:후|이)\s*(?:이용|필요)|접근\s*권한이?\s*(?:없|필요)|권한이\s*필요|sign\s*in\s*to\s*continue|access\s*denied|enable\s+javascript|captcha|attention\s+required|로봇이\s*아님을\s*확인/i.test(result.text)
  if (!strongAccessWall) return result
  return {
    ...result,
    status: 'ACCESS_RESTRICTED',
    message: '로그인, 접근 권한 또는 자동 접속 확인 때문에 본문 전체를 읽지 못했을 수 있습니다.',
  }
}

const READER_FIRST_HOSTS = ['sites.google.com', 'saramin.co.kr', 'incruit.com']

const isReaderFirstHost = (url: string) => {
  try {
    const parsed = new URL(url)
    return READER_FIRST_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

const isIncruitHost = (url: string) => {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'incruit.com' || parsed.hostname.endsWith('.incruit.com')
  } catch {
    return false
  }
}

const getReaderTargetUrls = (url: string) => {
  const targets = [url]
  try {
    if (isIncruitHost(url)) {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:') {
        parsed.protocol = 'http:'
        targets.unshift(parsed.toString())
      }
    }
  } catch {
    // Keep the original URL as the only target.
  }
  return Array.from(new Set(targets))
}

const toReaderUrl = (url: string) =>
  `https://r.jina.ai/${url}`

const withTimeout = async <T,>(run: (signal: AbortSignal) => Promise<T>, timeoutMs = 7000) => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await run(controller.signal)
  } finally {
    window.clearTimeout(timeout)
  }
}

const isLikelyContentImage = (url: string) => {
  const lower = url.toLowerCase()
  if (/\/(icon|favicon|logo|sprite|blank|pixel|tracking|spacer|loading|close|btn_|button)[^/]*\.(png|jpe?g|webp|gif)/.test(lower)) return false
  if (lower.includes('/sri/common/') || lower.includes('/js/libs/images/') || lower.includes('saraminbanner.co.kr') || lower.includes('/store/product/') || lower.includes('/sri/recruit/ai_pass') || lower.includes('/sri/recruit/img_graphic')) return false
  if (lower.includes('googleusercontent.com') || lower.includes('/sitesv/')) return true
  if (lower.includes('saraminimage.co.kr') || lower.includes('pds.saramin.co.kr')) return true
  if (!/\.(png|jpe?g|webp|gif)(\?|$)/.test(lower)) return false
  if (/\/(icon|favicon|logo|sprite|blank|pixel|tracking|spacer)[^/]*\.(png|jpe?g|webp|gif)/.test(lower)) return false
  return true
}

const imageScore = (url: string) => {
  const lower = url.toLowerCase()
  let decoded = lower
  try { decoded = decodeURIComponent(lower) } catch { /* Keep the encoded URL for scoring. */ }
  let score = 0
  if (/\/(successdata|addfile|uploads?|uploadfiles?|attachments?|board|contents?|editor|notice|recruit|posters?|data)\//.test(lower)) score += 8
  if (/poster|recruit|채용|공고|모집|행사|교육|program|content/.test(decoded)) score += 5
  if (/googleusercontent\.com|saraminimage\.co\.kr|pds\.saramin\.co\.kr/.test(lower)) score += 3
  if (/\/(header|footer|nav|menu|common|layout|skin|template|sns)\//.test(lower)) score -= 7
  if (/(^|[/_-])(on|off|over|rollover)([_.-]|$)|subimg|banner|thumb_logo|social|sns[_-]?\d/i.test(lower)) score -= 7
  return score
}

const rankImageUrls = (urls: string[]) =>
  Array.from(new Set(urls.filter(Boolean)))
    .map((url, index) => ({ url, index, score: imageScore(url) }))
    .filter(candidate => candidate.score > -5)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(candidate => candidate.url)

const extractImageUrls = (doc: Document, baseUrl: string) =>
  Array.from(doc.querySelectorAll('img[src], img[data-src], img[data-lazy-src], source[srcset]'))
    .map(image => {
      try {
        const raw = image.getAttribute('src') ?? image.getAttribute('data-src') ?? image.getAttribute('data-lazy-src') ?? image.getAttribute('srcset')?.split(',')[0]?.trim().split(/\s+/)[0] ?? ''
        return new URL(raw, baseUrl).toString()
      } catch {
        return ''
      }
    })
    .filter((url, index, urls) => url && isLikelyContentImage(url) && urls.indexOf(url) === index)
    .sort((a, b) => imageScore(b) - imageScore(a))
    .slice(0, 8)

const extractMarkdownImageUrls = (text: string, baseUrl: string) => {
  const urls: string[] = []
  const pushUrl = (raw: string) => {
    try {
      const imageUrl = new URL(raw.trim(), baseUrl).toString()
      if (isLikelyContentImage(imageUrl) && !urls.includes(imageUrl)) urls.push(imageUrl)
    } catch {
      // Ignore malformed markdown image URLs.
    }
  }
  for (const match of text.matchAll(/!\[[^\]]*]\(([^)\s]+)[^)]*\)/g)) {
    pushUrl(match[1])
  }
  return rankImageUrls(urls).slice(0, 8)
}

const jsonValueToText = (value: unknown, results: string[] = []) => {
  if (!value || results.length >= 80) return results
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s+/g, ' ').trim()
    if (cleaned && cleaned.length >= 2) results.push(cleaned)
    return results
  }
  if (Array.isArray(value)) {
    value.forEach(item => jsonValueToText(item, results))
    return results
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (/(@context|@type|url|logo|image|sameAs|identifier)/i.test(key)) return
      jsonValueToText(item, results)
    })
  }
  return results
}

const extractStructuredText = (doc: Document) =>
  Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
    .flatMap(script => {
      try {
        return jsonValueToText(JSON.parse(script.textContent ?? ''))
      } catch {
        return []
      }
    })
    .join('\n')

const htmlToResult = (html: string, baseUrl: string): JobPostingPageTextResult => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const title = doc.querySelector('title')?.textContent ?? ''
  const metaTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
    doc.querySelector('meta[name="title"]')?.getAttribute('content') ??
    ''
  const description =
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ??
    ''
  return {
    text: [title, metaTitle, description, extractStructuredText(doc), doc.body?.innerText ?? '']
      .filter(Boolean)
      .join('\n')
      .slice(0, 30000),
    source: 'direct',
    imageUrls: extractImageUrls(doc, baseUrl),
    status: 'success',
    finalUrl: baseUrl,
    fallback: 'direct',
  }
}

const fetchDirectResult = async (url: string): Promise<JobPostingPageTextResult> =>
  withTimeout(async signal => {
    const response = await fetch(url, { signal, credentials: 'omit' })
    if (!response.ok) return emptyResult('UPSTREAM_HTTP_ERROR')
    const html = await response.text()
    return htmlToResult(html, url)
  }, 5000)

const fetchSameOriginApiText = async (url: string): Promise<JobPostingPageTextResult> =>
  withTimeout(async signal => {
    const response = await fetch(`/api/job-posting-page?url=${encodeURIComponent(url)}`, {
      signal,
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.includes('application/json')) return emptyResult('LOCAL_READER_UNAVAILABLE')
    const result = await response.json() as Partial<JobPostingPageTextResult>
    return {
      text: typeof result.text === 'string' ? result.text : '',
      source: result.source === 'direct' || result.source === 'reader' ? result.source : 'none',
      imageUrls: rankImageUrls(Array.isArray(result.imageUrls) ? result.imageUrls.filter((item): item is string => typeof item === 'string') : []),
      status: result.status,
      message: result.message,
      finalUrl: result.finalUrl,
      fallback: result.fallback,
    }
  }, 12000)

const fetchProductionReaderText = async (url: string): Promise<JobPostingPageTextResult> =>
  withTimeout(async signal => {
    const readerBaseUrl = String(import.meta.env.VITE_READER_BASE_URL ?? '').replace(/\/$/, '')
    if (!readerBaseUrl) return emptyResult('READER_NOT_CONFIGURED', '운영 Reader 주소가 설정되지 않았습니다.')
    const response = await fetch(`${readerBaseUrl}/reader/page?url=${encodeURIComponent(url)}`, {
      signal,
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('application/json')) {
      return emptyResult('PRODUCTION_READER_UNAVAILABLE')
    }
    const result = await response.json() as Partial<JobPostingPageTextResult> & { status?: string }
    return {
      text: typeof result.text === 'string' ? result.text : '',
      source: result.source === 'direct' || result.source === 'reader' ? result.source : 'none',
      imageUrls: rankImageUrls(Array.isArray(result.imageUrls) ? result.imageUrls.filter((item): item is string => typeof item === 'string') : []),
      status: result.status,
      message: result.message,
      finalUrl: typeof result.finalUrl === 'string' ? result.finalUrl : undefined,
      fallback: result.fallback === 'jina' ? 'jina' : result.fallback === 'direct' ? 'direct' : undefined,
    }
  }, 15000)

const fetchReaderResult = async (url: string): Promise<JobPostingPageTextResult> =>
  withTimeout(async signal => {
    const response = await fetch(toReaderUrl(url), {
      signal,
      credentials: 'omit',
      headers: { accept: 'text/plain,*/*' },
    })
    if (!response.ok) return emptyResult('JINA_READER_UNAVAILABLE')
    const text = (await response.text()).slice(0, 30000)
    return {
      text,
      source: 'reader',
      imageUrls: extractMarkdownImageUrls(text, url),
      status: 'success',
      finalUrl: url,
      fallback: 'jina',
    }
  }, 18000)

const fetchReaderTargets = async (url: string) => {
  for (const targetUrl of getReaderTargetUrls(url)) {
    try {
      const result = await fetchReaderResult(targetUrl)
      if (result.imageUrls.length || hasUsefulJobText(result.text)) return result
    } catch {
      // Try the next reader target.
    }
  }
  return emptyResult('JINA_READER_UNAVAILABLE')
}

export const getJobPostingPageText = async (url: string, options: { acceptAnyText?: boolean } = {}): Promise<JobPostingPageTextResult> => {
  const hasReadableText = (text: string) => options.acceptAnyText ? text.trim().length > 40 : hasUsefulJobText(text)
  let bestPartial = emptyResult('READ_FAILED', '페이지 본문을 읽지 못했습니다.')
  const rememberPartial = (result: JobPostingPageTextResult) => {
    if (
      result.imageUrls.length > bestPartial.imageUrls.length
      || result.text.length > bestPartial.text.length
      || (result.message && bestPartial.status === 'READ_FAILED')
    ) bestPartial = result
  }
  try {
    const apiResult = markAccessRestriction(await fetchSameOriginApiText(url))
    if (apiResult.imageUrls.length || hasReadableText(apiResult.text)) return apiResult
    rememberPartial(apiResult)
  } catch {
    // Local dev and future backend use /api first; production without that route falls back below.
  }

  try {
    const productionResult = markAccessRestriction(await fetchProductionReaderText(url))
    if (productionResult.imageUrls.length || hasReadableText(productionResult.text)) return productionResult
    rememberPartial(productionResult)
  } catch {
    // Firebase Hosting may be serving an older release without the Reader rewrite.
  }

  const readWithReaderFirst = isReaderFirstHost(url)
  if (readWithReaderFirst) {
    const result = markAccessRestriction(await fetchReaderTargets(url))
    return result.imageUrls.length || hasReadableText(result.text) ? result : bestPartial
  }

  const readers: Array<() => Promise<JobPostingPageTextResult>> = [
    () => fetchDirectResult(url),
    () => fetchReaderTargets(url),
  ]

  for (const read of readers) {
    try {
      const result = markAccessRestriction(await read())
      if (result.imageUrls.length || hasReadableText(result.text)) return result
      rememberPartial(result)
    } catch {
      // Keep link analysis usable when a site blocks browser reads.
    }
  }

  return bestPartial
}

export const getJobPostingImageBlob = async (url: string) => {
  const readerBaseUrl = String(import.meta.env.VITE_READER_BASE_URL ?? '').replace(/\/$/, '')
  const endpoint = readerBaseUrl ? `${readerBaseUrl}/reader/image` : '/api/job-posting-image'
  const response = await fetch(`${endpoint}?url=${encodeURIComponent(url)}`, {
    credentials: 'same-origin',
  })
  if (!response.ok) throw new Error('IMAGE_FETCH_FAILED')
  return response.blob()
}
