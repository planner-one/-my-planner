# 빠른 메모 위젯 편집·보관 UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 빠른 메모 위젯에 스크롤 중에만 보이는 스크롤바, 상단 연필 편집 모드, 항목별 보관·수정·완전 삭제 동작을 추가한다.

**Architecture:** `MemoActions`와 `MemoWidget` 사이의 일시적 편집 모드는 `MemoWidget.tsx` 내부 `useSyncExternalStore` 저장소로 공유한다. 메모 데이터는 기존 `setQuickMemos` 흐름에서 수정·보관·삭제하고 Firestore 스키마는 유지한다.

**Tech Stack:** React 18.3, TypeScript 6, Vite 5, Firebase

## Global Constraints

- React Grid Layout은 `1.4.4`를 유지하고 의존성을 추가하지 않는다.
- 기존 `QuickMemoEntry` 구조와 Firestore 자동 저장 흐름을 유지한다.
- `×`는 보관, `삭제`는 확인 후 완전 삭제로 구분한다.
- 현재 작업공간의 모바일 헤더 관련 미커밋 변경을 수정하거나 되돌리지 않는다.
- 사용자 확인 전 커밋·푸시·배포하지 않는다.

---

### Task 1: 빠른 메모 위젯 회귀 검사

**Files:**
- Create: `scripts/check-memo-widget.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `src/widgets/MemoWidget.tsx` 소스 계약
- Produces: `npm run check:memo-widget`

- [ ] **Step 1: 실패 회귀 검사 작성**

  Node `assert`와 `readFile`로 다음 계약을 검사한다: `useSyncExternalStore`, `빠른 메모 편집`, `aria-pressed`, `보관함으로 이동`, 완전 삭제 확인창, `memo-scroll-region`, `is-scrolling`, 투명 기본 scrollbar와 활성 thumb, `updatedAt` 갱신.

- [ ] **Step 2: RED 확인**

  Run: `npm run check:memo-widget`

  Expected: 현재 위젯에 편집 모드와 스크롤 활성 클래스가 없어 `AssertionError`로 실패한다.

---

### Task 2: 상단 편집 모드와 항목 액션

**Files:**
- Modify: `src/widgets/MemoWidget.tsx`
- Test: `scripts/check-memo-widget.mjs`

**Interfaces:**
- Consumes: `quickMemos`, `setQuickMemos`, `QuickMemoEntry`
- Produces: 모듈 내부 `setMemoManageMode(next: boolean)`, `useMemoManageMode(): boolean`

- [ ] **Step 1: 편집 모드 공유 저장소 구현**

  `useSyncExternalStore`와 모듈 범위 listener 집합으로 `MemoActions`와 `MemoWidget`이 같은 boolean 편집 모드를 읽고 변경하게 한다.

- [ ] **Step 2: 상단 연필·체크 액션 구현**

  `MemoActions`를 flex 액션 그룹으로 바꾸고 `보관함` 왼쪽에 연필 버튼을 배치한다. 편집 중에는 체크 아이콘과 `aria-pressed="true"`를 표시한다.

- [ ] **Step 3: 보관·수정·완전 삭제 구현**

  `×`는 `archivedAt`과 `updatedAt`을 기록한다. 편집 모드의 `수정`은 인라인 textarea를 열고 Enter/blur 저장, Shift+Enter 줄바꿈, Escape 취소를 지원한다. `삭제`는 확인 후 배열에서 제거한다.

- [ ] **Step 4: GREEN 확인**

  Run: `npm run check:memo-widget`

  Expected: `✓ memo widget interaction checks passed`

---

### Task 3: 스크롤 표시와 문서 동기화

**Files:**
- Modify: `src/widgets/MemoWidget.tsx`
- Modify: `REQUIREMENTS.md`
- Modify: `SCENARIOS.md`
- Modify: `PROGRESS.md`
- Test: `scripts/check-memo-widget.mjs`

**Interfaces:**
- Consumes: 목록 `scroll` 이벤트
- Produces: `.memo-scroll-region.is-scrolling` 표시 상태

- [ ] **Step 1: 스크롤 중 thumb 표시 구현**

  기본 scrollbar thumb와 track은 투명하게 유지하고 `is-scrolling`에서만 thumb를 표시한다. 마지막 scroll 이벤트 후 700ms에 클래스를 제거하고 unmount 시 timer를 해제한다.

- [ ] **Step 2: 요구사항·시나리오·진행 기록 반영**

  `R-W02`, `SC-07`, `PROGRESS.md`에 상단 편집 모드, 보관·수정·완전 삭제 구분, 스크롤 중 표시를 한국어로 기록한다.

- [ ] **Step 3: 전체 검증**

  Run: `npm run check:memo-widget`

  Run: `npm run check:responsive-ui`

  Run: `npm run check:doc-sync`

  Run: `./node_modules/.bin/tsc --noEmit`

  Run: `npm run build`

  Run: `git diff --check`

  Expected: 모든 명령 exit 0. 로그인 세션이 없으면 실제 저장 데이터 조작의 육안 검증은 별도 제한으로 기록한다.
