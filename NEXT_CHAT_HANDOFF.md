# 다음 채팅 인수인계

_작성일: 2026-06-28_
_갱신일: 2026-07-16 (SC-10 모바일 탐색·테마·반응형 밀도 운영 배포·자산 확인 기준)_

이 파일은 새 Codex 또는 Claude Code 세션에서 바로 이어 작업하기 위한 현재 상태 메모입니다.
새 세션에서는 먼저 이 파일과 `AGENTS.md`, `PROGRESS.md`, `REQUIREMENTS.md`, `SCENARIOS.md`, `RELEASES.md`, `COPYRIGHT_AND_SERVICE_NOTES.md`, `LINK_IMPORT_GUIDE.md`, `JOB_POSTING_LINK_READER.md`, `PLANNER_SYSTEM_AUDIT_2026-07-04.md`, `UPDATE_SCHEDULE.md`를 읽고 시작하면 됩니다.

## 한 줄 요약

플래너는 Firebase 기반 React/Vite/TypeScript 앱이며, SC-07 위젯 검토와 SC-08 사이드바 기능 페이지, SC-09 테마 정리, SC-10 태블릿/모바일 반응형 코드 QA까지 완료했습니다. v0.3.0~v0.3.2에서는 작업 흐름 위젯, 주요 페이지 UX, 내 신청/지원 공고/캘린더 연결을 보강했고, v0.3.3~v0.3.9에서는 지원 공고 링크 Reader와 사람인/원티드 파싱을 보강했습니다. v0.3.10에서는 목표 위젯/목표 페이지의 오늘 집중을 날짜별 오늘 방향으로 정리했고, v0.3.11에서는 오늘 할 일 위젯/페이지에 오늘·내일 선택과 다음 날 브리핑을 추가했습니다. v0.3.12에서는 지난 날짜 미완료 Todo를 오늘 날짜로 자동 이월하도록 보강했고, v0.3.13에서는 브리핑 알림 설정을 내 계정 기준으로 저장하도록 보강했습니다. v0.3.14에서는 생산성 추이 위젯에서 날짜별 생산성 기록 상세 페이지로 이동할 수 있게 했고, v0.3.15에서는 생산성 기록 페이지 요약 UX와 추이/구성 그래프를 보강했습니다. v0.3.16에서는 `check:doc-sync` 문서-코드 자동 점검과 `내 신청`/`지원 공고`/`오늘 할 일`의 빠른 추가·필터 밀도 보정을 반영했고, v0.3.17에서는 공통 패널/버튼/입력 밀도 기준과 캘린더의 표시 항목 패널, sticky agenda, 빠른 추가 패널을 정리했습니다. 현재 v0.3.18 Planner Flow Clarity 범위에서 SC-16 신규 사용자 온보딩의 코드 구현과 자동 회귀 검사를 완료했으며, 앱 버전은 v0.3.17로 유지합니다. SC-10의 동적 viewport 하단 메뉴, 홈 고정+계정별 바로가기 네 개, 모바일 네 테마 패널, viewport 기반 자동 밀도는 전체 자동 검사와 통합 리뷰 후 Firebase Hosting 운영 배포·자산 확인까지 완료했습니다. 인증 세션이 필요한 실제 대시보드와 실기기 주소창·키보드 QA 전에는 전체 모바일 최적화 완료 또는 새 릴리즈로 보지 않습니다.

## 작업 위치와 원격

- 로컬 경로: `/Users/minsujeong/planner`
- GitHub remote: `https://github.com/planner-one/-my-planner.git`
- 브랜치: `main`
- 배포: Firebase Hosting
- 배포 URL: `https://my-planner-487bd.web.app`
- GitHub Pages는 사용하지 않습니다.
- 현재 HEAD: `d12a1a2 feat: refine planner scheduling and mobile UX`
- 현재 앱 버전: `v0.3.17 UI System Pass`
- 현재 로컬 브랜치 상태: SC-10 모바일 입력·루틴 안정화 1차 보강과 후속 탐색·테마·밀도 변경은 모두 Firebase Hosting에 배포됐고 후속 운영 자산도 확인했습니다. 로컬 변경은 아직 커밋/푸시하지 않았으며, 로그인 세션 기능과 실기기 주소창·키보드 QA가 필요합니다.
- 최근 push와 Firebase Hosting 배포는 `planner-one` 계정으로 성공했습니다.

## 2026-07-14 SC-16 신규 사용자 온보딩 진행 기준

- 대상: Google 로그인 후 `users/{uid}` 문서가 없는 신규 계정만 온보딩 v1을 최초 1회 자동 표시합니다. 온보딩 필드가 없는 기존 사용자 문서는 레거시로 보고 자동 표시하지 않습니다.
- 흐름: `사용 목적 선택 → 핵심 기능 이해 → 첫 항목 작성 → 맞춤 홈 적용` 4단계입니다.
- 목적: 일상 관리, 업무·학습, 취업 준비, 기회·신청 관리별로 기존 Todo·작업·지원 공고·기회 일정/내 신청 데이터 구조와 starter 위젯 프리셋을 사용합니다.
- 저장: `users/{uid}.onboarding`에 v1 상태를 계정별로 저장하고, 완료 시 첫 항목·프리셋·상태를 한 즉시 저장 payload로 반영합니다. 저장 실패 시 화면을 유지하고 다중 탭에서는 `completed > skipped > pending` 순위를 보호합니다.
- 건너뛰기: 작성 중 초안을 버리고 빈 홈에만 `Todo·캘린더·빠른 메모·일일 루틴·메뉴` 범용 프리셋을 적용합니다.
- 다시 보기: 프로필의 `사용 가이드 다시 보기`는 데이터와 레이아웃을 바꾸지 않는 안내 전용 모드이며 마지막에 대시보드 편집 화면으로 연결합니다.
- 상태: 요구사항 R-077~086과 SC-16 코드 구현, 온보딩/병합/기존 기능 회귀, 타입체크, 빌드, 문서 동기화 검사는 완료했습니다. 로그인 후 390/768/1024px 및 데스크톱 육안 QA는 아직 기록하지 않습니다.
- 범위 제외: 약관·개인정보 처리방침 작성과 동의 수집은 이번 온보딩과 분리하고 공개 신규 가입 확대 전 별도 운영 문서 작업으로 진행합니다.

## 2026-07-16 SC-10 모바일 실기기 피드백 1차 보강

- 일일 루틴 떨림 원인: `useWidgetSize`의 content-box 폭과 `HabitWidget`의 compact padding이 334~345px 외부 폭에서 서로를 바꾸며 반응형 상태가 반복됐습니다.
- 수정 기준: 위젯 크기는 border-box를 관찰하고, 동일한 폭·높이는 React state를 다시 만들지 않습니다.
- 모바일 로그아웃: 전체 메뉴의 페이지 그리드 아래에 사용자 정보와 전체 폭 로그아웃 버튼을 두고 기존 `saveNow → signOut` 순서를 유지합니다. 메뉴는 초기 포커스, Tab 순환, Escape 닫기, 트리거 복귀를 지원합니다.
- 글쓰기 1차 기준: 767px 이하에서 본문 좌우 12px, 본문과 링크 정리·빠른 추가·온보딩 포털의 텍스트 입력/선택 16px·44px, textarea 최소 96px, 하단 탭 safe area를 적용합니다.
- 회귀 검사: `npm run check:mobile-ux`로 실제 border-box 측정 유틸의 334/340/345px 안정성, 독립 로그아웃 연결, 포털 포함 입력/터치 CSS 계약을 확인합니다.
- 운영 반영: 2026-07-16 `firebase deploy --only hosting` 성공 후 새 해시 자산과 포털 입력 CSS 응답을 운영 URL에서 확인했습니다.
- 남은 확인: 로그인된 실제 모바일에서 루틴 카드 떨림 제거, 키보드가 열린 상태의 긴 폼 스크롤, 전체 메뉴 로그아웃 동작을 육안 확인합니다. 이번 1차 보강만으로 전체 모바일 최적화 완료로 표현하지 않습니다.

## 2026-07-16 SC-10 모바일 탐색·테마·반응형 밀도 보강

- 하단 메뉴: 앱 셸 높이를 `100dvh`와 safe area 기준으로 보강하고, 홈 고정+계정별 바로가기 네 개의 다섯 칸 구조로 변경했습니다.
- 하단 메뉴 편집: 모바일 전체 메뉴 상단에서 정확히 네 개 선택, 제거 후 추가, 위·아래 이동, 초기화, 저장 후 즉시 반영을 제공합니다.
- 테마: 모바일 상단 팔레트 버튼에서 라이트·다크·코랄·블루를 직접 선택하고 Escape·포커스 복귀를 지원합니다.
- 화면 밀도: viewport 폭 기준 휴대폰·태블릿은 100%, 웹 자동은 90%를 적용하며 기존 웹 직접 설정 80~110%를 보존합니다.
- 저장: `navigationPreferences`, `displayPreferences`는 `users/{uid}`의 optional 설정이며 `updatedAt` 최신값 우선 병합으로 오래 열린 탭의 stale-save를 보호합니다.
- 자동 검증: 전용 반응형 UI와 기존 모바일 UX·문서·온보딩·데이터 회귀 검사, TypeScript, Vite 프로덕션 빌드, diff 검사가 모두 통과했습니다. `check:doc-sync`는 TSX AST로 실제 `NAV_ITEMS`만 엄격 검증하고 unsupported 문법·중복을 위치와 함께 실패시킵니다.
- 운영 배포: `firebase deploy --only hosting` exit 0, `hosting[my-planner-487bd]` 33개 파일 업로드와 release complete, `https://my-planner-487bd.web.app`을 확인했습니다.
- 운영 자산: `index-CD5IE4I1.js`, `index-D8jI16M-.css`, `App-zMiqyG0Y.js`, `ProfilePage-Be2h5m7v.js`와 `100dvh`, `mobile-navigation-editor`, `mobile-theme-trigger`, `자동(권장)` 표식을 확인했습니다.
- 운영 로그인 전 화면: 390/768/1024px에서 scale 1, `100dvh`, horizontal overflow 0, console error 0을 확인했습니다.
- 남은 단계: 브라우저에 인증 세션이 없어 로그인 후 실제 대시보드 하단 메뉴·편집·테마·밀도와 실기기 주소창·키보드 QA는 완료하지 못했습니다. 앞선 1차 배포와 이번 후속 배포 이력을 모두 보존하되 전체 모바일 최적화 완료로 표현하지 않습니다.

## 2026-07-04 설계 감사 반영

현재 구조를 "모르는 게 없을 때까지" 확인하기 위한 기준 문서를 추가했습니다.

- `PLANNER_SYSTEM_AUDIT_2026-07-04.md`: 페이지 18개, 위젯 15개, `UserData` 주요 필드, Firebase 저장 흐름, 로컬 Reader API와 배포 차이, 디자인/반응형 상태, 보완점 정리
- `UPDATE_SCHEDULE.md`: v0.3.11 내일 브리핑 완료, v0.3.12 미완료 Todo 자동 이월 완료, v0.3.13 내 계정 브리핑 알림 설정 완료, v0.3.14 생산성 기록 완료, v0.3.15 생산성 기록 그래프/UX 보강 완료, v0.3.16 문서/QA 기준, v0.3.17 UI System Pass, v0.3.18 신규 사용자 온보딩과 플래너 흐름 구분 진행 중, v0.3.19 데이터 품질/AI 준비, v0.4.0 운영 API 준비, v0.5.0 유료 AI 후보 순서 기록
- 확인된 보완점: 운영 배포용 지원 공고 Reader API 부재, 실기기 반응형 QA 필요, 디자인 시스템 불균일, 자동 점검 스크립트 부족, 데이터 내보내기/삭제와 약관/개인정보 문서 필요
- KDB 인크루트 링크 `https://kdb.incruit.com/hire/viewhire.asp?projectid=125`는 직접 접근 시 잘못된 경로 응답을 주지만, Reader가 `http://kdb.incruit.com/...` 대상으로 접근하면 한국산업은행 공고 본문을 읽을 수 있어 인크루트 `http` 대상 재시도를 추가했습니다.
- 지원 공고 링크 초안은 이제 본문 추출 없이 URL 슬러그만 잡힌 경우를 성공으로 표시하지 않습니다. `/api/job-posting-page`가 없을 때는 브라우저 Reader fallback을 시도하고, 그래도 실패하면 수동 붙여넣기 안내를 표시합니다.
- 다음 구현 후보는 `UPDATE_SCHEDULE.md`를 먼저 보고 사용자와 하나씩 확정합니다.

## 2026-07-01 v0.3.0 반영 변경

2026-07-01 기준 SC-10 반응형 주의사항, Firebase 배포 확인 이력, 저작권/서비스 보호 메모, 링크 정리 1차 기반 구현, 정식 노트 보강, 작업 흐름 가시화 보강이 반영되었습니다.

- `COPYRIGHT_AND_SERVICE_NOTES.md`: 저작권, 무단 복제/재배포 방지, 약관/개인정보 문서화 메모 추가
- `LINK_IMPORT_GUIDE.md`: 링크 자동 정리에 적합한 공개 링크와 분석이 어려운 링크 기준 추가
- `JOB_POSTING_LINK_READER.md`: 지원 공고 링크 Reader의 사용자 흐름, 코드 흐름, 추출 필드, 로컬/배포 차이, 검증 기준 기록
- `AGENTS.md`: 문서 구조에 저작권/서비스 보호 메모 추가
- `REQUIREMENTS.md`: 실기기 반응형 QA 최소 확인 폭과 정보량 많은 화면 확인 항목 추가
- `REQUIREMENTS.md`: AI 링크 자동 정리/유료 기능 후보 요구사항과 1차 구현 범위 추가
- `SCENARIOS.md`: SC-10 주의사항과 SC-12 AI 링크 자동 정리 1차 기반 구현 상태 추가
- `RELEASES.md`: v0.5.x Paid Intelligence Candidate 후보 추가
- `PROGRESS.md`: 2026-07-01 Firebase rules 동기화, SC-10 주의사항, 저작권/AI 링크 문서화 및 링크 정리 구현 이력 추가
- `NEXT_CHAT_HANDOFF.md`: 현재 HEAD, 배포 확인 상태, 다음 작업 주의사항 최신화
- `src/services/linkAnalysisService.ts`: URL/메모 기반 링크 초안 생성 서비스 추가
- `src/services/linkAnalysisService.ts`: 이미지 포스터 텍스트 기반 신청 마감일, 행사일, 시간, 장소 초안 추출 추가
- `src/components/LinkOrganizerModal.tsx`: 전역 링크 정리 모달, 이미지 포스터 모드, 업로드 이미지 OCR 추가
- `package.json`, `package-lock.json`: 브라우저 OCR용 `tesseract.js` 의존성 추가
- `public/favicon.svg`, `index.html`: 브라우저 탭용 플래너 favicon 추가
- `src/pages/Notes.tsx`, `src/types/index.ts`: 빠른 메모와 정식 노트 탭을 분리하고 정식 노트에 자동 날짜, 핵심 키워드, 참고 링크, 수정/삭제 흐름 추가
- `src/widgets/WorkOverviewWidget.tsx`, `src/widgets/index.ts`, `src/pages/Dashboard.tsx`: 작업 관리, 프로젝트, 목표를 대시보드에서 함께 보는 작업 흐름 위젯 추가
- `src/pages/Projects.tsx`, `src/pages/TaskTracker.tsx`, `src/pages/Goals.tsx`, `src/pages/DailyPlanner.tsx`, `src/pages/WeeklyPlanner.tsx`: 요약 지표와 마감/다음 액션 연결 보강
- `src/pages/TaskTracker.tsx`, `src/pages/Projects.tsx`, `src/pages/Goals.tsx`, `src/pages/DailyPlanner.tsx`, `src/pages/WeeklyPlanner.tsx`, `src/pages/Journal.tsx`: v0.3.1 기준 실행 대기열, 다음 결과물, 오늘 집중, 일일/주간 운영 브리핑, 저널 작성 흐름 UI/UX 보강
- `src/pages/PersonalApplications.tsx`, `src/pages/JobPostings.tsx`, `src/store/AppContext.tsx`, `src/types/index.ts`: 내 신청과 지원 공고 모음 페이지, `personalApplications`/`jobPostings` Firestore 저장 필드 추가
- `src/pages/CalendarPage.tsx`, `src/widgets/CalendarWidget.tsx`, `src/utils/calendar.ts`: 내 신청과 지원 공고의 마감/신청/지원/결과/시작/종료 날짜를 캘린더 표시 항목으로 연결
- `src/components/PageShell.tsx`: 사이드바/상단 헤더 링크 정리 버튼 추가
- `src/pages/CareerEvents.tsx`: 기회 일정 "링크에서 추가/불러오기" 연결
- `src/pages/TaskTracker.tsx`, `src/pages/Notes.tsx`, `src/types/index.ts`: `sourceUrl` 보존과 원본 링크 표시 보강
- `src/App.tsx`, `vite.config.js`: 페이지 단위 `React.lazy` 로딩과 React/Firebase/그리드/차트/OCR vendor 청크 분리로 500KB 초과 번들 경고 제거
- `src/pages/JobPostings.tsx`: 지원 공고 링크 입력을 접힌 보조 패널로 분리하고, 링크 기반 초안 반영, 추출 상세/메모 표시, 요약 목록 + 오른쪽 상세 편집 패널, 저장 카드별 분석 반영 추가
- `src/utils/jobPostingDraft.ts`, `scripts/check-job-posting-draft.mjs`: 지원 공고 링크/본문 분석 로직을 공통 유틸로 분리하고 Google Sites/인크루트/붙여넣기 본문 회귀 테스트 추가
- `src/services/jobPostingPageReader.ts`, `vite.config.js`, `src/utils/jobPostingDraft.ts`: 로컬 같은 출처 `/api/job-posting-page` Reader API를 추가해 Google Sites CORS 차단 링크 본문을 읽고 주요 업무/조건을 추출하도록 보강. 페이지 이미지 후보가 잡히면 `/api/job-posting-image`와 브라우저 OCR로 첫 이미지 텍스트를 읽어 공고 원문/OCR 칸에 반영. 배포본은 Firebase Functions/백엔드 이관 필요
- `src/utils/jobPostingDraft.ts`, `src/pages/JobPostings.tsx`, `vite.config.js`, `src/services/jobPostingPageReader.ts`: 사람인/원티드 제목·핵심 정보·근무지역·마감일·키워드 추출 보강, 광고/개인정보/저작권 잡음 제외, 저장된 공고의 `분석 반영` Reader 재분석 흐름 추가
- `src/pages/JobPostings.tsx`: 지원 공고 상태를 지원 완료/면접/오퍼로 바꾸면 지원일 칸을 즉시 노출하고, 비어 있으면 오늘 날짜를 기본 지원일로 자동 기록
- `src/pages/JobPostings.tsx`, `src/types/index.ts`: 기업/기관 채용 페이지와 인크루트 기업 도메인 플랫폼 추가, 링크만 있는 공고 저장, 읽을 수 있는 본문 기반 기업명/직무 초안 보강
- `src/pages/JobPostings.tsx`: 링크 초안 패널 안에 페이지 내용 붙여넣기 영역 추가, 기업명/직무/소재지/고용형태/기술스택/연봉·자격·우대사항 메모 추출 보강
- `src/pages/JobPostings.tsx`: 공고 힌트 없는 자동 본문 제외, Google Sites 경로명 회사명 오인 방지, 붙여넣은 내용 즉시 반영 버튼, 소재지/사업내용 라벨 파싱 수정
- 추후 유료 AI 맞춤 기능을 위해 Todo, 작업, 목표, 프로젝트, 기회 일정, 내 신청, 지원 공고, 노트, 회고, 저널의 날짜·상태·카테고리·진행률·키워드·원본 링크·완료/변경 이력을 사용자별 구조화 데이터로 보존하는 기준을 추가했습니다.
- Google Form처럼 로그인/쿠키/접근 권한이 필요한 링크는 실제 폼 내용을 읽을 수 없으므로, 본문 분석 불가 안내와 수동 보정 흐름으로 처리합니다.
- 공개 공고/행사/교육/채용 페이지처럼 자동 정리에 적합한 링크 기준은 `LINK_IMPORT_GUIDE.md`를 참고합니다.
- 이미지 포스터형 게시글은 현재 이미지 파일 업로드 OCR 또는 포스터에서 읽은 텍스트를 붙여넣어 초안을 만들 수 있습니다. 링크 페이지 내부 이미지를 자동으로 찾아 OCR/이미지 분석하는 기능은 추후 유료 기능 후보입니다.
- 브라우저 OCR은 첫 실행 시 언어 데이터 로딩 시간이 걸릴 수 있고, 네트워크 실패 시 포스터 텍스트 직접 입력으로 대체합니다.

## 최근 커밋 흐름

```text
d799554 fix: prevent invalid Firebase deployments
d247713 feat: add career milestone planning
8fc71ec fix: scroll recent productivity logs
c6f6895 feat: add unified inbox to profile
04c609f fix: repair carried todo history
2f966c1 fix: preserve todo carry history
5def235 fix: protect todo saves from stale data
7b6f54a feat: improve planner carryover and logs
772b525 fix: improve job posting reader fallback
f3ce56e fix: stabilize planner QA flows
d339be2 fix: reset goal focus by date
f9b7e6d feat: improve job posting link parsing
```

## 사용자 작업 방식

- 사용자는 한 번에 여러 기능을 임의 진행하는 것을 원하지 않습니다.
- 기능 하나 검토 → 문제 의논 → 수정 → 사용자 확인 → 커밋/푸시 순서로 진행합니다.
- 작업 후 사용자가 확인하거나 명시하면 커밋/푸시합니다.
- 배포 반영이 필요한 경우 Firebase Hosting으로 배포합니다.

## 실행과 검증 명령

```bash
npm run dev
npm run build
npx tsc --noEmit
firebase deploy --only hosting
```

최근 검증:

- 2026-06-29 `npm run build` 통과
- 2026-06-29 `npx tsc --noEmit` 통과
- 2026-06-29 `git diff --check` 통과
- 2026-06-29 충돌 마커 검색 통과
- 2026-06-29 ai_agent 플래너 에이전트 8개 모두 공통 원칙 참조와 한글 작업 표시 확인
- 2026-06-29 `projects` 구현 후 `npm run build`, `npx tsc --noEmit`, `git diff --check` 통과
- 2026-06-29 SC-08~SC-10 보강 후 `npm run build`, `npx tsc --noEmit`, `git diff --check`, 충돌 마커 검색 통과
- 2026-06-29 로컬 dev 서버 `http://127.0.0.1:5181/` 기동 및 HTTP 200 확인
- 2026-06-29 테마 대비 계산 통과: light/dark/coral/blue의 text·muted·accent 대비 확인
- 2026-06-29 에이전트 합동 연결 보강 후 page id 자동 점검 통과: `App.tsx`, `PageShell.tsx`, `MenuWidget.tsx`, `REQUIREMENTS.md` page id 일치
- 2026-06-29 에이전트 합동 연결 보강 후 위젯 등록 자동 점검 통과: 14개 위젯, 문서 순서 W01~W14 일치
- 2026-06-29 에이전트 합동 연결 보강 후 `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색 통과
- 2026-06-29 캘린더 관리 페이지 추가 후 page id 자동 점검 통과: 15개 page id 일치
- 2026-06-29 캘린더 관리 페이지 추가 후 `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색, 로컬 dev 서버 5181 HTTP 200 확인 통과
- 2026-06-30 Todo 미완료 이월 기능 추가 후 `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색, 로컬 dev 서버 5180 HTTP 200 확인 통과
- 2026-06-30 데스크톱 사이드바 UX 개선 후 `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색, 로컬 dev 서버 5182 HTTP 200 확인 통과
- 2026-06-30 Todo 과거 미완료 가져오기 개선 후 `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색, 로컬 dev 서버 5182 HTTP 200 확인 통과
- 2026-06-30 Todo 기록 보정 화면 직접 올리기 개선 후 `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색, 로컬 dev 서버 5182 HTTP 200 확인 통과
- 2026-06-30 v0.2.0 버전 정리 후 `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색, 로컬 dev 서버 5182 HTTP 200 확인 통과
- 2026-07-01 지원 공고 Reader/파서 보강 후 `npm run check:job-draft`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색 통과
- 2026-07-03 v0.3.10 Goal Focus Reset 후 `npm run check:job-draft`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색 통과
- 2026-07-04 설계 감사/문서 동기화 후 `npm run check:job-draft`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색 통과
- 2026-07-04 KDB 인크루트 Reader 보강 후 로컬 `/api/job-posting-page`가 `source: reader`로 한국산업은행 본문을 반환하는 것 확인, `npm run check:job-draft`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, 충돌 마커 검색 통과
- 2026-07-04 지원 공고 링크 초안 성공 판정/브라우저 Reader fallback 보강 후 `npm run check:job-draft`, `npx tsc --noEmit`, `npm run build` 통과
- 2026-07-04 내일 Todo/다음 날 브리핑 보강 후 `npm run check:planner-briefing`, `npm run check:todo-history`, `npm run check:job-draft`, `npx tsc --noEmit` 통과
- 2026-07-04 미완료 Todo 자동 이월 보강 후 `npm run check:todo-history`, `npx tsc --noEmit` 통과
- 2026-07-04 내 계정 브리핑 알림 설정 보강 후 `npm run check:planner-briefing`, `npm run check:todo-history`, `npx tsc --noEmit` 통과
- 2026-07-05 v0.3.15 생산성 기록 그래프/UX 보강 후 `npm run check:productivity-log`, `npx tsc --noEmit`, `npm run build`, `git diff --check` 통과
- 2026-07-08 Todo 자동 이월 기록 보존 보정 후 `npm run check:todo-history`, `npm run check:user-data-merge`, `npx tsc --noEmit`, `npm run build` 통과
- 2026-07-16 SC-10 모바일 탐색·테마·밀도 보강 후 `check:responsive-ui`, `check:mobile-ux`, `check:doc-sync`, `check:onboarding`, `check:user-data-merge`, `check:todo-history`, `check:planner-briefing`, `check:career-milestones`, `check:personal-application-dates`, `check:job-draft`, `check:productivity-log`, `npx tsc --noEmit`, `npm run build`, `git diff --check` 통과. Firebase Hosting 33개 파일 배포, 새 운영 자산 표식, 로그인 전 390/768/1024px viewport 확인 완료; 인증 세션·실기기 QA는 대기

주의:

- dev 서버 포트 `5173`이 사용 중이면 Vite가 다른 포트를 쓸 수 있습니다.
- 이번 세션에서는 로컬 dev 서버가 `http://localhost:5173/`에서 응답 중입니다.
- 인앱 브라우저는 로그인 전 화면만 확인되어, 로그인 후 실제 생산성 기록 화면 육안 QA는 사용자 세션에서 확인 권장입니다.
- 배포 후 사용자가 실제 Firebase Hosting URL에서 확인하는 흐름이 자주 있었습니다.

## 현재 앱 구조

주요 진입:

- `src/App.tsx`: 로그인 여부, 데이터 로딩, 현재 페이지 렌더링
- `src/components/PageShell.tsx`: 사이드바, 모바일 하단 탭, 테마, 로그아웃, 홈 복귀 버튼
- `src/store/AppContext.tsx`: Firestore 사용자 데이터 전체 상태와 저장 로직
- `src/store/RouterContext.tsx`: URL 라우터 대신 page 상태로 화면 전환
- `src/types/index.ts`: 앱 데이터 타입
- `src/widgets/index.ts`: 위젯 등록 목록
- `src/version.ts`: 앱 버전, 릴리즈 날짜, 릴리즈 이름, 프로필 표시용 릴리즈 노트
- `src/utils/plannerBriefing.ts`: 다음 날 Todo, 하루 방향, 예정 작업, 기회 일정, 내 신청, 지원 공고, 작업/목표/프로젝트 마감을 알림용 브리핑으로 모으는 공통 유틸

데이터 저장:

- 로그인 사용자 데이터는 `AppContext`에서 관리합니다.
- 일반 상태 변경은 1초 debounce 저장입니다.
- 레이아웃 저장, 로그아웃 전 저장 등은 즉시 저장 함수가 있습니다.
- 사용자별 화면 비율 `uiScale`은 Firestore에 저장됩니다.
- 계정별 모바일 하단 바로가기 `navigationPreferences`와 자동/직접 화면 밀도 모드 `displayPreferences`는 Firestore `users/{uid}`에 optional로 저장되고, 기존 `uiScale`은 웹 직접 설정 값으로 보존됩니다.
- 사용자별 브리핑 알림 설정 `notificationPreferences`는 Firestore `users/{uid}`에 저장되며 알림 범위는 `ownAccount`로 고정합니다.
- SC-16의 계정별 온보딩 상태는 `users/{uid}.onboarding`에 저장하며, 기존 문서에 필드가 없으면 자동 온보딩 대상이 아닌 레거시 사용자로 유지합니다.
- 사용자 전환 시 이전 계정 pending save가 새 계정에 들어가지 않도록 저장 UID와 계정 메타데이터를 캡처하고, `weather_location`, `theme`, `clock_widget_mode` localStorage도 계정 전환 시 정리합니다.

위젯 제목줄 액션 + 모달 패턴:

- 위젯 추가 버튼은 카드 본문이 아니라 제목줄 `Actions`에 위치하는 것이 현재 컨벤션입니다.
- `widgets/index.ts`의 `WidgetMeta.Actions`로 제목줄 컴포넌트를 등록합니다.
- 제목줄 액션과 위젯 본문은 모듈 스코프 pub/sub 패턴으로 연결합니다.
- 모달 UI는 `src/components/QuickAddModal.tsx`를 재사용합니다.

## 현재 페이지 목록과 SC-08 진행 상태

`src/App.tsx`와 `src/components/PageShell.tsx` 기준 현재 페이지:

| page id | 이름 | 구현 상태 |
|---------|------|-----------|
| `dashboard` | 홈 | ✅ 구현됨 |
| `calendar` | 캘린더 | ✅ 구현됨 |
| `tasks` | 작업 관리 | ✅ 구현됨 |
| `todos` | 오늘 할 일 | ✅ 구현됨, 오늘/내일 Todo와 내일 브리핑 포함 |
| `habits` | 습관 | ✅ 구현됨 |
| `goals` | 목표 | ✅ 구현됨 |
| `projects` | 프로젝트 | ✅ 구현됨 |
| `career` | 기회 일정 | ✅ 구현됨 |
| `personalApplications` | 내 신청 | ✅ 구현됨 |
| `jobPostings` | 지원 공고 | ✅ 구현됨 |
| `weekly` | 주간 | ✅ 구현됨 |
| `daily` | 일일 | ✅ 구현됨 |
| `notes` | 노트 | ✅ 구현됨 |
| `journal` | 저널 | ✅ 구현됨 |
| `productivity` | 생산성 기록 | ✅ 구현됨 |
| `profile` | 프로필 | ✅ 구현됨 |
| `inquiries` | 문의 | ✅ 구현됨 |
| `print` | 플래너 출력 | ✅ 인쇄 미리보기 구현됨 |

**SC-08 다음 구현 순서**: 없음. 구현과 코드 QA 보강은 완료되었습니다.

**이름 혼동 주의**: `src/widgets/JournalWidget.tsx`는 n8n 웹훅으로 외부 RSS/피드를 받아 캐러셀로 보여주는 "저널 알림" 위젯이고, `src/pages/Journal.tsx`는 사용자가 직접 쓰는 저널/일기 페이지입니다.

## 위젯 상태

SC-07 위젯 검토는 완료입니다.

통과/구현:

- 현재 시각
- 빠른 메모
- 캘린더
- 오늘 할 일
- 일일 루틴
- 집중 타이머
- 카운터
- 생산성 추이
- 목표
- 메뉴
- 하루 마무리
- 예정된 작업
- 날씨
- 저널 알림
- 작업 흐름

통합/삭제:

- 최우선 목표는 목표 위젯에 통합
- 빠른 추가 위젯은 오늘 할 일 위젯과 중복되어 삭제

## AI 에이전트 자산

사용자가 요청해 `/Users/minsujeong/Desktop/ai_agent` 라이브러리에 플래너 작업용 에이전트 정의서를 추가/보강했습니다.

공통 스니펫:

- `library/snippets/planner-common-operating-principles.md`: 에이전트 공통 운영 원칙. 자율성, Firebase-only 현재 기준, 추후 백엔드/API 고려, SC-10 태블릿/모바일 기준을 포함합니다.

에이전트:

- `library/agents/planner-orchestrator.md`: 작업 조율, 에이전트 배정, 검수 게이트
- `library/agents/planner-document-keeper.md`: 요구사항/시나리오/진행/인수인계 문서 관리
- `library/agents/planner-data-firebase-architect.md`: Firebase/Firestore 저장 흐름, 타입 경계, 추후 백엔드/API 확장 가능성 검토
- `library/agents/planner-implementation-engineer.md`: React/TypeScript 기능 구현
- `library/agents/planner-review-qa.md`: 코드·화면·저장 흐름 검토
- `library/agents/planner-rule-guardian.md`: 규칙 준수와 안전 감시
- `library/agents/planner-ux-responsive-designer.md`: 화면 UX와 태블릿/모바일 반응형 검토
- `library/agents/planner-release-git-steward.md`: 커밋/push/배포 관리

워크플로우:

- `library/workflows/planner-scenario-one-by-one.md`: 문서 → 데이터/Firebase 확인 → 구현 → 검토 → 안전 → 릴리즈 순서로 한 기능씩 진행

각 에이전트 정의서 마지막에는 `플래너 작업 표시: ...` 한글 표시 문구가 있습니다.

## 최근 핵심 기능 상태

### 기회 일정과 캘린더

- 기회 일정 페이지: `src/pages/CareerEvents.tsx`
- 캘린더 위젯: `src/widgets/CalendarWidget.tsx`
- 타입: `CareerEvent`, `CareerMilestone`
- 구분: 채용설명회, 면접, 직무캠프, 교육/프로그램, 행사/세미나, 공모전, 지원사업, 기업 지원, 기타
- 상태: 관심, 신청 예정, 신청 완료, 결과 대기, 선정/확정, 완료, 탈락, 취소
- 장소와 주소는 `장소 / 주소` 한 항목으로 통합
- 관련 링크는 온라인/오프라인/혼합과 무관하게 항상 입력 가능
- 캘린더는 신청 마감, 선발 발표, 결과 발표, 본선/진행 단계, 운영, 대표 일정일을 단계 라벨로 구분 표시
- 기회 일정의 지난/예정 분리는 `milestones` 단계 목록의 마지막 관련일 기준이며, 기존 `date`, `applicationDeadline`, `resultDate`, `operationStartDate`, `operationEndDate`는 하위 호환용으로 동기화됩니다.
- 일일/주간 플래너도 같은 날짜 기준으로 기회 일정을 표시합니다.
- 기회 일정 페이지는 검색, 구분/상태 필터, 요약 카드, 임박 일정, D-day, 카드 내 상태 변경을 제공합니다.
- 캘린더 관리 페이지는 Todo, 예정 작업, 기회 일정, 내 신청/지원 공고 날짜, 작업 관리 마감, 목표/프로젝트 마감을 한 화면에서 필터링하고 선택일 agenda에서 확인/빠른 추가할 수 있습니다.

### 생산성 추이

- 계산 로직: `src/utils/productivity.ts`
- 위젯: `src/widgets/ChartWidget.tsx`
- 상세 페이지: `src/pages/ProductivityLog.tsx`
- Todo 40, 습관 30, 예정 작업 15, 집중 세션 15 기준
- 해당 날짜에 데이터가 없는 항목은 제외하고 남은 항목의 가중치로 재계산
- 목표는 생산성 점수에 직접 합산하지 않는 방향으로 정리
- 위젯 오른쪽 상단 버튼으로 날짜별 생산성 기록 상세 페이지에 이동
- 생산성 기록 페이지는 상단 요약, 최근 14일 추이 그래프, 선택일 점수 구성 그래프, 상세 기록 목록을 표시

### Todo

- 위젯: `src/widgets/TodoWidget.tsx`
- 페이지: `src/pages/TodoPage.tsx`
- 날짜별 기록 저장, 보정, 누락 항목 추가, 잘못된 항목 제거, 휴지통/복원/영구 삭제 구현
- 오늘 미완료 항목은 오늘 결과를 저장한 뒤 다음날 Todo로 넘길 수 있습니다.
- 과거 Todo 기록의 미완료 항목은 오늘 Todo로 다시 가져올 수 있습니다.
- 2026-07-04 보강: 이미 존재하는 날짜별 기록도 실제 Todo 상태와 다르면 자동 갱신하고, 이후 날짜나 오늘 Todo에 이미 반영된 과거 미완료 항목은 다시 가져오기 후보에서 제외합니다.

### 일일 루틴

- 위젯: `src/widgets/HabitWidget.tsx`
- 페이지: `src/pages/HabitTracker.tsx`
- 기본 루틴 최초 생성, 사용자 루틴 추가/수정/삭제, 반복 요일, 날짜별 기록, 최근 1년 활동 그래프 구현

### 빠른 메모

- 위젯: `src/widgets/MemoWidget.tsx`
- 페이지: `src/pages/Notes.tsx`
- 상태: `quickMemos`, `notes`
- Todo 또는 정식 노트로 전환 가능

### 저널 알림 위젯

- 파일: `src/widgets/JournalWidget.tsx`
- n8n 웹훅: `https://dbp-jack.app.n8n.cloud/webhook/journal-widget`
- title/link만 있는 RSS 형태 응답 처리
- 캐러셀 표시
- 이미지가 있으면 카드 전체를 채우고 아래 중복 텍스트 제거

## 태블릿/모바일 반응형 상태

완료된 이력:

- 모바일 대시보드는 데스크톱 그리드 대신 세로 카드형 위젯 구조로 렌더링
- 편집 화면에서 iPad/터치 환경에서도 위젯 추가 패널을 버튼으로 열고 닫도록 보완
- 각 하위 페이지 상단에 홈으로 바로 돌아가는 버튼 제공
- 모바일 상단 전체 메뉴에서 모든 페이지 접근 가능
- 모바일 하단 메뉴를 홈 고정+계정별 바로가기 네 개로 구성하고, 전체 메뉴 상단에서 선택·순서·초기화를 편집 가능
- 모바일 상단에서 라이트·다크·코랄·블루 테마를 직접 선택 가능
- 휴대폰·태블릿 100%, 웹 자동 90%와 웹 직접 설정 80~110%를 viewport 폭 기준으로 적용
- 프로젝트/주간/일일/저널/프로필/출력 페이지에 모바일·태블릿 브레이크포인트 적용
- 테마 4종의 텍스트 대비 재계산 및 코랄/블루 대비 보정

남은 확인:

- 코드·전체 자동 검사와 Firebase 후속 배포·새 운영 자산, 로그인 전 390/768/1024px viewport를 확인했습니다.
- 로그인 세션의 실제 하단 메뉴·편집·테마·밀도와 실기기 주소창·키보드 QA는 아직 남았습니다.

주의사항:

- 코드 기준 완료와 실기기 최종 최적화를 구분하세요. 실제 로그인 세션에서 모바일 390px, 태블릿 세로 768px, 태블릿 가로 1024px 화면을 확인하기 전에는 "실기기 최적화 완료"로 안내하지 않습니다.
- 모바일 하단 메뉴는 홈과 계정별 바로가기 네 개만 노출합니다. 전체 페이지 접근은 상단 전체 메뉴 또는 메뉴 위젯으로 확인해야 합니다.
- 캘린더, 습관 히트맵, 주간표, 출력 미리보기처럼 정보량이 많은 화면은 모바일에서 가로 스크롤 또는 축약 UI가 섞여 있으므로 텍스트 겹침, 버튼 잘림, 입력 폼 폭을 우선 확인합니다.
- 태블릿/모바일 위젯 드래그/리사이즈는 지원 여부가 미확정입니다. 결정 전까지 지원 기능으로 안내하지 않습니다.

## 다음 작업 제안 순서

1. 로그인 세션에서 모바일 390px, 태블릿 768/1024px의 하단 메뉴·편집·테마·밀도와 SC-16 온보딩을 육안 확인
2. SC-10 바로가기 저장·즉시 반영·포커스 복귀와 SC-16 완료·건너뛰기·저장 실패 재시도·계정 전환 확인
3. 실제 기기에서 주소창이 열린 첫 화면과 키보드가 열린 긴 폼 스크롤을 확인
4. 로그인 QA 결과를 자동 검사·운영 배포 기록과 구분해 문서에 추가한 뒤 사용자 확인
5. 사용자 지시가 있으면 커밋/푸시

## 작업 시 주의

- 사용자와 상의 없이 여러 기능을 한 번에 진행하지 마세요.
- 사용자가 "커밋푸쉬"라고 말하기 전에는 구현 후 확인을 먼저 받는 흐름이 좋습니다.
- `.env`, `.claude/`, `.firebase/`, `dist/`, `node_modules/`, `.DS_Store`는 커밋하지 마세요.
- Firebase API 키나 기상청 키 같은 값은 노출/커밋에 주의하세요.
- 현재 운영은 Firebase-only 기준입니다. 추후 백엔드/API 연동은 타입·서비스 경계를 유지하는 선에서 고려하고, 실제 도입은 별도 확인 후 진행하세요.
- React Grid Layout은 `1.4.4` 고정입니다. v2로 올리지 마세요.
- `onLayoutChange` 저장 방식은 쓰지 말고, 드래그/리사이즈 완료 시점 저장 흐름을 유지하세요.
- 한국 날짜 계산은 UTC 밀림을 피해야 합니다. `src/utils/date.ts`의 로컬 날짜 유틸을 우선 사용하세요.
- 신규 사용자 판별은 사용자 문서 `null` 여부로만 하고, 온보딩 필드가 없는 기존 문서를 신규 사용자로 해석하지 마세요.
- 프로필 안내 재열람은 기존 데이터와 대시보드 레이아웃을 바꾸지 않아야 합니다.
- 약관·개인정보 처리방침과 동의 수집은 SC-16 구현과 합치지 말고 별도 운영 문서 작업으로 유지하세요.
