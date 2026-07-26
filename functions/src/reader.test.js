import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildJinaReaderUrl,
  buildPageResult,
  normalizeReaderUrl,
  rankImageUrls,
  safeImageUrl,
} from './reader.js'

test('스킴 없는 공개 URL을 정규화하고 위험한 URL을 거부한다', () => {
  assert.equal(normalizeReaderUrl('example.com/jobs/1'), 'https://example.com/jobs/1')
  assert.throws(() => normalizeReaderUrl('http://127.0.0.1:8787/secret'), /UNSAFE_TARGET/)
  assert.throws(() => normalizeReaderUrl('http://169.254.169.254/latest/meta-data'), /UNSAFE_TARGET/)
  assert.throws(() => normalizeReaderUrl('http://[::1]/secret'), /UNSAFE_TARGET/)
  assert.throws(() => normalizeReaderUrl('http://metadata.google.internal/computeMetadata/v1'), /UNSAFE_TARGET/)
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

test('Jina Reader 주소를 원본 스킴이 중복되지 않게 만든다', () => {
  assert.equal(
    buildJinaReaderUrl('https://example.com/notices/1?view=full'),
    'https://r.jina.ai/https://example.com/notices/1?view=full',
  )
})

test('표 기반 공지의 셀 경계를 줄바꿈으로 보존한다', () => {
  const result = buildPageResult(`
    <table>
      <tr><th>행사명</th><td>서울 디지털 인재 이음 취업캠프</td></tr>
      <tr><th>일시</th><td>2026년 7월 27일 ~ 7월 28일</td></tr>
      <tr><th>장소</th><td>서울대학교 호암교수회관</td></tr>
    </table>
  `, 'https://example.com/notice/1')

  assert.match(result.text, /행사명\n서울 디지털 인재 이음 취업캠프/)
  assert.match(result.text, /일시\n2026년 7월 27일 ~ 7월 28일/)
})

test('채용 페이지의 본문 이미지를 메뉴 이미지보다 먼저 정렬한다', () => {
  const urls = rankImageUrls([
    'https://hanacapital.incruit.com/img/incruitsubimg_v2.jpg',
    'https://hanacapital.incruit.com/img/1_off.png',
    'https://raspfiles2.incruit.com/hanacapital/data/103/SuccessData/addFile/recruit.png',
  ])

  assert.deepEqual(urls, [
    'https://raspfiles2.incruit.com/hanacapital/data/103/SuccessData/addFile/recruit.png',
  ])
})
