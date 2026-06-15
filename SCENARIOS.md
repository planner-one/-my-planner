# 시나리오 (Scenarios)

_마지막 업데이트: 2026-05-20_

---

## 시나리오 목록

| ID | 이름 | 연관 요구사항 | 우선순위 |
|----|------|--------------|---------|
| SC-01 | 프로젝트 초기 셋업 | R-001~006 | P0 |
| SC-02 | Google 로그인 / 로그아웃 | R-010~014 | P0 |
| SC-03 | AppContext + Firestore 동기화 | R-030~033 | P0 |
| SC-04 | 앱 라우팅 + 네비게이션 | — | P0 |
| SC-05 | 대시보드 뷰 모드 | R-020~021 | P1 |
| SC-06 | 대시보드 편집 모드 | R-021~027 | P1 |
| SC-07 | 위젯 14종 구현 | R-W01~W14 | P1 |
| SC-08 | 페이지 9개 구현 | R-P01~P09 | P2 |
| SC-09 | 다크/라이트 테마 | R-040 | P2 |
| SC-10 | 모바일 반응형 | R-041 | P3 |

---

### SC-01: 프로젝트 초기 셋업
- **목적**: Vite + React + Firebase 연결, 폴더 구조 생성
- **주요 흐름**:
  1. `npm create vite` (react-ts 또는 react)
  2. 패키지 버전 고정 설치
  3. `src/` 폴더 구조 생성
  4. `config/firebase.js` 환경변수 연결
  5. Firebase Hosting 초기화
- **완료 기준**: `npm run dev` 정상 실행, Firebase 콘솔 연결 확인

---

### SC-02: Google 로그인 / 로그아웃
- **목적**: Firebase Auth를 통한 Google 소셜 로그인
- **전제 조건**: SC-01 완료
- **주요 흐름**:
  1. `authService.js` — signInWithPopup, signOut
  2. `AuthContext.jsx` — onAuthStateChanged 구독
  3. `LoginPage.jsx` — Google 로그인 버튼
  4. App에서 user 상태에 따라 LoginPage vs 앱 본체 분기
- **예외 흐름**: 팝업 차단 → 에러 메시지 표시
- **완료 기준**: 로그인 후 대시보드 진입, 새로고침 후 세션 유지

---

### SC-03: AppContext + Firestore 동기화
- **목적**: 전역 상태 + 3가지 저장 전략 구현
- **전제 조건**: SC-02 완료
- **주요 흐름**:
  1. `userService.js` — loadUserData / saveUserData
  2. AppContext 전역 state 선언 (Firestore 필드 전체)
  3. currentDataRef 패턴 구현
  4. 1초 debounce 저장 effect
  5. saveWithOverrides (즉시 저장)
  6. saveNow (로그아웃 전 즉시 저장 + 3초 타임아웃)
  7. 계정 전환 시 localStorage 초기화
- **완료 기준**: 새로고침 후 데이터 복원 확인

---

### SC-04: 앱 라우팅 + 네비게이션
- **목적**: 페이지 간 이동, 하단/사이드 내비게이션
- **전제 조건**: SC-03 완료
- **주요 흐름**:
  1. React Router (또는 커스텀 라우팅) 설정
  2. 헤더 (테마 토글, 프로필, 로그아웃)
  3. 하단 내비게이션 바 (모바일) / 사이드바 (데스크톱)
  4. `PageShell.jsx` 공통 레이아웃
- **완료 기준**: 각 페이지 이동 정상 동작

---

### SC-05 / SC-06: 대시보드 뷰 + 편집 모드
- **목적**: 위젯 그리드 표시 및 편집
- **전제 조건**: SC-04 완료
- **주요 흐름** (편집):
  1. DashboardEditor 진입
  2. react-grid-layout 1.4.4 렌더
  3. 드래그/리사이즈 → onDragStop/onResizeStop 상태 업데이트
  4. 사이드바에서 위젯 추가
  5. 위젯 삭제 (✕ 버튼)
  6. 저장 버튼 → saveWithOverrides 즉시 저장
- **완료 기준**: 드래그·리사이즈·저장 후 새로고침해도 레이아웃 유지

---

### SC-07: 위젯 14종 구현
- **목적**: 각 위젯 컴포넌트 구현
- **전제 조건**: SC-05/06 완료
- **구현 순서** (의존성 낮은 것 → 높은 것):
  1. ClockWidget (독립)
  2. MemoWidget (독립)
  3. CounterWidget (독립)
  4. PomodoroWidget (독립)
  5. TodoWidget (todos 상태)
  6. HabitWidget (habits 상태)
  7. GoalWidget / TopGoalWidget (goals 상태)
  8. QuickAddWidget (todos 상태)
  9. ScheduledTaskWidget (scheduledTasks 상태)
  10. ReviewWidget (review 상태)
  11. MenuWidget (라우팅)
  12. ChartWidget (chartHistory)
  13. WeatherWidget (외부 API)
- **완료 기준**: 각 위젯이 AppContext 데이터와 연동, 리사이즈 반응형
- **Todo 연동 기준**:
  - TodoWidget과 TodoPage는 동일한 `todos` 상태 사용
  - 지난 날짜 결과는 자동 저장
  - 오늘 결과는 TodoPage에서 수동 저장 및 갱신 가능
  - 날짜별 결과와 당시 항목 목록은 Firestore에 보존

---

### SC-08: 페이지 9개 구현
- **목적**: 각 기능 페이지 구현
- **전제 조건**: SC-07 완료 (상태 모델 확정 후)
- **구현 순서**:
  1. HabitTracker (히트맵)
  2. TaskTracker (테이블)
  3. Goals (단계 체크리스트)
  4. Projects (카드)
  5. WeeklyPlanner (요일 카드)
  6. DailyPlanner (시간 블록)
  7. Notes (마크다운 노트)
  8. Journal (일기)
  9. ProfilePage (통계)

---

### SC-09: 테마
- **목적**: 다크/라이트 CSS 변수 테마 전환
- **주요 흐름**: `[data-theme="dark"]` 토글, localStorage 저장

---

### SC-10: 모바일 반응형
- **목적**: 모바일에서 대시보드 및 페이지 사용 가능
- **미확정**: 모바일에서 위젯 드래그 지원 여부 (R-Q04)
