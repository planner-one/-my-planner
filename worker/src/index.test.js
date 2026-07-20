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
