import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'

const repoRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(repoRoot, 'src/services/linkAnalysisService.ts')
const tempDir = path.join(os.tmpdir(), 'planner-link-analysis-check')
const tempModulePath = path.join(tempDir, 'linkAnalysisService.mjs')

const source = await readFile(sourcePath, 'utf8')
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
})

await mkdir(tempDir, { recursive: true })
await writeFile(tempModulePath, transpiled.outputText, 'utf8')

const { createLinkAnalysisDraft } = await import(tempModulePath)

const innobizUrl = 'https://innobiz.or.kr/IB/news/notice_view.asp?idx=8996&menuno=1'
const innobizText = `
INNOBIZ, 중소기업기술혁신협회
혜택 안내
공지사항 INNOBIZ 협회 공지사항 서울 디지털 인재 이음 취업 캠프 참여자 모집 종류 공지 작성자 양수민 작성일 2026-07-10 조회수 205 서울시와 이노비즈협회가 청년 구직자의 성공적인 취업을 지원하기 위해 '서울 디지털 인재 이음 취업캠프'를 개최합니다. 행사명: 서울 디지털 인재 이음 취업캠프 (1차) 일시: 2026년 7월 27일(월) ~ 7월 28일(화) [1박 2일 합숙형] 장소: 서울대학교 호암교수회관 모집 대상: 관악·구로·금천 지역 청년 구직자 모집 인원: 선착순 50명 참가 혜택: 교육비 및 숙식 전액 무료 주요 프로그램: 자기소개서 첨삭과 실전 모의면접 신청 및 문의: 이노비즈협회
`

const innobizDraft = createLinkAnalysisDraft({
  url: innobizUrl,
  pageText: innobizText,
  target: 'career',
  readerStatus: 'success',
  readerSource: 'direct',
})

assert.equal(innobizDraft.title, '서울 디지털 인재 이음 취업캠프 (1차)')
assert.equal(innobizDraft.organization, '서울시 · 이노비즈협회')
assert.equal(innobizDraft.category, 'camp')
assert.equal(innobizDraft.date, '2026-07-27')
assert.equal(innobizDraft.operationStartDate, '2026-07-27')
assert.equal(innobizDraft.operationEndDate, '2026-07-28')
assert.equal(innobizDraft.deadline, '')
assert.equal(innobizDraft.location, '서울대학교 호암교수회관')
assert.match(innobizDraft.conditions, /관악·구로·금천/)
assert.match(innobizDraft.benefits, /교육비 및 숙식 전액 무료/)
assert.equal(innobizDraft.mode, 'offline')
assert.equal(innobizDraft.confidence, 'high')
assert.equal(innobizDraft.title.includes('notice view'), false)

const contestDraft = createLinkAnalysisDraft({
  url: 'https://contest.example.org/board/2026-final',
  pageText: `
Title: 2026 플래너 서비스 아이디어 공모전
주최: 플래너재단
모집 기간: 2026.07.01 ~ 2026.07.20
선발 발표: 2026.07.24
예선 일정: 2026.07.28
본선 일정: 2026.08.10
최종 결과 발표: 2026.08.12
장소: 서울창업허브
제출 서류: 참가신청서, 기획서 PDF
혜택: 대상 500만원
  `,
  target: 'career',
})

assert.equal(contestDraft.category, 'contest')
assert.equal(contestDraft.deadline, '2026-07-20')
assert.equal(contestDraft.selectionDate, '2026-07-24')
assert.equal(contestDraft.roundDate, '2026-07-28')
assert.equal(contestDraft.finalRoundDate, '2026-08-10')
assert.equal(contestDraft.finalResultDate, '2026-08-12')
assert.match(contestDraft.documents, /기획서 PDF/)
assert.ok(contestDraft.milestones.some(item => item.type === 'final_round' && item.date === '2026-08-10'))

const unknownDraft = createLinkAnalysisDraft({
  url: 'https://example.org/notice_view.asp?id=10',
  target: 'career',
  readerStatus: 'FETCH_FAILED',
  readerMessage: '페이지를 읽지 못했습니다.',
})

assert.equal(unknownDraft.title, '')
assert.equal(unknownDraft.date, '')
assert.equal(unknownDraft.deadline, '')
assert.equal(unknownDraft.mode, undefined)
assert.equal(unknownDraft.confidence, 'low')
assert.ok(unknownDraft.missingFields.includes('제목'))
assert.ok(unknownDraft.missingFields.includes('대표 일정일'))
assert.match(unknownDraft.notice, /페이지를 읽지 못했습니다/)

console.log('link analysis checks passed')
