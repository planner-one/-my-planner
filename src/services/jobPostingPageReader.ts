import { hasUsefulJobText } from '../utils/jobPostingDraft'

export type JobPostingPageTextSource = 'direct' | 'reader' | 'none'

export interface JobPostingPageTextResult {
  text: string
  source: JobPostingPageTextSource
  imageUrls: string[]
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
  `https://r.jina.ai/http://${url}`

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

const extractImageUrls = (doc: Document, baseUrl: string) =>
  Array.from(doc.querySelectorAll('img[src]'))
    .map(image => {
      try {
        return new URL(image.getAttribute('src') ?? '', baseUrl).toString()
      } catch {
        return ''
      }
    })
    .filter((url, index, urls) => url && isLikelyContentImage(url) && urls.indexOf(url) === index)
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
  return urls.slice(0, 8)
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
  }
}

const fetchDirectResult = async (url: string): Promise<JobPostingPageTextResult> =>
  withTimeout(async signal => {
    const response = await fetch(url, { signal, credentials: 'omit' })
    if (!response.ok) return { text: '', source: 'none', imageUrls: [] }
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
    if (!response.ok || !contentType.includes('application/json')) return { text: '', source: 'none', imageUrls: [] }
    const result = await response.json() as Partial<JobPostingPageTextResult>
    return {
      text: typeof result.text === 'string' ? result.text : '',
      source: result.source === 'direct' || result.source === 'reader' ? result.source : 'none',
      imageUrls: Array.isArray(result.imageUrls) ? result.imageUrls.filter((item): item is string => typeof item === 'string') : [],
    }
  }, 12000)

const fetchReaderResult = async (url: string): Promise<JobPostingPageTextResult> =>
  withTimeout(async signal => {
    const response = await fetch(toReaderUrl(url), {
      signal,
      credentials: 'omit',
      headers: { accept: 'text/plain,*/*' },
    })
    if (!response.ok) return { text: '', source: 'none', imageUrls: [] }
    const text = (await response.text()).slice(0, 30000)
    return {
      text,
      source: 'reader',
      imageUrls: extractMarkdownImageUrls(text, url),
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
  return { text: '', source: 'none', imageUrls: [] } satisfies JobPostingPageTextResult
}

export const getJobPostingPageText = async (url: string): Promise<JobPostingPageTextResult> => {
  try {
    const apiResult = await fetchSameOriginApiText(url)
    if (apiResult.imageUrls.length || hasUsefulJobText(apiResult.text)) return apiResult
  } catch {
    // Local dev and future backend use /api first; production without that route falls back below.
  }

  const readWithReaderFirst = isReaderFirstHost(url)
  if (readWithReaderFirst) return fetchReaderTargets(url)

  const readers: Array<() => Promise<JobPostingPageTextResult>> = [
    () => fetchDirectResult(url),
    () => fetchReaderTargets(url),
  ]

  for (const read of readers) {
    try {
      const result = await read()
      if (result.imageUrls.length || hasUsefulJobText(result.text)) return result
    } catch {
      // Keep link analysis usable when a site blocks browser reads.
    }
  }

  return { text: '', source: 'none', imageUrls: [] }
}

export const getJobPostingImageBlob = async (url: string) => {
  const response = await fetch(`/api/job-posting-image?url=${encodeURIComponent(url)}`, {
    credentials: 'same-origin',
  })
  if (!response.ok) throw new Error('IMAGE_FETCH_FAILED')
  return response.blob()
}
