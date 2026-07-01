import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'

const repoRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(repoRoot, 'src/utils/jobPostingDraft.ts')
const tempDir = path.join(os.tmpdir(), 'planner-job-posting-draft-check')
const tempModulePath = path.join(tempDir, 'jobPostingDraft.mjs')

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

const {
  buildJobPostingLinkDraft,
  detectJobPlatform,
  hasUsefulJobText,
  inferJobPostingFromText,
} = await import(tempModulePath)

const googleSitesUrl = 'https://sites.google.com/view/sesac2606/home/cor/nextsystem?authuser=0'
const incruitUrl = 'https://kdb.incruit.com/hire/viewhire.asp?projectid=125'

const samplePostingText = `
기업명: 주식회사 스탁키퍼
소재지: 서울시 강남구 테헤란로 501
사업내용: 축산 관련 서비스업, 소프트웨어 개발 및 공급업, 육우 사육업

채용 직무 /분야
① 웹 (백엔드)
② 웹 (프론트엔드)

세부 업무 내용 및 기술스택
① 웹(백엔드)
[담당업무]
JAVA, Spring Boot, Spring Data JPA 기반 웹 및 서버 애플리케이션 개발 및 유지보수
AWS ECS, Docker, Git 기반 인프라 및 CI/CD 운영

[기술스택]
Java
Spring Boot
Spring Data JPA
AWS ECS
Docker
Git

② 웹(프론트엔드)
[담당업무]
React Native, Next.js 기반 프론트엔드 서비스 신규 기능 개발 및 유지보수
유지보수성과 재사용성을 고려한 코드 및 컴포넌트 구조 설계

[기술스택 및 역량]
React Native
Next.js
HTML
CSS
ES6

채용 인원(3명)
① 웹 (백엔드): 2명
② 웹 (프론트엔드): 1명

연봉(신입사원 초봉)
3,400~3,800만원

고용형태
정규직 (3개월 수습)

지원 자격
대학교(4년) 졸업
`

const readerMarkdownText = `
Title: 청년취업사관학교(SeSAC) 6월 매칭데이 참여 신청 - 주식회사 스탁키퍼

# 주식회사 스탁키퍼

기업명: 주식회사 스탁키퍼

소재지: 서울시 강남구 테헤란로 501

업력: 2020.10.07

사업내용: 축산 관련 서비스업, 소프트웨어 개발 및 공급업, 육우 사육업

* 채용 직무 /분야

① 웹 (백엔드)

② 웹 (프론트엔드)

* 세부 업무 내용 및 기술스택

[담당업무]

· JAVA, Spring Boot, Spring Data JPA 기반 웹 및 서버 애플리케이션 개발 및 유지보수
· AWS ECS, Docker, Git 기반 인프라 및 CI/CD 운영

[기술스택]

· Java
· Spring Boot
· Spring Data JPA
· AWS ECS
· Docker
· Git

[기술스택 및 역량]

· React Native, Next.js 기반 프론트엔드 서비스 신규 기능 개발 및 유지보수
· 유지보수성과 재사용성을 고려한 코드 및 컴포넌트 구조 설계

· React Native
· Next.js
· HTML
· CSS
· ES6

* 연봉(신입사원 초봉)

3,400~3,800만원

* 고용형태

정규직 (3개월 수습)
`

const saraminReaderText = `
Title: [인빅(주)] [인빅]공통 AI, 백엔드, 프론트엔드 개발자 채용 - 사람인

## 핵심 정보

경력**신입·경력**학력**학력무관**근무형태**정규직**

급여 회사내규에 따름 근무일시 주 5일 근무지역 서울 강남구

## 접수기간 및 방법

시작일 2026.06.12 09:00 마감일 2026.07.11 23:59

기술스택
Python
FastAPI
React
TypeScript
AWS

채용과정에서 수집된 모든 개인정보는 안전하게 관리됩니다.
사람인 공식 AI 서류합격 코칭
`

const wantedReaderText = `
Title: [빗썸] Wallet Security Engineer (블록체인) 채용 공고 | 원티드

빗썸 ∙ 서울 강남구 ∙ 신입 이상

# Wallet Security Engineer (블록체인)

### 주요업무
월렛 아키텍처를 설계하고 키 관리 시스템을 개발합니다.
보안 위협을 모델링하고 모니터링 시스템을 구축합니다.

### 자격요건
Python, Go, Java/Kotlin, Rust 중 하나 이상의 프로그래밍 언어에 능숙하신 분
Secure SDLC, Threat Modeling 실무 경험

## 마감일
상시채용

## 근무지역
역
서울시 강남구 테헤란로 124

<저작권자 (주)원티드랩. 무단전재-재배포금지>
`

const linkOnly = buildJobPostingLinkDraft(googleSitesUrl)
assert.equal(linkOnly.platform, 'company')
assert.equal(linkOnly.company, '')
assert.equal(linkOnly.position, '')
assert.equal(linkOnly.sourceUrl, googleSitesUrl)

const textOnly = inferJobPostingFromText(samplePostingText)
assert.equal(textOnly.company, '주식회사 스탁키퍼')
assert.equal(textOnly.position, '웹 (백엔드) / 웹 (프론트엔드)')
assert.equal(textOnly.location, '서울시 강남구 테헤란로 501')
assert.equal(textOnly.employmentType, '정규직 (3개월 수습)')
assert.ok(textOnly.keywords.includes('Spring Boot'))
assert.ok(textOnly.keywords.includes('React Native'))
assert.ok(textOnly.keywords.includes('Next.js'))
assert.ok(textOnly.note.includes('3,400~3,800만원'))
assert.ok(textOnly.note.includes('주요 업무'))

const linkWithText = buildJobPostingLinkDraft(googleSitesUrl, samplePostingText)
assert.equal(linkWithText.company, '주식회사 스탁키퍼')
assert.equal(linkWithText.position, '웹 (백엔드) / 웹 (프론트엔드)')
assert.equal(linkWithText.platform, 'company')
assert.ok(linkWithText.keywords.includes('AWS ECS'))
assert.equal(linkWithText.deadline, '')

const readerDraft = buildJobPostingLinkDraft(googleSitesUrl, readerMarkdownText)
assert.equal(readerDraft.company, '주식회사 스탁키퍼')
assert.equal(readerDraft.position, '웹 (백엔드) / 웹 (프론트엔드)')
assert.equal(readerDraft.location, '서울시 강남구 테헤란로 501')
assert.equal(readerDraft.employmentType, '정규직 (3개월 수습)')
assert.equal(readerDraft.deadline, '')
assert.ok(readerDraft.keywords.includes('React Native'))
assert.ok(readerDraft.keywords.includes('Spring Data JPA'))
assert.ok(readerDraft.note.includes('주요 업무'))
assert.ok(readerDraft.note.includes('기술스택'))

const saraminDraft = buildJobPostingLinkDraft('https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=search&rec_idx=54290000', saraminReaderText)
assert.equal(saraminDraft.platform, 'saramin')
assert.equal(saraminDraft.company, '인빅(주)')
assert.equal(saraminDraft.position, '공통 AI, 백엔드, 프론트엔드 개발자 채용')
assert.equal(saraminDraft.deadline, '2026-07-11')
assert.equal(saraminDraft.location, '서울 강남구')
assert.equal(saraminDraft.employmentType, '정규직')
assert.ok(saraminDraft.keywords.includes('AI'))
assert.ok(saraminDraft.keywords.includes('백엔드'))
assert.ok(saraminDraft.keywords.includes('프론트엔드'))
assert.ok(saraminDraft.keywords.includes('FastAPI'))
assert.equal(saraminDraft.note.includes('개인정보'), false)
assert.equal(saraminDraft.note.includes('서류합격'), false)

const wantedDraft = buildJobPostingLinkDraft('https://www.wanted.co.kr/wd/353806', wantedReaderText)
assert.equal(wantedDraft.platform, 'wanted')
assert.equal(wantedDraft.company, '빗썸')
assert.equal(wantedDraft.position, 'Wallet Security Engineer (블록체인)')
assert.equal(wantedDraft.location, '서울시 강남구 테헤란로 124')
assert.ok(wantedDraft.keywords.includes('Wallet'))
assert.ok(wantedDraft.keywords.includes('Security'))
assert.ok(wantedDraft.keywords.includes('블록체인'))
assert.ok(wantedDraft.keywords.includes('Python'))
assert.ok(wantedDraft.keywords.includes('Kotlin'))
assert.ok(wantedDraft.keywords.includes('Rust'))
assert.ok(wantedDraft.keywords.includes('Secure SDLC'))
assert.ok(wantedDraft.note.includes('주요 업무'))
assert.equal(wantedDraft.note.includes('원티드랩'), false)

const incruitDraft = buildJobPostingLinkDraft(incruitUrl)
assert.equal(incruitDraft.platform, 'incruit')
assert.equal(incruitDraft.company, 'KDB')

assert.equal(detectJobPlatform(incruitUrl), 'incruit')
assert.equal(hasUsefulJobText('Google Sites home cor nextsystem authuser'), false)
assert.equal(hasUsefulJobText(samplePostingText), true)

const metaTitleDraft = inferJobPostingFromText('청년취업사관학교(SeSAC) 6월 매칭데이 참여 신청 - 주식회사 스탁키퍼')
assert.equal(metaTitleDraft.company, '주식회사 스탁키퍼')

console.log('job posting draft checks passed')
