# 모바일 안정화·글쓰기 1차 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 일일 루틴 떨림을 근본 수정하고 독립 로그아웃 및 공통 글쓰기 편의 기준을 Firebase 운영 앱에 반영한다.

**Architecture:** `useWidgetSize`가 자기 padding에 영향받는 content-box 대신 border-box를 측정하게 해 반응형 피드백 루프를 제거한다. `PageShell`은 모바일 전체 메뉴 아래에 계정 액션을 제공하고, `index.css`는 767px 이하 공통 입력·여백·안전 영역만 보정한다.

**Tech Stack:** React 18.3, TypeScript 6, Vite 5, Firebase Auth/Firestore/Hosting

## Global Constraints

- React Grid Layout은 `1.4.4`를 유지하고 의존성을 추가하지 않는다.
- Firestore 데이터 구조와 `saveNow → signOut` 순서를 유지한다.
- 모바일 기준 폭은 767px 이하, 확인 폭은 390px이다.
- 입력 컨트롤은 16px 글자와 44px 최소 높이를 사용하고 체크박스·라디오·색상·범위 입력은 제외한다.
- 커밋과 push는 사용자가 별도로 요청하기 전 수행하지 않는다.
- 배포는 Firebase Hosting만 사용한다.

---

### Task 1: 모바일 회귀 검사 RED

**Files:**
- Create: `scripts/check-mobile-ux.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: 현재 `useWidgetSize`, `PageShell`, `index.css` 소스 계약
- Produces: `npm run check:mobile-ux`

- [ ] **Step 1: 실패 회귀 검사 작성**

  `check-mobile-ux.mjs`에서 Node `assert`와 소스 읽기를 사용해 다음을 요구한다: `border-box` 관찰, `offsetWidth/offsetHeight` 측정, 같은 크기 state 재사용, `.app-main`, `.mobile-account-actions`, `.mobile-signout-btn`, 모바일 16px 입력, 44px 입력/하단 탭, safe area. 340px 모델에서는 border-box 기준 compact 결과가 반복 측정해도 같아야 한다.

- [ ] **Step 2: RED 확인**

  Run: `npm run check:mobile-ux`

  Expected: 현재 훅에 border-box 계약과 모바일 독립 로그아웃/CSS가 없어 `AssertionError`로 실패한다.

---

### Task 2: 위젯 측정 피드백 루프 제거

**Files:**
- Modify: `src/hooks/useWidgetSize.ts`
- Test: `scripts/check-mobile-ux.mjs`

**Interfaces:**
- Consumes: `HTMLElement.offsetWidth`, `HTMLElement.offsetHeight`, `ResizeObserver`
- Produces: 기존 `{ ref, w, h }` API를 유지하는 안정된 border-box 크기

- [ ] **Step 1: 최소 구현**

  관찰 대상의 `offsetWidth/offsetHeight`를 반올림해 측정하고 이전 `w/h`와 같으면 이전 state를 반환한다. 최초 1회 즉시 측정한 뒤 `ResizeObserver.observe(el, { box: 'border-box' })`를 사용하고, 옵션을 지원하지 않는 환경에서는 기본 observe로 fallback한다.

- [ ] **Step 2: GREEN 일부 확인**

  Run: `npm run check:mobile-ux`

  Expected: 크기 측정 관련 assertion은 통과하고 아직 없는 모바일 로그아웃/CSS assertion에서 실패한다.

---

### Task 3: 독립 로그아웃과 글쓰기 공통 기준

**Files:**
- Modify: `src/components/PageShell.tsx`
- Modify: `src/index.css`
- Test: `scripts/check-mobile-ux.mjs`

**Interfaces:**
- Consumes: 기존 `saveNow`, `signOut`, 사용자 이름·사진
- Produces: 모바일 메뉴 계정 영역, `.app-main`, 모바일 입력·하단 탭 공통 규칙

- [ ] **Step 1: 독립 로그아웃 구현**

  전체 메뉴 그리드 뒤에 `.mobile-account-actions`를 추가하고 사용자 정보와 `.mobile-signout-btn`을 렌더링한다. `signingOut` 상태로 중복 실행을 막고 실패 시 버튼을 다시 활성화한다. 데스크톱 로그아웃도 같은 상태를 사용한다.

- [ ] **Step 2: 모바일 공통 CSS 구현**

  main에 `.app-main`을 붙이고 767px 이하에서 12px 좌우 padding, 입력/선택 16px·44px, textarea 96px, 하단 탭 44px와 safe area, 본문 scroll padding을 적용한다.

- [ ] **Step 3: GREEN 확인**

  Run: `npm run check:mobile-ux`

  Expected: `✓ mobile widget stability and writing UX checks passed`

---

### Task 4: 문서 동기화와 전체 검증·배포

**Files:**
- Modify: `REQUIREMENTS.md`
- Modify: `SCENARIOS.md`
- Modify: `PROGRESS.md`
- Modify: `NEXT_CHAT_HANDOFF.md`
- Modify: `UPDATE_SCHEDULE.md`

**Interfaces:**
- Consumes: 구현·검증 결과
- Produces: SC-10 모바일 1차 실기기 피드백 반영 기록

- [ ] **Step 1: 문서 반영**

  일일 루틴 안정화, 독립 로그아웃, 모바일 입력 16px/44px·본문 여백·safe area를 요구사항과 진행 기록에 한국어로 남긴다. 실기기 전체 최적화 완료로 표현하지 않는다.

- [ ] **Step 2: 전체 검증**

  Run: `npm run check:mobile-ux && npm run check:doc-sync && npm run check:onboarding && npm run check:user-data-merge && npm run check:todo-history && npm run check:planner-briefing && npm run check:career-milestones && npm run check:job-draft && npm run check:productivity-log && npx tsc --noEmit && npm run build && git diff --check`

  Expected: 모든 명령 exit 0.

- [ ] **Step 3: 390px 브라우저 검증**

  로컬 Vite 서버를 기존 서버와 충돌하지 않는 포트로 실행하고 390px viewport에서 페이지 내용, 오류 오버레이, 모바일 입력 CSS와 안전 영역을 확인한다. 인증 세션이 없으면 로그인 후 화면 미검증을 명시한다.

- [ ] **Step 4: Firebase Hosting 반영**

  Run: `firebase deploy --only hosting`

  Expected: `https://my-planner-487bd.web.app` 배포 완료.
