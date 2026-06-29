# 다음 채팅 인수인계

_작성일: 2026-06-28_
_갱신일: 2026-06-30 (HEAD `6c4e51f` 기준, 플래너 완성 작업 미커밋 변경 포함)_

이 파일은 새 Codex 또는 Claude Code 세션에서 바로 이어 작업하기 위한 현재 상태 메모입니다.
새 세션에서는 먼저 이 파일과 `AGENTS.md`, `PROGRESS.md`, `REQUIREMENTS.md`, `SCENARIOS.md`를 읽고 시작하면 됩니다.

## 한 줄 요약

플래너는 Firebase 기반 React/Vite/TypeScript 앱이며, SC-07 위젯 검토와 SC-08 사이드바 기능 페이지, SC-09 테마 정리, SC-10 태블릿/모바일 반응형 코드 QA까지 완료했습니다. 2026-06-29에는 `projects`, `weekly`, `daily`, `journal`, `profile`, `print`, `calendar` 페이지를 구현/보강했고, 2026-06-30에는 오늘 할 일의 미완료 Todo 이월 기능을 추가했습니다. 아직 커밋/푸시는 하지 않았습니다.

## 작업 위치와 원격

- 로컬 경로: `/Users/minsujeong/planner`
- GitHub remote: `https://github.com/planner-one/-my-planner.git`
- 브랜치: `main`
- 배포: Firebase Hosting
- 배포 URL: `https://my-planner-487bd.web.app`
- GitHub Pages는 사용하지 않습니다.
- 현재 HEAD: `6c4e51f docs: 인수인계 문서 최신 커밋·SC-08 진행 상태로 갱신`

## 현재 미커밋 변경

사용자 요청으로 플래너 완성 작업과 문서 최신화를 진행했습니다. 아직 커밋/푸시는 하지 않았습니다.

- `Formulae`, `Searching` 삭제: 0바이트 빈 추적 파일
- `src/components/UI.tsx` 삭제: 현재 앱 진입점에서 참조되지 않는 미사용 공용 UI 파일
- `react-router-dom` 제거: 현재 라우팅은 `RouterContext` 기반이며 코드에서 미사용
- `.env.example` 수정: 실제 코드가 쓰는 `VITE_WEATHER_API_KEY`, `VITE_HOLIDAY_API_KEY` 반영
- `src/widgets/MenuWidget.tsx` 수정: `홈(dashboard)`, `캘린더(calendar)`, `신청 관리(career)` 포함 전체 page id 바로가기 연결
- `src/pages/CalendarPage.tsx` 추가 및 `src/App.tsx`, `src/store/RouterContext.tsx`, `src/components/PageShell.tsx` 수정: 캘린더 관리 페이지와 사이드바/모바일 하단 탭/메뉴 위젯 연결
- `src/store/AppContext.tsx` 수정: 사용자 전환 시 전체 상태 초기화, 저장 타이머 UID·계정 메타데이터 고정, 계정 전환 localStorage 정리 보강, 레거시 `careerEvents`/`projects` 보정
- `src/components/PageShell.tsx` 수정: 모바일 전체 페이지 메뉴 추가, 사이드바 FAB 모바일 숨김, 테마 swatch 보정
- `src/index.css` 수정: 코랄/블루 테마 보조/강조 텍스트 대비 보정
- `src/pages/Projects.tsx`, `src/types/index.ts`, `src/utils/projects.ts` 수정/추가: 프로젝트 페이지 구현, 하위 작업 기반 진행률, 마감 정렬, 삭제 확인 흐름 추가
- `src/pages/WeeklyPlanner.tsx` 수정: 주간 핵심 작업, 요일별 Todo/예정 일정/신청 일정/마감 흐름 연결, 날짜 없는 Todo 규칙 문구 보정
- `src/pages/DailyPlanner.tsx` 수정: Todo, 예정 일정, 신청 일정, 루틴, 시간 블록 연결, 삭제 확인 추가
- `src/pages/TodoPage.tsx` 수정: 오늘 미완료 Todo를 내일로 넘기고, 과거 기록의 미완료 Todo를 오늘로 가져오는 기능 추가
- `src/pages/Journal.tsx` 수정: 사용자 작성 저널 구현, Todo/루틴/생산성 요약 연결, 날짜별 에너지 입력과 오늘 저널 삭제 시 전역 에너지 초기화 보정
- `src/pages/ProfilePage.tsx` 수정: 계정 정보, 닉네임, 화면 밀도, 데이터 현황 구현
- `src/pages/PrintPlanner.tsx` 수정: 일일/주간/빈 양식 인쇄 미리보기 구현
- `src/widgets/CalendarWidget.tsx` 수정: 기업 지원 분류 선택/표시 보강, 삭제 확인 추가, 날짜 없는 Todo·작업 관리 마감·목표/프로젝트 마감 표시, 신청 상태 편집 옵션 정합성, 캘린더 관리 페이지 이동 액션, 자간 정리
- `src/widgets/ScheduledTaskWidget.tsx` 수정: 체크박스 중복 토글 방지와 로컬 날짜 표시 보정
- `src/pages/Dashboard.tsx`, `src/pages/DashboardEditor.tsx`, `src/pages/TodoPage.tsx`, `src/widgets/ClockWidget.tsx` 수정: 자간 제거, 모바일 전환 폭/빈 상태/레이아웃 클램프 보강
- `src/utils/careerEvents.ts` 추가: 신청/지원 일정 날짜·상태·구분 공통 유틸
- `src/utils/calendar.ts` 추가: 캘린더 위젯과 캘린더 관리 페이지가 공유하는 날짜 기반 항목 집계 유틸
- `AGENTS.md`, `CLAUDE.md`, `REQUIREMENTS.md`, `SCENARIOS.md`, `PROGRESS.md`, `NEXT_CHAT_HANDOFF.md` 최신화
- `/Users/minsujeong/Desktop/ai_agent`에 플래너 작업용 에이전트 정의서, 공통 운영 원칙 스니펫, 워크플로우 추가/보강

## 최근 커밋 흐름

```text
6c4e51f docs: 인수인계 문서 최신 커밋·SC-08 진행 상태로 갱신
23cc5b1 chore: 로컬 Claude 설정 파일 추적 해제
25f07e1 docs: 다음 채팅 인수인계 문서 추가
b39cf0e fix: 잘못 추가한 GitHub Pages 배포 설정 되돌림
d2cb767 ci: GitHub Pages 자동 배포 워크플로우 추가
12fe2f8 feat: 저널 위젯 제목 숨기고 이미지가 카드 전체를 채우도록 변경
33d8060 fix: 이미지가 있으면 아래 중복 텍스트 제거, 이미지가 카드 전체 채움
a3751a3 feat: 저널 위젯 타이틀 라벨 제거, 슬라이드 버튼을 이미지 위에 오버레이
35fb3b2 feat: 저널 위젯 상태 텍스트 제거, 새로고침을 제목줄로 이동, 이미지 표시 지원 추가
92a9b12 feat: 저널 위젯 웹훅 URL 고정, 설정 UI 제거
f1d5cbe feat: 저널 위젯을 캐러셀(슬라이드) 형태로 변경
1c7e4f3 fix: 저널 위젯이 title/link만 있는 RSS 형태 응답도 정상 표시하도록 수정
3ac118b feat: 저널 알림 위젯 추가 (n8n 웹훅 연동)
d086500 fix: 이번주/다음주 토글을 위치 헤더 줄로 통합
57f19e0 feat: 날씨 이번주/다음주 토글을 카드 제목줄로 이동
ccce664 feat: 위젯 추가 버튼 제목줄 통합, 날씨 과거/다음주 표시, 목표 위젯 표시 버그 수정
4c1a9e1 feat: 목표·예정된 작업·일일 루틴 위젯 추가를 모달 방식으로 변경
f131922 feat: 목표·예정된 작업·일일 루틴 위젯에 빠른 추가 입력 추가
bf9dce7 feat: 작업 관리(TaskTracker) 페이지 구현
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

주의:

- dev 서버 포트 `5173`이 사용 중이면 Vite가 다른 포트를 쓸 수 있습니다.
- 현재 5173, 5174, 5175, 5180이 이미 사용 중이라 이번 세션에서는 5181 포트로 실행했습니다.
- 인앱 브라우저 attach가 타임아웃되어 로그인 후 실제 화면 육안 QA는 사용자 세션에서 확인 권장입니다.
- 배포 후 사용자가 실제 Firebase Hosting URL에서 확인하는 흐름이 자주 있었습니다.

## 현재 앱 구조

주요 진입:

- `src/App.tsx`: 로그인 여부, 데이터 로딩, 현재 페이지 렌더링
- `src/components/PageShell.tsx`: 사이드바, 모바일 하단 탭, 테마, 로그아웃, 홈 복귀 버튼
- `src/store/AppContext.tsx`: Firestore 사용자 데이터 전체 상태와 저장 로직
- `src/store/RouterContext.tsx`: URL 라우터 대신 page 상태로 화면 전환
- `src/types/index.ts`: 앱 데이터 타입
- `src/widgets/index.ts`: 위젯 등록 목록

데이터 저장:

- 로그인 사용자 데이터는 `AppContext`에서 관리합니다.
- 일반 상태 변경은 1초 debounce 저장입니다.
- 레이아웃 저장, 로그아웃 전 저장 등은 즉시 저장 함수가 있습니다.
- 사용자별 화면 비율 `uiScale`은 Firestore에 저장됩니다.
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
| `todos` | 오늘 할 일 | ✅ 구현됨 |
| `habits` | 습관 | ✅ 구현됨 |
| `goals` | 목표 | ✅ 구현됨 |
| `projects` | 프로젝트 | ✅ 구현됨 |
| `career` | 신청 관리 | ✅ 구현됨 |
| `weekly` | 주간 | ✅ 구현됨 |
| `daily` | 일일 | ✅ 구현됨 |
| `notes` | 노트 | ✅ 구현됨 |
| `journal` | 저널 | ✅ 구현됨 |
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

### 신청 관리와 캘린더

- 신청 관리 페이지: `src/pages/CareerEvents.tsx`
- 캘린더 위젯: `src/widgets/CalendarWidget.tsx`
- 타입: `CareerEvent`
- 구분: 채용설명회, 면접, 직무캠프, 교육/프로그램, 행사/세미나, 공모전, 지원사업, 기업 지원, 기타
- 상태: 관심, 신청 예정, 신청 완료, 결과 대기, 선정/확정, 완료, 탈락, 취소
- 장소와 주소는 `장소 / 주소` 한 항목으로 통합
- 관련 링크는 온라인/오프라인/혼합과 무관하게 항상 입력 가능
- 캘린더는 신청 마감, 결과 발표, 운영, 대표 일정일을 구분 표시
- 신청관리의 지난/예정 분리는 대표 일정일, 신청 마감, 결과 발표, 운영 시작/종료일 중 마지막 관련일 기준입니다.
- 일일/주간 플래너도 같은 날짜 기준으로 신청/지원 일정을 표시합니다.
- 신청관리 페이지는 검색, 구분/상태 필터, 요약 카드, 임박 일정, D-day, 카드 내 상태 변경을 제공합니다.
- 캘린더 관리 페이지는 Todo, 예정 작업, 신청 일정, 작업 관리 마감, 목표/프로젝트 마감을 한 화면에서 필터링하고 선택일 agenda에서 확인/빠른 추가할 수 있습니다.

### 생산성 추이

- 계산 로직: `src/utils/productivity.ts`
- 위젯: `src/widgets/ChartWidget.tsx`
- Todo 40, 습관 30, 예정 작업 15, 집중 세션 15 기준
- 해당 날짜에 데이터가 없는 항목은 제외하고 남은 항목의 가중치로 재계산
- 목표는 생산성 점수에 직접 합산하지 않는 방향으로 정리

### Todo

- 위젯: `src/widgets/TodoWidget.tsx`
- 페이지: `src/pages/TodoPage.tsx`
- 날짜별 기록 저장, 보정, 누락 항목 추가, 잘못된 항목 제거, 휴지통/복원/영구 삭제 구현
- 오늘 미완료 항목은 오늘 결과를 저장한 뒤 다음날 Todo로 넘길 수 있습니다.
- 과거 Todo 기록의 미완료 항목은 오늘 Todo로 다시 가져올 수 있습니다.

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
- 프로젝트/주간/일일/저널/프로필/출력 페이지에 모바일·태블릿 브레이크포인트 적용
- 테마 4종의 텍스트 대비 재계산 및 코랄/블루 대비 보정

남은 확인:

- 코드/빌드/서버 기준 SC-10 검토는 완료했습니다.
- 인앱 브라우저 attach 제한으로 실제 로그인 세션 육안 QA는 사용자 로컬 브라우저에서 최종 확인 권장입니다.

## 다음 작업 제안 순서

1. 현재 미커밋 변경에 대해 사용자 확인
2. 사용자 로컬 로그인 세션에서 주요 화면 육안 확인
3. 사용자 지시가 있으면 커밋/푸시
4. 필요 시 Firebase Hosting 배포

## 작업 시 주의

- 사용자와 상의 없이 여러 기능을 한 번에 진행하지 마세요.
- 사용자가 "커밋푸쉬"라고 말하기 전에는 구현 후 확인을 먼저 받는 흐름이 좋습니다.
- `.env`, `.claude/`, `.firebase/`, `dist/`, `node_modules/`, `.DS_Store`는 커밋하지 마세요.
- Firebase API 키나 기상청 키 같은 값은 노출/커밋에 주의하세요.
- 현재 운영은 Firebase-only 기준입니다. 추후 백엔드/API 연동은 타입·서비스 경계를 유지하는 선에서 고려하고, 실제 도입은 별도 확인 후 진행하세요.
- React Grid Layout은 `1.4.4` 고정입니다. v2로 올리지 마세요.
- `onLayoutChange` 저장 방식은 쓰지 말고, 드래그/리사이즈 완료 시점 저장 흐름을 유지하세요.
- 한국 날짜 계산은 UTC 밀림을 피해야 합니다. `src/utils/date.ts`의 로컬 날짜 유틸을 우선 사용하세요.
