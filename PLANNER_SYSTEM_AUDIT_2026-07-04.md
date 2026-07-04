# 플래너 설계/구현/데이터 감사

_작성일: 2026-07-04_
_기준 버전: v0.3.10 Goal Focus Reset_
_기준 커밋: `d339be2`_

이 문서는 현재 플래너가 어떻게 설계되어 있고, 실제 코드가 어떻게 만들어져 있으며, 어떤 데이터가 어디에 맞춰져 있는지 한 번에 확인하기 위한 감사 기록입니다.

## 감사 범위

- 문서: `AGENTS.md`, `NEXT_CHAT_HANDOFF.md`, `REQUIREMENTS.md`, `SCENARIOS.md`, `PROGRESS.md`, `RELEASES.md`, `COPYRIGHT_AND_SERVICE_NOTES.md`, `LINK_IMPORT_GUIDE.md`, `JOB_POSTING_LINK_READER.md`
- 코드: `src/App.tsx`, `src/components/PageShell.tsx`, `src/store/AppContext.tsx`, `src/types/index.ts`, `src/pages/*`, `src/widgets/*`, `src/services/*`, `src/utils/*`, `vite.config.js`, `firestore.rules`
- 체크 기록: `PROGRESS.md`의 SC-07 위젯 검토, SC-08 페이지 진행, 변경 이력, `RELEASES.md` 버전 이력

## 현재 결론

- 앱은 React/Vite/TypeScript + Firebase Auth/Firestore/Hosting 기반의 Firebase-only 프론트엔드 앱입니다.
- 별도 운영 백엔드는 없습니다. 다만 지원 공고 Reader는 로컬 Vite 미들웨어로만 동작하는 `/api/job-posting-page`, `/api/job-posting-image` 경계를 가지고 있어 운영 배포에서 동일 기능을 유지하려면 Firebase Functions 또는 별도 백엔드로 이관해야 합니다.
- 사용자 앱 데이터는 `users/{uid}` 단일 문서에 저장되고, 문의 데이터만 `inquiries` 컬렉션에 분리 저장됩니다.
- 페이지는 17개, 위젯은 15개가 실제 코드에 등록되어 있으며 문서의 SC-07/SC-08 체크와 대체로 일치합니다.
- `NEXT_CHAT_HANDOFF.md`, `PROGRESS.md`, `RELEASES.md`의 오래된 "다음 작업/현재 HEAD" 문구는 2026-07-04 기준으로 갱신했습니다.

## 아키텍처

| 영역 | 현재 구현 | 기준 파일 |
|---|---|---|
| 앱 진입 | Firebase Auth 상태 확인 후 로그인 페이지 또는 앱 본문 렌더링 | `src/App.tsx`, `src/store/AuthContext.tsx` |
| 라우팅 | URL 라우터 없이 `RouterContext`의 page 상태로 전환 | `src/store/RouterContext.tsx`, `src/App.tsx` |
| 공통 레이아웃 | 상단 복귀 헤더, 데스크톱/태블릿 사이드바, 모바일 하단 탭, 전체 메뉴, 테마, 링크 정리 모달 | `src/components/PageShell.tsx` |
| 전역 데이터 | `AppContext`가 사용자 데이터 전체를 보유하고 1초 debounce 저장 | `src/store/AppContext.tsx` |
| Firebase 저장 | 사용자 문서는 `setDoc(..., { merge: true })`; 문의는 별도 컬렉션 | `src/services/userService.ts`, `src/services/inquiryService.ts` |
| 빌드/배포 | Vite build 후 Firebase Hosting `dist` 배포 | `vite.config.js`, `firebase.json` |
| 로컬 API | 지원 공고 Reader와 이미지 프록시를 Vite 개발 서버 미들웨어로 제공 | `vite.config.js`, `src/services/jobPostingPageReader.ts` |

## 데이터 저장 설계

| 데이터 | 저장 위치 | 주요 생산/소비 화면 | 비고 |
|---|---|---|---|
| `todos` | `users/{uid}` | 오늘 할 일, 일일, 주간, 캘린더, Todo 위젯, 생산성 추이 | 날짜 없는 레거시 Todo는 오늘 기준으로 표시 |
| `todoHistory`, `todoHistoryTrash`, `todoHistoryDeletedDates` | `users/{uid}` | 오늘 할 일 | 자동/수동 일일 결과, 보정, 휴지통 |
| `habits`, `habitHistory`, `habitSavedAt` | `users/{uid}` | 습관, 일일, 저널, 루틴 위젯, 생산성 추이 | 반복 요일과 날짜별 기록 |
| `tasks` | `users/{uid}` | 작업 관리, 캘린더, 일일, 주간, 작업 흐름 위젯 | 개별 실행 작업 |
| `goals`, `topGoals` | `users/{uid}` | 목표, 캘린더, 일일, 주간, 목표 위젯, 작업 흐름 위젯 | `topGoals.date`로 오늘 방향을 날짜별 분리 |
| `projects` | `users/{uid}` | 프로젝트, 캘린더, 일일, 주간, 작업 흐름 위젯 | 하위 단계 기반 진행률 |
| `scheduledTasks` | `users/{uid}` | 캘린더, 일일, 주간, 예정된 작업 위젯 | 날짜/시간/장소/진행 방식 |
| `careerEvents` | `users/{uid}` | 기회 일정, 캘린더, 일일, 주간, 링크 정리 | 외부 기회/행사/프로그램 일정 |
| `personalApplications` | `users/{uid}` | 내 신청, 캘린더 | 저축/통장/멘토링 등 신청 상태 추적 |
| `jobPostings` | `users/{uid}` | 지원 공고, 캘린더 | 채용 공고 링크, OCR, 키워드, 지원 상태 |
| `quickMemos`, `notes` | `users/{uid}` | 빠른 메모 위젯, 노트, 링크 정리 | 빠른 메모 전환 이력과 정식 노트 분리 |
| `reviewHistory`, `journal` | `users/{uid}` | 하루 마무리, 저널, 생산성 추이 | 날짜별 회고/저널 |
| `counters`, `chartHistory` | `users/{uid}` | 카운터, 집중 타이머, 생산성 추이 | 집중 타이머는 자동 카운터를 갱신 |
| `dashboardLayout`, `dashboardActive`, `uiScale` | `users/{uid}` | 대시보드, 대시보드 편집, 프로필 | 레이아웃은 저장 버튼과 `saveWithOverrides`로 즉시 저장 |
| `nickname` | `users/{uid}` | 프로필 | 사용자 표시용 |
| `inquiries` | `inquiries/{id}` | 문의 | Firestore rules로 본인/관리자 접근 제한 |

## 저장/마이그레이션 기준

- 일반 상태 변경은 `AppContext`에서 1초 debounce로 저장합니다.
- 로그아웃 전 `saveNow()`로 최대 3초 안에 저장을 시도합니다.
- 대시보드 레이아웃과 화면 비율은 `saveWithOverrides()`로 즉시 저장합니다.
- 계정 전환 시 이전 계정 pending save가 새 계정으로 섞이지 않도록 UID와 사용자 메타데이터를 캡처합니다.
- `quickMemo`, `review`, 날짜 없는 `topGoals`, 오래된 habit/project/career/job 데이터는 로드 시 안전한 기본값으로 보정합니다.
- 한국 날짜 계산은 `src/utils/date.ts`의 `toLocalDateKey()`와 `T12:00:00` 기준을 우선 사용합니다.

## 페이지 설계

| page id | 화면 | 파일 | 주요 데이터 | 현재 상태 |
|---|---|---|---|---|
| `dashboard` | 홈 | `src/pages/Dashboard.tsx` | 위젯 레이아웃, 화면 비율 | 구현됨 |
| `calendar` | 캘린더 | `src/pages/CalendarPage.tsx` | Todo, 예정, 기회, 내 신청, 지원 공고, 작업/목표/프로젝트 | 구현됨 |
| `tasks` | 작업 관리 | `src/pages/TaskTracker.tsx` | `tasks` | 구현됨 |
| `todos` | 오늘 할 일 | `src/pages/TodoPage.tsx` | `todos`, Todo 기록/휴지통 | 구현됨 |
| `habits` | 습관 | `src/pages/HabitTracker.tsx` | `habits`, `habitHistory` | 구현됨 |
| `goals` | 목표 | `src/pages/Goals.tsx` | `topGoals`, `goals` | 구현됨. 오늘 방향/장기 목표 분리 |
| `projects` | 프로젝트 | `src/pages/Projects.tsx` | `projects` | 구현됨 |
| `career` | 기회 일정 | `src/pages/CareerEvents.tsx` | `careerEvents`, 링크 정리 | 구현됨 |
| `personalApplications` | 내 신청 | `src/pages/PersonalApplications.tsx` | `personalApplications` | 구현됨 |
| `jobPostings` | 지원 공고 | `src/pages/JobPostings.tsx` | `jobPostings`, Reader/OCR | 구현됨 |
| `weekly` | 주간 | `src/pages/WeeklyPlanner.tsx` | 주간 Todo/예정/기회/마감 | 구현됨 |
| `daily` | 일일 | `src/pages/DailyPlanner.tsx` | 일일 Todo/예정/루틴/시간 블록/마감 | 구현됨 |
| `notes` | 노트 | `src/pages/Notes.tsx` | `notes`, `quickMemos` | 구현됨 |
| `journal` | 저널 | `src/pages/Journal.tsx` | `journal`, 당일 Todo/루틴 요약 | 구현됨 |
| `profile` | 프로필 | `src/pages/ProfilePage.tsx` | 프로필, 데이터 수, 버전 | 구현됨 |
| `inquiries` | 문의 | `src/pages/Inquiries.tsx` | `inquiries` 컬렉션 | 구현됨 |
| `print` | 플래너 출력 | `src/pages/PrintPlanner.tsx` | 일일/주간/빈 양식 출력 데이터 | 구현됨 |

## 위젯 설계

| 위젯 id | 위젯 | 파일 | 주요 데이터 | 현재 상태 |
|---|---|---|---|---|
| `clock` | 현재 시각 | `src/widgets/ClockWidget.tsx` | localStorage 모드 | 구현됨 |
| `memo` | 빠른 메모 | `src/widgets/MemoWidget.tsx` | `quickMemos`, `todos`, `notes` | 구현됨 |
| `calendar` | 캘린더 | `src/widgets/CalendarWidget.tsx` | 날짜 기반 통합 데이터 | 구현됨 |
| `todo` | 오늘 할 일 | `src/widgets/TodoWidget.tsx` | `todos` | 구현됨 |
| `habit` | 일일 루틴 | `src/widgets/HabitWidget.tsx` | `habits`, `habitHistory`, `habitSavedAt` | 구현됨 |
| `pomodoro` | 집중 타이머 | `src/widgets/PomodoroWidget.tsx` | `counters` 자동 갱신 | 구현됨 |
| `counter` | 카운터 | `src/widgets/CounterWidget.tsx` | `counters` | 구현됨 |
| `chart` | 생산성 추이 | `src/widgets/ChartWidget.tsx` | Todo/루틴/예정/집중 | 구현됨 |
| `goal` | 목표 | `src/widgets/GoalWidget.tsx` | 날짜별 오늘 방향, 장기 목표 | 구현됨 |
| `workOverview` | 작업 흐름 | `src/widgets/WorkOverviewWidget.tsx` | 작업/프로젝트/목표 | 구현됨 |
| `menu` | 메뉴 | `src/widgets/MenuWidget.tsx` | 라우팅 | 구현됨 |
| `review` | 하루 마무리 | `src/widgets/ReviewWidget.tsx` | `reviewHistory` | 구현됨 |
| `scheduled` | 예정된 작업 | `src/widgets/ScheduledTaskWidget.tsx` | `scheduledTasks` | 구현됨 |
| `weather` | 날씨 | `src/widgets/WeatherWidget.tsx` | weather API/localStorage 위치 | 구현됨 |
| `journalFeed` | 저널 알림 | `src/widgets/JournalWidget.tsx` | 외부 n8n/RSS 형태 피드 | 구현됨. 사용자 저널 페이지와 별개 |

## 링크/AI 준비 설계

- 전역 링크 정리는 `LinkOrganizerModal`에서 URL, 메모, 이미지 포스터/OCR을 받아 기회 일정, 캘린더 예정, 작업, 노트로 저장합니다.
- 지원 공고 페이지는 `jobPostingDraft.ts` 규칙 기반 파서와 `jobPostingPageReader.ts` 서비스 경계로 회사명, 포지션, 마감, 기술스택, 지역, 고용형태, 메모를 보정합니다.
- 로컬 개발 환경의 Reader API는 `vite.config.js`에 있고, 운영 Hosting에서는 동작하지 않습니다.
- 지원 공고 자동 분석은 현재 "무료 1차 기반"이며, 안정적인 운영 기능이나 유료 기능으로 가려면 백엔드/API, 사용량 제한, 개인정보/원본 링크 처리 정책이 필요합니다.

## 디자인/반응형 상태

- 테마는 `light`, `dark`, `coral`, `blue` 4종입니다.
- 모바일 대시보드는 데스크톱 grid가 아니라 세로 카드형으로 렌더링합니다.
- 모바일 하단 탭은 대표 6개만 표시하고, 전체 페이지는 상단 전체 메뉴 또는 메뉴 위젯으로 접근합니다.
- 데스크톱/태블릿은 접힘 레일/펼침 사이드바를 사용합니다.
- 실제 기기 QA는 문서상 "코드 기준 완료, 실기기 최종 확인 필요"입니다.
- 디자인 시스템은 아직 공통 컴포넌트보다 페이지별 인라인 스타일이 많고, 대시보드 카드 반경은 16~20px로 현재 디자인 지침의 8px 기준과 다릅니다. 다음 UI 정리 대상입니다.

## 완료 체크 현황

- SC-01~SC-11은 완료로 기록되어 있고 코드 기준 기능도 존재합니다.
- SC-12는 "기반 구현"입니다. 링크 정리/지원 공고 파서의 1차 기능은 있으나 운영 백엔드/유료 권한/AI 정밀 추출은 아직 아닙니다.
- SC-07 위젯 15개와 SC-08 페이지 17개는 실제 등록 상태와 문서가 대체로 일치합니다.
- v0.3.10 기준 목표 위젯의 오늘 방향 날짜 분리는 코드와 문서에 반영되어 있습니다.

## 발견한 보완점

| 우선순위 | 항목 | 이유 | 제안 |
|---|---|---|---|
| 완료 | `NEXT_CHAT_HANDOFF.md`의 현재 HEAD/로컬 상태 문구 오래됨 | 최근 커밋 `d339be2`와 맞지 않았음 | 2026-07-04 감사 기준으로 갱신 완료 |
| P0 | 운영 배포에서 지원 공고 Reader API 부재 | Vite 미들웨어는 Hosting에서 동작하지 않음 | v0.4.0에서 Firebase Functions 이관 |
| 완료 | Reader URL 조합부 재확인 필요 | `vite.config.js`의 `toReaderUrl()`이 `r.jina.ai` 경로를 중복 조합하는 형태였음 | 2026-07-04 KDB 인크루트 샘플로 재검증 후 Reader URL과 인크루트 `http` 대상 재시도 수정 |
| P1 | 실제 기기 반응형 QA 미완료 | 문서상 코드 기준 완료, 실기기 확인 필요 | 모바일 390px, 태블릿 768/1024px 체크리스트화 |
| P1 | 디자인 시스템 불균일 | 인라인 스타일, 카드 반경/폼 밀도/패널 패턴이 페이지별로 다름 | v0.3.12 UI System Pass 진행 |
| P1 | 자동 점검 스크립트 부족 | page id/위젯 등록/문서 체크가 수동 중심 | 스크립트로 문서-코드 일치 확인 추가 |
| P2 | 데이터 내보내기/삭제 정책 없음 | 유료 AI/개인정보 기능 전 필수 | 프로필에 export/delete 설계 추가 |
| P2 | 약관/개인정보/라이선스 초안 없음 | 서비스 운영과 유료화 전 필요 | `LICENSE.md`, `TERMS.md`, `PRIVACY.md`, `THIRD_PARTY_NOTICES.md` 작성 |
| P2 | 지원 공고 이미지 후보 선택 UI 없음 | 첫 이미지가 실제 공고가 아닐 수 있음 | 후보 미리보기/선택형 OCR 추가 |
| P3 | 대시보드 모바일 편집 지원 여부 미정 | SC-10 미확정 항목 | 지원/미지원 정책 확정 |

## 다음 감사 루프 기준

1. 문서와 코드의 page id, 위젯 id, 버전이 일치하는지 확인합니다.
2. `UserData` 필드가 실제 페이지/위젯에서 어디에 쓰이는지 다시 매핑합니다.
3. 로컬 기능과 배포 기능이 다른 부분을 별도 표시합니다.
4. 실제 로그인 세션에서 주요 화면을 확인한 뒤 문서의 완료 표현을 "실기기 확인 완료"로 바꿀지 판단합니다.
5. 기능 추가 전에는 `UPDATE_SCHEDULE.md`의 다음 버전 후보와 맞는지 확인합니다.
