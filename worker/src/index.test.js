import test from 'node:test'
import assert from 'node:assert/strict'
import worker from './index.js'

test('Reader Worker가 잘못된 URL을 JSON 실패 결과로 반환한다', async () => {
  const response = await worker.fetch(new Request('https://reader.example/reader/page?url=http%3A%2F%2F127.0.0.1%2Fsecret'))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).status, 'UNSAFE_TARGET')
})

test('Reader Worker가 지원하지 않는 경로를 404로 반환한다', async () => {
  const response = await worker.fetch(new Request('https://reader.example/unknown'))
  assert.equal(response.status, 404)
})

test('짧은 인크루트 페이지는 올바른 Jina 주소와 본문 이미지 우선순위를 사용한다', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls = []
  globalThis.fetch = async input => {
    const url = String(input)
    requestedUrls.push(url)
    if (url.startsWith('https://r.jina.ai/')) {
      return new Response(`Title: 하나캐피탈 인턴사원 모집\n${'채용 공고 상세 내용 '.repeat(80)}\n![공고](https://cdn.example.com/data/addfile/hana-a.png)`, {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }
    return new Response(`
      <html><head><title>2026년 하나캐피탈 채용사이트</title></head><body>
        <p>채용공고 메뉴</p>
        <img src="/img/incruitsubimg_v2.jpg">
        <img src="/img/1_off.png">
        <img src="https://cdn.example.com/data/addfile/hana-a.png">
        <img src="https://cdn.example.com/data/addfile/hana-b.png">
      </body></html>
    `, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
  }

  try {
    const target = 'https://hanacapital.incruit.com/hire/viewhire.asp?projectid=103'
    const response = await worker.fetch(new Request(`https://reader.example/reader/page?url=${encodeURIComponent(target)}`))
    const result = await response.json()

    assert.ok(requestedUrls.includes(`https://r.jina.ai/${target}`))
    assert.equal(result.fallback, 'jina')
    assert.deepEqual(result.imageUrls, [
      'https://cdn.example.com/data/addfile/hana-a.png',
      'https://cdn.example.com/data/addfile/hana-b.png',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('공개 URL이 내부 주소로 리다이렉트되면 따라가지 않는다', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch
  const fetchedUrls = []
  globalThis.fetch = async input => {
    fetchedUrls.push(String(input))
    return new Response('', {
      status: 302,
      headers: { location: 'http://169.254.169.254/latest/meta-data' },
    })
  }

  try {
    const response = await worker.fetch(new Request('https://reader.example/reader/page?url=https%3A%2F%2Fexample.com%2Fredirect'))
    const result = await response.json()
    assert.equal(result.status, 'UNSAFE_TARGET')
    assert.equal(fetchedUrls.some(url => url.startsWith('http://169.254.169.254')), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})
