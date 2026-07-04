import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'node:buffer'

const READER_FIRST_HOSTS = ['sites.google.com', 'saramin.co.kr', 'incruit.com']

const normalizeTargetUrl = (raw) => {
  const value = String(raw ?? '').trim()
  if (!value) throw new Error('EMPTY_URL')
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  const parsed = new URL(withScheme)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('INVALID_URL')
  parsed.hash = ''
  return parsed.toString()
}

const isReaderFirstHost = (url) => {
  const parsed = new URL(url)
  return READER_FIRST_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
}

const isIncruitHost = (url) => {
  const parsed = new URL(url)
  return parsed.hostname === 'incruit.com' || parsed.hostname.endsWith('.incruit.com')
}

const getReaderTargetUrls = (url) => {
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

const toReaderUrl = (url) =>
  `https://r.jina.ai/http://${url}`

const JOB_CONTENT_HINTS =
  /기업명|회사명|기관명|채용\s*직무|담당\s*직무|모집\s*직무|모집\s*부문|포지션|주요\s*업무|세부\s*업무|담당업무|기술스택|기술\s*스택|스킬|채용\s*인원|채용예정인원|연봉|급여|보수\s*수준|고용형태|근무형태|채용\s*구분|지원\s*자격|자격요건|응시\s*자격|우대사항|소재지|근무지|근\s*무\s*지|근무\s*지역|사업내용|핵심\s*정보|접수\s*기간|지원서\s*접수|마감일|채용\s*일정|원티드|사람인|블록체인|보안|프론트엔드|백엔드|개발자|엔지니어|engineer|developer/i

const hasUsefulJobText = (text) =>
  compactText(text).length > 40 && JOB_CONTENT_HINTS.test(text)

const compactText = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const jsonValueToText = (value, results = []) => {
  if (!value || results.length >= 80) return results
  if (typeof value === 'string') {
    const cleaned = compactText(value)
    if (cleaned && cleaned.length >= 2) results.push(cleaned)
    return results
  }
  if (Array.isArray(value)) {
    value.forEach(item => jsonValueToText(item, results))
    return results
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (/(@context|@type|url|logo|image|sameAs|identifier)/i.test(key)) continue
      jsonValueToText(item, results)
    }
  }
  return results
}

const extractStructuredHtmlText = (html) => {
  const results = []
  const push = (value) => {
    const cleaned = compactText(decodeHtmlAttribute(value))
    if (cleaned && !results.includes(cleaned)) results.push(cleaned)
  }

  for (const match of html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)) {
    push(match[1])
  }
  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:title|og:description|title|description|twitter:title|twitter:description)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) {
    push(match[1])
  }
  for (const match of html.matchAll(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:title|og:description|title|description|twitter:title|twitter:description)["'][^>]*>/gi)) {
    push(match[1])
  }
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      jsonValueToText(JSON.parse(decodeHtmlAttribute(match[1]))).forEach(push)
    } catch {
      // Ignore malformed structured data.
    }
  }
  return results.join('\n')
}

const htmlToText = (html) =>
  [
    extractStructuredHtmlText(html),
    html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim(),
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 30000)

const decodeHtmlAttribute = (value) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

const resolveImageUrl = (raw, baseUrl) => {
  try {
    const value = decodeHtmlAttribute(String(raw ?? '').trim())
    if (!value || value.startsWith('data:') || value.startsWith('blob:')) return ''
    return new URL(value, baseUrl).toString()
  } catch {
    return ''
  }
}

const isLikelyContentImage = (url) => {
  const lower = url.toLowerCase()
  if (/\/(icon|favicon|logo|sprite|blank|pixel|tracking|spacer|loading|close|btn_|button)[^/]*\.(png|jpe?g|webp|gif)/.test(lower)) return false
  if (lower.includes('/sri/common/') || lower.includes('/js/libs/images/') || lower.includes('saraminbanner.co.kr') || lower.includes('/store/product/') || lower.includes('/sri/recruit/ai_pass') || lower.includes('/sri/recruit/img_graphic')) return false
  if (lower.includes('googleusercontent.com') || lower.includes('/sitesv/')) return true
  if (lower.includes('saraminimage.co.kr') || lower.includes('pds.saramin.co.kr')) return true
  if (!/\.(png|jpe?g|webp|gif)(\?|$)/.test(lower)) return false
  if (/\/(icon|favicon|logo|sprite|blank|pixel|tracking|spacer)[^/]*\.(png|jpe?g|webp|gif)/.test(lower)) return false
  return true
}

const extractImageUrls = (text, baseUrl) => {
  const urls = []
  const pushUrl = (raw) => {
    const imageUrl = resolveImageUrl(raw, baseUrl)
    if (imageUrl && isLikelyContentImage(imageUrl) && !urls.includes(imageUrl)) urls.push(imageUrl)
  }

  for (const match of text.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    pushUrl(match[1])
  }
  for (const match of text.matchAll(/!\[[^\]]*]\(([^)\s]+)[^)]*\)/g)) {
    pushUrl(match[1])
  }
  return urls.slice(0, 8)
}

const fetchText = async (url, source) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), source === 'reader' ? 12000 : 6000)
  try {
    const response = await fetch(source === 'reader' ? toReaderUrl(url) : url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; PlannerLinkReader/1.0)',
        accept: source === 'reader' ? 'text/plain,*/*' : 'text/html,text/plain,*/*',
      },
    })
    if (!response.ok) return { text: '', imageUrls: [] }
    const text = await response.text()
    return {
      text: source === 'reader' ? text.slice(0, 30000) : htmlToText(text),
      imageUrls: extractImageUrls(text, url),
    }
  } finally {
    clearTimeout(timeout)
  }
}

const readJobPostingPage = async (url) => {
  const readerTasks = getReaderTargetUrls(url).map(targetUrl => ({ source: 'reader', targetUrl }))
  const readers = isReaderFirstHost(url)
    ? readerTasks
    : [{ source: 'direct', targetUrl: url }, ...readerTasks]
  for (const { source, targetUrl } of readers) {
    try {
      const result = await fetchText(targetUrl, source)
      if (result.imageUrls.length || hasUsefulJobText(result.text)) return { ...result, source }
    } catch {
      // Try the next reader strategy.
    }
  }
  return { text: '', imageUrls: [], source: 'none' }
}

const jobPostingPageApi = () => ({
  name: 'planner-job-posting-page-api',
  configureServer(server) {
    server.middlewares.use('/api/job-posting-page', async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? '/', 'http://localhost')
        const targetUrl = normalizeTargetUrl(requestUrl.searchParams.get('url'))
        const result = await readJobPostingPage(targetUrl)
        res.statusCode = 200
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(result))
      } catch {
        res.statusCode = 400
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ text: '', source: 'none' }))
      }
    })
    server.middlewares.use('/api/job-posting-image', async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? '/', 'http://localhost')
        const targetUrl = normalizeTargetUrl(requestUrl.searchParams.get('url'))
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        try {
          const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
              'user-agent': 'Mozilla/5.0 (compatible; PlannerImageReader/1.0)',
              accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*',
            },
          })
          const contentType = response.headers.get('content-type') ?? ''
          if (!response.ok || !contentType.startsWith('image/')) throw new Error('NOT_IMAGE')
          const bytes = await response.arrayBuffer()
          res.statusCode = 200
          res.setHeader('content-type', contentType)
          res.setHeader('cache-control', 'no-store')
          res.end(Buffer.from(bytes))
        } finally {
          clearTimeout(timeout)
        }
      } catch {
        res.statusCode = 400
        res.setHeader('content-type', 'text/plain; charset=utf-8')
        res.end('image fetch failed')
      }
    })
  },
})

export default defineConfig({
  plugins: [react(), jobPostingPageApi()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react'
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase'
          if (id.includes('/react-grid-layout/') || id.includes('/react-resizable/')) return 'vendor-grid'
          if (id.includes('/chart.js/') || id.includes('/react-chartjs-2/')) return 'vendor-charts'
          if (id.includes('/tesseract.js/') || id.includes('/tesseract.js-core/') || id.includes('/regenerator-runtime/')) return 'vendor-ocr'
          return 'vendor'
        },
      },
    },
  },
})
