import { onRequest } from 'firebase-functions/v2/https'
import { buildJinaReaderUrl, buildPageResult, buildReaderFailure, normalizeReaderUrl, rankImageUrls, safeImageUrl } from './reader.js'

const REGION = 'asia-northeast3'
const TIMEOUT_MS = 12000
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const allowCors = (response) => {
  response.set('Access-Control-Allow-Origin', 'https://my-planner-487bd.web.app')
  response.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.set('Access-Control-Allow-Headers', 'Content-Type')
}

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    let currentUrl = normalizeReaderUrl(url)
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      const result = await fetch(currentUrl, { ...options, signal: controller.signal, redirect: 'manual' })
      if (![301, 302, 303, 307, 308].includes(result.status)) return result
      const location = result.headers.get('location')
      if (!location) return result
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
  const response = await fetchWithTimeout(buildJinaReaderUrl(target), { headers: { accept: 'text/plain,*/*;q=0.8' } })
  if (!response.ok) return null
  const text = (await response.text()).slice(0, 30000)
  const imageUrls = []
  for (const match of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    const image = safeImageUrl(match[1], target)
    if (image && !imageUrls.includes(image)) imageUrls.push(image)
  }
  return { text, source: 'reader', imageUrls: rankImageUrls(imageUrls).slice(0, 8) }
}

export const readerPage = onRequest({ region: REGION, timeoutSeconds: 30, memory: '512MiB' }, async (request, response) => {
  allowCors(response)
  if (request.method === 'OPTIONS') return response.status(204).send('')
  if (request.method !== 'GET') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  try {
    const url = normalizeReaderUrl(request.query.url)
    let upstream
    try {
      upstream = await fetchWithTimeout(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; PlannerLinkReader/1.0)',
          accept: 'text/html,text/plain,application/xhtml+xml,*/*;q=0.8',
        },
      })
    } catch (directError) {
      if (directError instanceof Error && directError.message === 'UNSAFE_TARGET') throw directError
      const fallback = await readReaderFallback(url)
      if (fallback?.text) return response.status(200).json({ ...fallback, status: 'success', finalUrl: url, fallback: 'jina' })
      throw directError
    }
    if (!upstream.ok) {
      const fallback = await readReaderFallback(url)
      if (fallback?.text) return response.status(200).json({ ...fallback, status: 'success', finalUrl: url, fallback: 'jina' })
      return response.status(200).json(buildReaderFailure('UPSTREAM_HTTP_ERROR', `원문 사이트 응답 코드 ${upstream.status}`))
    }
    const contentType = upstream.headers.get('content-type') ?? ''
    if (contentType.includes('application/pdf')) {
      const fallback = await readReaderFallback(url)
      return fallback?.text
        ? response.status(200).json({ ...fallback, status: 'success', finalUrl: upstream.url || url, fallback: 'jina' })
        : response.status(200).json(buildReaderFailure('PDF_READ_FAILED', 'PDF 본문을 읽지 못했습니다. PDF 파일 또는 내용을 직접 넣어 주세요.'))
    }
    if (contentType.startsWith('image/')) {
      const imageUrl = safeImageUrl(upstream.url || url, url)
      return response.status(200).json({
        text: '',
        source: 'direct',
        imageUrls: imageUrl ? [imageUrl] : [],
        status: imageUrl ? 'partial' : 'UNSUPPORTED_CONTENT',
        message: imageUrl ? '이미지 링크입니다. OCR로 글자를 읽어 주세요.' : '지원하지 않는 이미지 링크입니다.',
        finalUrl: upstream.url || url,
        fallback: 'direct',
      })
    }
    const body = await decodeResponseText(upstream)
    const result = contentType.includes('html') ? buildPageResult(body, url) : { text: body.slice(0, 30000), source: 'direct', imageUrls: [] }
    if (result.text.length < 600) {
      try {
        const fallback = await readReaderFallback(url)
        if (fallback?.text.length > result.text.length) return response.status(200).json({
          ...fallback,
          imageUrls: rankImageUrls([...fallback.imageUrls, ...result.imageUrls]).slice(0, 8),
          status: 'success',
          finalUrl: upstream.url || url,
          fallback: 'jina',
        })
      } catch { /* Keep the direct result when the fallback is unavailable. */ }
    }
    return response.status(200).json({ ...result, status: result.text ? 'success' : 'partial', finalUrl: upstream.url || url, fallback: 'direct' })
  } catch (error) {
    const code = error?.message === 'UNSAFE_TARGET' ? 'UNSAFE_TARGET' : error?.message === 'INVALID_URL' ? 'INVALID_URL' : 'FETCH_FAILED'
    return response.status(200).json(buildReaderFailure(code, '페이지를 읽지 못했습니다. 링크가 공개되어 있는지 확인하거나 원문을 붙여넣어 주세요.'))
  }
})

export const readerImage = onRequest({ region: REGION, timeoutSeconds: 30, memory: '512MiB' }, async (request, response) => {
  allowCors(response)
  if (request.method === 'OPTIONS') return response.status(204).send('')
  if (request.method !== 'GET') return response.status(405).send('Method not allowed')
  try {
    const url = normalizeReaderUrl(request.query.url)
    if (!safeImageUrl(url, url)) return response.status(400).send('Unsupported image URL')
    const upstream = await fetchWithTimeout(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; PlannerLinkReader/1.0)' } })
    const contentType = upstream.headers.get('content-type') ?? ''
    const length = Number(upstream.headers.get('content-length') ?? 0)
    if (!upstream.ok || !contentType.startsWith('image/') || length > MAX_IMAGE_BYTES) return response.status(400).send('Image unavailable')
    const buffer = Buffer.from(await upstream.arrayBuffer())
    if (buffer.length > MAX_IMAGE_BYTES) return response.status(400).send('Image too large')
    response.set('Cache-Control', 'public,max-age=300')
    response.type(contentType)
    return response.status(200).send(buffer)
  } catch {
    return response.status(400).send('Image unavailable')
  }
})
