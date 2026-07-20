import {
  buildPageResult,
  buildReaderFailure,
  normalizeReaderUrl,
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
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; PlannerLinkReader/1.0)',
        ...init.headers,
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

const page = async (request) => {
  try {
    const target = normalizeReaderUrl(new URL(request.url).searchParams.get('url'))
    const upstream = await fetchUpstream(target, {
      headers: { accept: 'text/html,text/plain,application/xhtml+xml,*/*;q=0.8' },
    })
    if (!upstream.ok) return json(buildReaderFailure('UPSTREAM_HTTP_ERROR', `원문 사이트 응답 코드 ${upstream.status}`))
    const contentType = upstream.headers.get('content-type') ?? ''
    const body = await upstream.text()
    const result = contentType.includes('html') ? buildPageResult(body, target) : {
      text: body.slice(0, 30000), source: 'direct', imageUrls: [],
    }
    return json({ ...result, status: result.text ? 'success' : 'partial', finalUrl: upstream.url || target })
  } catch (error) {
    const code = error?.message === 'UNSAFE_TARGET' ? 'UNSAFE_TARGET' : error?.message === 'INVALID_URL' ? 'INVALID_URL' : 'FETCH_FAILED'
    return json(buildReaderFailure(code, '페이지를 읽지 못했습니다. 링크가 공개되어 있는지 확인하거나 원문을 붙여넣어 주세요.'))
  }
}

const image = async (request) => {
  try {
    const target = normalizeReaderUrl(new URL(request.url).searchParams.get('url'))
    if (!/\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(new URL(target).pathname)) return new Response('Unsupported image URL', { status: 400 })
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
