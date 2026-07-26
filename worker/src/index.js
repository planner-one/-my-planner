import {
  buildJinaReaderUrl,
  buildPageResult,
  buildReaderFailure,
  normalizeReaderUrl,
  rankImageUrls,
  safeImageUrl,
} from '../../functions/src/reader.js'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ALLOWED_ORIGIN = '*'

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
  },
})

const fetchUpstream = async (url, init = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    let currentUrl = normalizeReaderUrl(url)
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      const response = await fetch(currentUrl, {
        ...init,
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; PlannerLinkReader/1.0)',
          ...init.headers,
        },
      })
      if (![301, 302, 303, 307, 308].includes(response.status)) return response
      const location = response.headers.get('location')
      if (!location) return response
      currentUrl = normalizeReaderUrl(new URL(location, currentUrl).toString())
    }
    throw new Error('TOO_MANY_REDIRECTS')
  } finally {
    clearTimeout(timer)
  }
}

const decodeResponseText = async (response) => {
  const bytes = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') ?? ''
  const header = new TextDecoder('ascii').decode(bytes.slice(0, 8192))
  const charset = /charset\s*=\s*(euc-kr|ks_c_5601-1987|cp949)/i.test(`${contentType} ${header}`) ? 'euc-kr' : 'utf-8'
  return new TextDecoder(charset).decode(bytes)
}

const readReaderFallback = async (target) => {
  const readerUrl = buildJinaReaderUrl(target)
  const response = await fetchUpstream(readerUrl, { headers: { accept: 'text/plain,*/*;q=0.8' } })
  if (!response.ok) return null
  const text = (await response.text()).slice(0, 30000)
  const imageUrls = []
  for (const match of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    const image = safeImageUrl(match[1], target)
    if (image && !imageUrls.includes(image)) imageUrls.push(image)
  }
  return { text, source: 'reader', imageUrls: rankImageUrls(imageUrls).slice(0, 8) }
}

const page = async (request) => {
  try {
    const target = normalizeReaderUrl(new URL(request.url).searchParams.get('url'))
    let upstream
    try {
      upstream = await fetchUpstream(target, {
        headers: { accept: 'text/html,text/plain,application/xhtml+xml,*/*;q=0.8' },
      })
    } catch (directError) {
      if (directError instanceof Error && directError.message === 'UNSAFE_TARGET') throw directError
      const fallback = await readReaderFallback(target)
      if (fallback?.text) return json({ ...fallback, status: 'success', finalUrl: target, fallback: 'jina' })
      throw directError
    }
    if (!upstream.ok) {
      const fallback = await readReaderFallback(target)
      if (fallback?.text) return json({ ...fallback, status: 'success', finalUrl: target, fallback: 'jina' })
      return json(buildReaderFailure('UPSTREAM_HTTP_ERROR', `원문 사이트 응답 코드 ${upstream.status}`))
    }
    const contentType = upstream.headers.get('content-type') ?? ''
    if (contentType.includes('application/pdf')) {
      const fallback = await readReaderFallback(target)
      return fallback?.text
        ? json({ ...fallback, status: 'success', finalUrl: upstream.url || target, fallback: 'jina' })
        : json(buildReaderFailure('PDF_READ_FAILED', 'PDF 본문을 읽지 못했습니다. PDF 파일 또는 내용을 직접 넣어 주세요.'))
    }
    if (contentType.startsWith('image/')) {
      const imageUrl = safeImageUrl(upstream.url || target, target)
      return json({
        text: '',
        source: 'direct',
        imageUrls: imageUrl ? [imageUrl] : [],
        status: imageUrl ? 'partial' : 'UNSUPPORTED_CONTENT',
        message: imageUrl ? '이미지 링크입니다. OCR로 글자를 읽어 주세요.' : '지원하지 않는 이미지 링크입니다.',
        finalUrl: upstream.url || target,
        fallback: 'direct',
      })
    }
    const body = await decodeResponseText(upstream)
    const result = contentType.includes('html') ? buildPageResult(body, target) : {
      text: body.slice(0, 30000), source: 'direct', imageUrls: [],
    }
    if (result.text.length < 600) {
      try {
        const fallback = await readReaderFallback(target)
        if (fallback?.text.length > result.text.length) return json({
          ...fallback,
          imageUrls: rankImageUrls([...fallback.imageUrls, ...result.imageUrls]).slice(0, 8),
          status: 'success',
          finalUrl: upstream.url || target,
          fallback: 'jina',
        })
      } catch { /* Keep the direct result when the fallback is unavailable. */ }
    }
    return json({ ...result, status: result.text ? 'success' : 'partial', finalUrl: upstream.url || target, fallback: 'direct' })
  } catch (error) {
    if (!['UNSAFE_TARGET', 'INVALID_URL'].includes(error?.message)) console.error('reader page failed', error)
    const code = error?.message === 'UNSAFE_TARGET' ? 'UNSAFE_TARGET' : error?.message === 'INVALID_URL' ? 'INVALID_URL' : 'FETCH_FAILED'
    return json(buildReaderFailure(code, '페이지를 읽지 못했습니다. 링크가 공개되어 있는지 확인하거나 원문을 붙여넣어 주세요.'))
  }
}

const image = async (request) => {
  try {
    const target = normalizeReaderUrl(new URL(request.url).searchParams.get('url'))
    if (!safeImageUrl(target, target)) return new Response('Unsupported image URL', { status: 400 })
    const upstream = await fetchUpstream(target)
    const contentType = upstream.headers.get('content-type') ?? ''
    const length = Number(upstream.headers.get('content-length') ?? 0)
    if (!upstream.ok || !contentType.startsWith('image/') || length > MAX_IMAGE_BYTES) return new Response('Image unavailable', { status: 400 })
    const buffer = await upstream.arrayBuffer()
    if (buffer.byteLength > MAX_IMAGE_BYTES) return new Response('Image too large', { status: 400 })
    return new Response(buffer, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public,max-age=300',
        'access-control-allow-origin': ALLOWED_ORIGIN,
      },
    })
  } catch {
    return new Response('Image unavailable', { status: 400 })
  }
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': ALLOWED_ORIGIN,
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'Content-Type',
      },
    })
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })
    const pathname = new URL(request.url).pathname
    if (pathname === '/reader/page') return page(request)
    if (pathname === '/reader/image') return image(request)
    return new Response('Not found', { status: 404 })
  },
}
