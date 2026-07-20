import { onRequest } from 'firebase-functions/v2/https'
import { buildPageResult, buildReaderFailure, normalizeReaderUrl, safeImageUrl } from './reader.js'

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
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' })
  } finally {
    clearTimeout(timer)
  }
}

export const readerPage = onRequest({ region: REGION, timeoutSeconds: 30, memory: '512MiB' }, async (request, response) => {
  allowCors(response)
  if (request.method === 'OPTIONS') return response.status(204).send('')
  if (request.method !== 'GET') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  try {
    const url = normalizeReaderUrl(request.query.url)
    const upstream = await fetchWithTimeout(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; PlannerLinkReader/1.0)',
        accept: 'text/html,text/plain,application/xhtml+xml,*/*;q=0.8',
      },
    })
    if (!upstream.ok) return response.status(200).json(buildReaderFailure('UPSTREAM_HTTP_ERROR', `원문 사이트 응답 코드 ${upstream.status}`))
    const contentType = upstream.headers.get('content-type') ?? ''
    const body = await upstream.text()
    const result = contentType.includes('html') ? buildPageResult(body, url) : { text: body.slice(0, 30000), source: 'direct', imageUrls: [] }
    return response.status(200).json({ ...result, status: result.text ? 'success' : 'partial', finalUrl: upstream.url || url })
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
