import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPageResult,
  normalizeReaderUrl,
  safeImageUrl,
} from './reader.js'

test('스킴 없는 공개 URL을 정규화하고 위험한 URL을 거부한다', () => {
  assert.equal(normalizeReaderUrl('example.com/jobs/1'), 'https://example.com/jobs/1')
  assert.throws(() => normalizeReaderUrl('http://127.0.0.1:8787/secret'), /UNSAFE_TARGET/)
  assert.throws(() => normalizeReaderUrl('file:///tmp/secret'), /INVALID_URL/)
})

test('HTML 제목, 설명, JSON-LD, 본문과 이미지 후보를 공통 결과로 만든다', () => {
    const result = buildPageResult(`
      <html><head>
        <title>프론트엔드 개발자 채용</title>
        <meta property="og:description" content="React 개발자를 모집합니다.">
        <script type="application/ld+json">{"@type":"JobPosting","hiringOrganization":{"name":"플래너원"},"jobLocation":{"address":{"addressLocality":"서울"}}}</script>
      </head><body>
        <h1>프론트엔드 개발자</h1><p>주요 업무와 지원 자격</p>
        <img src="/assets/poster.png"><img src="/assets/logo.png">
      </body></html>
    `, 'https://example.com/jobs/1')

  assert.equal(result.source, 'direct')
  assert.match(result.text, /플래너원/)
  assert.match(result.text, /주요 업무와 지원 자격/)
  assert.deepEqual(result.imageUrls, ['https://example.com/assets/poster.png'])
})

test('절대·상대 이미지 URL을 읽되 추적 이미지와 잘못된 URL은 제외한다', () => {
  assert.equal(safeImageUrl('/poster.webp', 'https://example.com/jobs/1'), 'https://example.com/poster.webp')
  assert.equal(safeImageUrl('https://example.com/pixel.gif', 'https://example.com'), '')
  assert.equal(safeImageUrl('javascript:alert(1)', 'https://example.com'), '')
})
