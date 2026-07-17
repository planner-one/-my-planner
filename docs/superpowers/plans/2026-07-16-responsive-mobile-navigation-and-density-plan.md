# 모바일 탐색·테마·반응형 밀도 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 하단 메뉴를 항상 보이게 하고, 홈 고정+계정별 바로가기 네 개, 상단 네 가지 테마 선택, 휴대폰·태블릿·웹 자동 화면 밀도를 구현해 Firebase 운영 앱에 반영한다.

**Architecture:** 실행형 순수 유틸 `responsiveUi.ts`가 하단 탭 정규화·순서 이동·화면 분류·실제 배율 계산을 맡는다. 계정별 `navigationPreferences`와 `displayPreferences`는 기존 `UserData`/AppContext/Firestore 저장 경계를 재사용하고 `updatedAt` 최신 우선 병합을 추가한다. `PageShell`은 하나의 모바일 패널 상태로 전체 메뉴·하단 메뉴 편집·테마 선택을 전환하며, CSS는 `100dvh` 앱 셸 안에서 본문만 스크롤하게 유지한다.

**Tech Stack:** React 18.3, TypeScript 6, Vite 5, Firebase Auth/Firestore/Hosting, React Grid Layout 1.4.4

## Global Constraints

- 모바일 하단 바는 `홈` 고정 + 사용자 선택 네 개, 총 다섯 칸이다.
- 기본 선택 순서는 `calendar`, `tasks`, `career`, `profile`이다.
- 자동 화면 밀도는 767px 이하 100%, 768~1199px 100%, 1200px 이상 90%다.
- 웹 직접 설정만 기존 `uiScale` 80~110%를 사용하고 휴대폰·태블릿은 100%를 유지한다.
- React Grid Layout은 `1.4.4`를 유지하고 48열 저장 좌표를 변경하지 않는다.
- 기존 루틴 안정화, 모바일 로그아웃, 포털 입력 16px/44px 규칙을 유지한다.
- Firestore 설정 필드는 optional로 추가하고 기존 사용자 데이터와 하위 호환한다.
- 사용자의 별도 지시 전에는 커밋·push를 수행하지 않는다. 각 Task 끝에서는 변경 범위와 테스트 결과만 검토한다.
- 배포는 Firebase Hosting만 사용한다.

---

## File Map

- Create: `src/utils/responsiveUi.ts` — 모바일 탭 허용 목록·정규화·순서 이동, viewport 분류와 배율 계산
- Create: `scripts/check-responsive-ui.mjs` — 순수 유틸 실행 및 PageShell/CSS/Profile 소스 계약 회귀 검사
- Modify: `package.json` — `check:responsive-ui` 스크립트
- Modify: `src/types/index.ts` — `NavigationPreferences`, `DisplayPreferences`, `DensityMode` type 재사용, `UserData` optional 필드
- Modify: `src/utils/userDataMerge.ts` — 두 설정 객체의 `updatedAt` 최신 우선 병합
- Modify: `scripts/check-user-data-merge.mjs` — stale-save 설정 병합 회귀
- Modify: `src/store/AppContext.tsx` — 설정 상태·hydrate·autosave·즉시 오류 전달 저장 API·웹 배율 적용
- Create: `src/components/MobileNavigationEditor.tsx` — 네 개 선택, 추가·제거·위·아래·초기화 UI
- Modify: `src/components/PageShell.tsx` — 다섯 칸 하단 바, 편집 패널, 모바일 테마 패널
- Modify: `src/index.css` — `100dvh`, 1199px 이하 100% 밀도, flex 하단 바, safe area
- Modify: `index.html` — `viewport-fit=cover`
- Modify: `src/pages/ProfilePage.tsx` — 자동/직접 설정과 현재 화면·실제 배율 표시
- Modify: `src/pages/Dashboard.tsx` — 웹 배율 컨트롤이 직접 설정 모드를 명시적으로 활성화
- Modify: `REQUIREMENTS.md`, `SCENARIOS.md`, `PROGRESS.md`, `NEXT_CHAT_HANDOFF.md`, `UPDATE_SCHEDULE.md` — SC-10 구현·검증·배포 기록

---

### Task 1: 반응형 UI 순수 유틸 RED → GREEN

**Files:**
- Create: `scripts/check-responsive-ui.mjs`
- Create: `src/utils/responsiveUi.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `normalizeMobileBottomTabs(value: unknown): MobileBottomTabId[]`
- Produces: `moveMobileBottomTab(items, id, direction): MobileBottomTabId[]`
- Produces: `getViewportKind(width): 'phone' | 'tablet' | 'desktop'`
- Produces: `resolveDisplayScale({ viewportWidth, densityMode, manualScale }): number`
- Produces: `normalizeNavigationPreferences(value)`와 `normalizeDisplayPreferences(value)`

- [x] **Step 1: 누락된 유틸을 명시적으로 실패시키는 검사 스크립트 작성**

  `scripts/check-responsive-ui.mjs`는 `node:assert/strict`, TypeScript `transpileModule`, 임시 `.mjs` import를 사용한다. 파일이 없으면 다음처럼 assertion으로 RED를 만든다.

  ```js
  let source = ''
  try {
    source = await readFile(path.join(repoRoot, 'src/utils/responsiveUi.ts'), 'utf8')
  } catch {
    assert.fail('responsive UI utility should exist')
  }
  ```

  유틸이 생긴 뒤에는 다음 실행형 계약을 검사한다.

  ```js
  assert.deepEqual(normalizeMobileBottomTabs(undefined), ['calendar', 'tasks', 'career', 'profile'])
  assert.deepEqual(
    normalizeMobileBottomTabs(['profile', 'profile', 'dashboard', 'unknown', 'notes']),
    ['profile', 'notes', 'calendar', 'tasks'],
  )
  assert.deepEqual(
    moveMobileBottomTab(['calendar', 'tasks', 'career', 'profile'], 'career', 'up'),
    ['calendar', 'career', 'tasks', 'profile'],
  )
  assert.equal(getViewportKind(390), 'phone')
  assert.equal(getViewportKind(768), 'tablet')
  assert.equal(getViewportKind(1200), 'desktop')
  assert.equal(resolveDisplayScale({ viewportWidth: 1199, densityMode: 'manual', manualScale: 80 }), 100)
  assert.equal(resolveDisplayScale({ viewportWidth: 1200, densityMode: 'auto', manualScale: 105 }), 90)
  assert.equal(resolveDisplayScale({ viewportWidth: 1440, densityMode: 'manual', manualScale: 105 }), 105)
  assert.equal(resolveDisplayScale({ viewportWidth: 1440, densityMode: 'manual', manualScale: 500 }), 110)
  ```

- [x] **Step 2: RED 확인**

  Run: `node scripts/check-responsive-ui.mjs`

  Expected: `AssertionError: responsive UI utility should exist`

- [x] **Step 3: `responsiveUi.ts` 최소 구현**

  ```ts
  export const DEFAULT_MOBILE_BOTTOM_TABS = ['calendar', 'tasks', 'career', 'profile'] as const
  export const MOBILE_BOTTOM_TAB_LIMIT = 4

  export const MOBILE_BOTTOM_TAB_IDS = [
    'calendar', 'habits', 'tasks', 'todos', 'goals', 'projects', 'weekly', 'daily',
    'notes', 'journal', 'profile', 'inquiries', 'print', 'career',
    'personalApplications', 'jobPostings', 'productivity',
  ] as const

  export type MobileBottomTabId = typeof MOBILE_BOTTOM_TAB_IDS[number]
  export type DensityMode = 'auto' | 'manual'
  export type ViewportKind = 'phone' | 'tablet' | 'desktop'

  const isMobileBottomTabId = (value: unknown): value is MobileBottomTabId =>
    typeof value === 'string' && MOBILE_BOTTOM_TAB_IDS.includes(value as MobileBottomTabId)

  export const normalizeMobileBottomTabs = (value: unknown): MobileBottomTabId[] => {
    const next: MobileBottomTabId[] = []
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (isMobileBottomTabId(item) && !next.includes(item) && next.length < MOBILE_BOTTOM_TAB_LIMIT) {
          next.push(item)
        }
      })
    }
    DEFAULT_MOBILE_BOTTOM_TABS.forEach(item => {
      if (!next.includes(item) && next.length < MOBILE_BOTTOM_TAB_LIMIT) next.push(item)
    })
    return next
  }

  export const moveMobileBottomTab = (
    items: MobileBottomTabId[],
    id: MobileBottomTabId,
    direction: 'up' | 'down',
  ): MobileBottomTabId[] => {
    const current = items.indexOf(id)
    const target = direction === 'up' ? current - 1 : current + 1
    if (current < 0 || target < 0 || target >= items.length) return items
    const next = [...items]
    ;[next[current], next[target]] = [next[target], next[current]]
    return next
  }

  export const getViewportKind = (width: number): ViewportKind =>
    width <= 767 ? 'phone' : width <= 1199 ? 'tablet' : 'desktop'

  const clampManualScale = (value: unknown) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return 90
    return Math.min(110, Math.max(80, Math.round(number / 5) * 5))
  }

  export const resolveDisplayScale = ({
    viewportWidth,
    densityMode,
    manualScale,
  }: {
    viewportWidth: number
    densityMode: DensityMode
    manualScale: unknown
  }) => viewportWidth < 1200
    ? 100
    : densityMode === 'manual' ? clampManualScale(manualScale) : 90

  export const normalizeNavigationPreferences = (value: unknown) => {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    return {
      mobileBottomTabs: normalizeMobileBottomTabs(record.mobileBottomTabs),
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
    }
  }

  export const normalizeDisplayPreferences = (value: unknown) => {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    return {
      densityMode: record.densityMode === 'manual' ? 'manual' as const : 'auto' as const,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
    }
  }
  ```

- [x] **Step 4: GREEN 확인과 package script 연결**

  `package.json`에 다음을 추가한다.

  ```json
  "check:responsive-ui": "node scripts/check-responsive-ui.mjs"
  ```

  Run: `npm run check:responsive-ui`

  Expected: `✓ responsive mobile navigation and density checks passed`

- [x] **Step 5: Task 1 검토**

  Run: `git diff --check -- scripts/check-responsive-ui.mjs src/utils/responsiveUi.ts package.json`

  Expected: exit 0. 커밋·push는 하지 않는다.

---

### Task 2: 계정별 설정 모델과 최신값 병합

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/utils/userDataMerge.ts`
- Modify: `scripts/check-user-data-merge.mjs`
- Modify: `src/store/AppContext.tsx`

**Interfaces:**
- Produces: `navigationPreferences`, `setNavigationPreferences`
- Produces: `displayPreferences`, `setDisplayPreferences`
- Produces: `saveImmediately(overrides: Partial<UserData>): Promise<void>`
- Consumes: Task 1의 정규화 함수

- [x] **Step 1: stale-save 설정 병합 RED 추가**

  `scripts/check-user-data-merge.mjs`에 remote와 incoming의 최신 설정이 각각 이기는 양방향 사례를 추가한다.

  ```js
  const newerIncomingPreferences = mergeUserDataForStaleSave(
    {
      navigationPreferences: {
        mobileBottomTabs: ['calendar', 'tasks', 'career', 'profile'],
        updatedAt: '2026-07-16T10:00:00.000Z',
      },
    },
    {
      navigationPreferences: {
        mobileBottomTabs: ['notes', 'todos', 'weekly', 'profile'],
        updatedAt: '2026-07-16T10:05:00.000Z',
      },
    },
  )
  assert(
    newerIncomingPreferences.navigationPreferences?.mobileBottomTabs[0] === 'notes',
    'newer incoming navigation preferences should beat stale remote preferences',
  )

  const newerRemoteDisplay = mergeUserDataForStaleSave(
    {
      displayPreferences: { densityMode: 'manual', updatedAt: '2026-07-16T10:06:00.000Z' },
    },
    {
      displayPreferences: { densityMode: 'auto', updatedAt: '2026-07-16T10:01:00.000Z' },
    },
  )
  assert(
    newerRemoteDisplay.displayPreferences?.densityMode === 'manual',
    'newer remote display preferences should beat stale incoming preferences',
  )
  ```

- [x] **Step 2: RED 확인**

  Run: `npm run check:user-data-merge`

  Expected: newer incoming navigation assertion fails because the current remote-first object spread wins.

- [x] **Step 3: optional 데이터 타입 추가**

  `src/types/index.ts`는 Task 1의 단일 `DensityMode` type을 재사용하고 다음 설정 type을 `UserData`에 연결한다.

  ```ts
  import type { DensityMode } from '../utils/responsiveUi'
  export type { DensityMode } from '../utils/responsiveUi'

  export interface NavigationPreferences {
    mobileBottomTabs: string[]
    updatedAt: string
  }

  export interface DisplayPreferences {
    densityMode: DensityMode
    updatedAt: string
  }
  ```

  ```ts
  navigationPreferences?: NavigationPreferences
  displayPreferences?: DisplayPreferences
  ```

- [x] **Step 4: 최신 `updatedAt` 병합 구현**

  `src/utils/userDataMerge.ts`에 다음 helper를 추가하고 `mergeUserDataForStaleSave`의 기본 spread 다음에 두 필드를 명시한다.

  ```ts
  const newerPreference = <T extends { updatedAt?: string }>(
    remoteValue: T | undefined,
    incomingValue: T | undefined,
  ): T | undefined => {
    if (!remoteValue) return incomingValue
    if (!incomingValue) return remoteValue
    return (incomingValue.updatedAt ?? '') > (remoteValue.updatedAt ?? '')
      ? incomingValue
      : remoteValue
  }
  ```

  ```ts
  merged.navigationPreferences = newerPreference(
    remoteData.navigationPreferences,
    incomingData.navigationPreferences,
  )
  merged.displayPreferences = newerPreference(
    remoteData.displayPreferences,
    incomingData.displayPreferences,
  )
  ```

- [x] **Step 5: AppContext 상태·hydrate·autosave 연결**

  다음 상태와 context API를 추가한다.

  ```ts
  navigationPreferences: NavigationPreferences
  setNavigationPreferences: React.Dispatch<React.SetStateAction<NavigationPreferences>>
  displayPreferences: DisplayPreferences
  setDisplayPreferences: React.Dispatch<React.SetStateAction<DisplayPreferences>>
  saveImmediately: (overrides: Partial<UserData>) => Promise<void>
  ```

  초기값과 hydrate는 Task 1 정규화 함수를 사용한다.

  ```ts
  const [navigationPreferences, setNavigationPreferences] = useState<NavigationPreferences>(() =>
    normalizeNavigationPreferences(undefined),
  )
  const [displayPreferences, setDisplayPreferences] = useState<DisplayPreferences>(() =>
    normalizeDisplayPreferences(undefined),
  )
  ```

  로드·계정 전환 reset·`currentDataRef` payload·autosave dependency·`hydrateSavedUserData`·context value에 두 상태를 모두 연결한다. 오류를 호출자에게 전달하는 즉시 저장 API는 기존 strict 경계를 감싼다.

  ```ts
  const saveImmediately = async (overrides: Partial<UserData>): Promise<void> => {
    await saveWithOverridesStrict(overrides)
  }
  ```

- [x] **Step 6: GREEN과 타입 확인**

  Run: `npm run check:user-data-merge`

  Expected: `User data stale-save merge checks passed.`

  Run: `npx tsc --noEmit`

  Expected: exit 0.

- [x] **Step 7: Task 2 검토**

  Run: `git diff --check -- src/types/index.ts src/utils/userDataMerge.ts scripts/check-user-data-merge.mjs src/store/AppContext.tsx`

  Expected: exit 0. 커밋·push는 하지 않는다.

---

### Task 3: 항상 보이는 다섯 칸 하단 메뉴와 편집 UI

**Files:**
- Modify: `scripts/check-responsive-ui.mjs`
- Modify: `index.html`
- Modify: `src/index.css`
- Create: `src/components/MobileNavigationEditor.tsx`
- Modify: `src/components/PageShell.tsx`

**Interfaces:**
- Consumes: `navigationPreferences.mobileBottomTabs`, `saveImmediately`
- Produces: 홈 고정 다섯 칸과 `.mobile-navigation-editor`
- Produces: `MobileNavigationEditor`의 `value`, `options`, `onChange`, `onSave`, `onCancel`, `saving`, `error` props

- [x] **Step 1: shell 계약 RED 추가**

  `scripts/check-responsive-ui.mjs`가 `index.html`, `index.css`, `PageShell.tsx`, `MobileNavigationEditor.tsx`를 읽고 다음을 요구하게 한다. 아직 없는 editor 파일은 빈 문자열로 읽어 ENOENT가 아니라 의도한 assertion으로 실패시킨다.

  ```js
  const readOptionalSource = async filePath => {
    try {
      return await readSource(filePath)
    } catch {
      return ''
    }
  }
  const editorSource = await readOptionalSource('src/components/MobileNavigationEditor.tsx')
  ```

  ```js
  assert.match(htmlSource, /width=device-width, initial-scale=1\.0, viewport-fit=cover/)
  assert.match(cssSource, /--app-viewport-height:\s*100dvh\s*!important/)
  assert.match(cssSource, /\.bottom-nav\s*\{[\s\S]*flex-shrink:\s*0/)
  assert.match(pageShellSource, /normalizeMobileBottomTabs\(navigationPreferences\.mobileBottomTabs\)/)
  assert.match(pageShellSource, /'dashboard',[\s\S]*mobileBottomTabs/)
  assert.match(pageShellSource, /하단 메뉴 편집/)
  assert.match(editorSource, /className="mobile-navigation-editor"/)
  assert.match(editorSource, /위로/)
  assert.match(editorSource, /아래로/)
  assert.match(editorSource, /초기화/)
  ```

- [x] **Step 2: RED 확인**

  Run: `npm run check:responsive-ui`

  Expected: viewport-fit 또는 `100dvh` assertion에서 실패.

- [x] **Step 3: viewport와 flex 셸 최소 수정**

  `index.html`의 viewport meta를 다음으로 바꾼다.

  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  ```

  `src/index.css`의 1199px 이하 root와 하단 바에 다음 계약을 적용한다.

  ```css
  @media (max-width: 1199px) {
    :root {
      --app-scale: 1 !important;
      --app-viewport-height: 100vh !important;
      --app-viewport-height: 100dvh !important;
    }
  }

  @media (max-width: 767px) {
    .app-main { min-height: 0; }
    .bottom-nav {
      flex-shrink: 0;
      padding-bottom: calc(8px + env(safe-area-inset-bottom)) !important;
    }
  }
  ```

- [x] **Step 4: `MobileNavigationEditor` 구현**

  컴포넌트는 `MobileBottomTabId[]` draft를 받아 선택 목록과 선택 가능 목록을 분리한다. `moveMobileBottomTab`, `DEFAULT_MOBILE_BOTTOM_TABS`, `MOBILE_BOTTOM_TAB_LIMIT`을 사용한다. 네 개 미만이면 완료 버튼을 비활성화하고 `바로가기를 N개 더 선택해주세요.`를 `role="status"`로 표시한다. 각 선택 항목은 위·아래·제거 버튼, 미선택 항목은 추가 버튼을 가진다. `초기화`는 기본 네 항목을 복사해 `onChange([...DEFAULT_MOBILE_BOTTOM_TABS])`를 호출한다.

  ```ts
  interface MobileNavigationEditorProps {
    value: MobileBottomTabId[]
    options: Array<{ id: MobileBottomTabId; label: string; groupLabel: string }>
    onChange: (value: MobileBottomTabId[]) => void
    onSave: () => void
    onCancel: () => void
    saving: boolean
    error: string
  }
  ```

- [x] **Step 5: PageShell의 모바일 패널 상태와 하단 바 연결**

  기존 boolean을 다음 패널 상태로 바꾼다.

  ```ts
  type MobilePanel = 'pages' | 'navigation' | 'themes'
  const [mobilePanel, setMobilePanel] = useState<MobilePanel | null>(null)
  const mobileMenuOpen = mobilePanel !== null
  ```

  하단 탭은 정규화 결과에 홈을 앞에 붙여 순서대로 찾는다.

  ```ts
  const mobileBottomTabs = normalizeMobileBottomTabs(
    navigationPreferences.mobileBottomTabs,
  )
  const mobileBottomNavItems = ['dashboard', ...mobileBottomTabs]
    .map(id => NAV_ITEMS.find(item => item.id === id))
    .filter((item): item is NavItem => Boolean(item))
  ```

  `pages` 패널 헤더 바로 아래에 `하단 메뉴 편집` 버튼을 두고 `navigation` 패널에서는 새 editor를 렌더링한다. 편집 draft는 패널 진입 시 현재 네 항목을 복사한다. 저장은 다음 순서로 처리한다.

  ```ts
  const next = {
    mobileBottomTabs: [...mobileNavDraft],
    updatedAt: new Date().toISOString(),
  }
  await saveImmediately({ navigationPreferences: next })
  setMobilePanel('pages')
  ```

  실패하면 `하단 메뉴를 저장하지 못했습니다. 다시 시도해주세요.`를 표시하고 editor를 유지한다.

- [x] **Step 6: GREEN과 기존 모바일 검사 확인**

  Run: `npm run check:responsive-ui`

  Expected: responsive shell assertions pass.

  Run: `npm run check:mobile-ux`

  Expected: 기존 루틴·로그아웃·입력 회귀 통과.

- [x] **Step 7: Task 3 검토**

  Run: `npx tsc --noEmit`

  Run: `git diff --check -- index.html src/index.css src/components/MobileNavigationEditor.tsx src/components/PageShell.tsx scripts/check-responsive-ui.mjs`

  Expected: 둘 다 exit 0. 커밋·push는 하지 않는다.

---

### Task 4: 모바일 상단 네 가지 테마 선택 패널

**Files:**
- Modify: `scripts/check-responsive-ui.mjs`
- Modify: `src/components/PageShell.tsx`

**Interfaces:**
- Consumes: 기존 `THEME_OPTIONS`, `theme`, `applyTheme`
- Produces: `.mobile-theme-trigger`, `.mobile-theme-picker`, `mobilePanel === 'themes'`

- [x] **Step 1: 테마 패널 RED 추가**

  ```js
  assert.match(pageShellSource, /className="mobile-theme-trigger"/)
  assert.match(pageShellSource, /aria-label="테마 선택 열기"/)
  assert.match(pageShellSource, /mobilePanel === 'themes'/)
  assert.match(pageShellSource, /className="mobile-theme-picker"/)
  for (const label of ['라이트', '다크', '코랄', '블루']) {
    assert.match(pageShellSource, new RegExp(label))
  }
  assert.match(pageShellSource, /applyTheme\(option\.id\)/)
  ```

- [x] **Step 2: RED 확인**

  Run: `npm run check:responsive-ui`

  Expected: `mobile-theme-trigger` assertion fails.

- [x] **Step 3: 팔레트 버튼과 공유 패널 구현**

  모바일 헤더의 링크 정리와 전체 메뉴 사이에 44px 아이콘 버튼을 둔다. 버튼은 `setMobilePanel('themes')`를 호출한다. `themes` 패널은 네 `THEME_OPTIONS`를 렌더링하고 현재 항목에 `aria-current="true"`와 체크 표시를 제공한다. 선택 handler는 다음 흐름을 사용한다.

  ```ts
  const selectMobileTheme = (nextTheme: Theme) => {
    applyTheme(nextTheme)
    setMobilePanel(null)
  }
  ```

  기존 모바일 dialog 포커스 트랩을 공유한다. `mobilePanel`이 바뀌면 새 패널 제목 `tabIndex={-1}`에 포커스를 이동한다. Escape와 backdrop 닫기는 기존 trigger 복귀 흐름을 유지한다.

- [x] **Step 4: GREEN 확인**

  Run: `npm run check:responsive-ui`

  Expected: theme assertions pass.

  Run: `npx tsc --noEmit`

  Expected: exit 0.

- [x] **Step 5: Task 4 검토**

  Run: `git diff --check -- src/components/PageShell.tsx scripts/check-responsive-ui.mjs`

  Expected: exit 0. 커밋·push는 하지 않는다.

---

### Task 5: 자동 화면 밀도와 웹 직접 설정

**Files:**
- Modify: `scripts/check-responsive-ui.mjs`
- Modify: `src/store/AppContext.tsx`
- Modify: `src/pages/ProfilePage.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `displayPreferences.densityMode`, 기존 `uiScale`
- Produces: 프로필 `자동(권장)`/`직접 설정`, 현재 viewport 종류와 실제 배율
- Produces: 1200px 이상 웹용 inline `--app-scale`, `--app-viewport-height`

- [x] **Step 1: 밀도 UI/적용 RED 추가**

  ```js
  assert.match(profileSource, /자동\(권장\)/)
  assert.match(profileSource, /직접 설정/)
  assert.match(profileSource, /resolveDisplayScale/)
  assert.match(profileSource, /터치와 글자 가독성을 위해 100%/)
  assert.match(appContextSource, /displayPreferences\.densityMode/)
  assert.match(dashboardSource, /densityMode:\s*'manual'/)
  assert.match(cssSource, /@media \(max-width:\s*1199px\)/)
  ```

- [x] **Step 2: RED 확인**

  Run: `npm run check:responsive-ui`

  Expected: `자동(권장)` assertion fails.

- [x] **Step 3: AppContext의 웹 배율 적용 수정**

  자동 모드는 웹 inline scale을 90, 직접 모드는 clamp된 `uiScale`로 계산한다. 1199px 이하는 Task 3 CSS가 항상 100%로 덮어쓴다.

  ```ts
  useEffect(() => {
    const desktopScalePercent = resolveDisplayScale({
      viewportWidth: 1200,
      densityMode: displayPreferences.densityMode,
      manualScale: uiScale,
    })
    const scale = desktopScalePercent / 100
    document.documentElement.style.setProperty('--app-scale', String(scale))
    document.documentElement.style.setProperty('--app-viewport-height', `${100 / scale}dvh`)
  }, [displayPreferences.densityMode, uiScale])
  ```

- [x] **Step 4: 프로필 자동/직접 설정 UI 구현**

  `window.innerWidth`를 state로 추적하고 resize listener를 정리한다. `getViewportKind`와 `resolveDisplayScale`로 `현재: 휴대폰 · 100%`, `현재: 태블릿 · 100%`, `현재: 웹 · 90%`를 표시한다.

  모드 변경은 최신 timestamp와 함께 strict 저장한다.

  ```ts
  const nextDisplayPreferences = {
    densityMode: nextMode,
    updatedAt: new Date().toISOString(),
  }
  await saveImmediately({ displayPreferences: nextDisplayPreferences })
  ```

  직접 설정 slider는 `viewportKind === 'desktop' && densityMode === 'manual'`일 때만 활성화한다. 폰·태블릿에는 저장된 웹 직접값과 `터치와 글자 가독성을 위해 100%가 적용됩니다.`를 표시한다.

- [x] **Step 5: Dashboard 배율 컨트롤 연결**

  데스크톱 dashboard의 −/select/+ 조작은 수동 모드를 함께 활성화하고 두 값을 한 payload로 저장한다.

  ```ts
  const nextDisplayPreferences = {
    densityMode: 'manual' as const,
    updatedAt: new Date().toISOString(),
  }
  setUiScale(value)
  setDisplayPreferences(nextDisplayPreferences)
  void saveWithOverrides({
    uiScale: value,
    displayPreferences: nextDisplayPreferences,
  })
  ```

  자동 모드일 때 scale control에는 `자동 90%` 상태를 보이고, 사용자가 숫자를 조작하는 순간 직접 설정으로 전환한다.

- [x] **Step 6: GREEN과 전체 관련 회귀 확인**

  Run: `npm run check:responsive-ui`

  Run: `npm run check:user-data-merge`

  Run: `npx tsc --noEmit`

  Expected: 모두 exit 0.

- [x] **Step 7: Task 5 검토**

  Run: `git diff --check -- src/store/AppContext.tsx src/pages/ProfilePage.tsx src/pages/Dashboard.tsx src/index.css scripts/check-responsive-ui.mjs`

  Expected: exit 0. 커밋·push는 하지 않는다.

---

### Task 6: 문서 동기화, 전체 검증, 운영 배포

**Files:**
- Modify: `REQUIREMENTS.md`
- Modify: `SCENARIOS.md`
- Modify: `PROGRESS.md`
- Modify: `NEXT_CHAT_HANDOFF.md`
- Modify: `UPDATE_SCHEDULE.md`
- Modify: `docs/superpowers/plans/2026-07-16-responsive-mobile-navigation-and-density-plan.md`

**Interfaces:**
- Produces: SC-10 모바일 탐색·테마·밀도 보강 기록과 Firebase 운영 릴리즈

- [x] **Step 1: 요구사항과 시나리오 문서화**

  다음 세 요구사항을 추가하고 SC-10에 연결한다.

  ```md
  | R-090 | 모바일 앱 셸은 동적 viewport와 safe area를 사용해 하단 메뉴를 항상 가시 영역에 유지한다. 하단 메뉴는 홈 고정과 계정별 바로가기 네 개로 구성한다 |
  | R-091 | 모바일 상단은 라이트·다크·코랄·블루 테마를 직접 선택하는 접근 가능한 테마 패널을 제공한다 |
  | R-092 | 화면 밀도는 현재 viewport 폭에 따라 휴대폰·태블릿 100%, 웹 90%를 자동 적용하고 웹 직접 설정 80~110%를 보존한다 |
  ```

  `PROGRESS.md`, `NEXT_CHAT_HANDOFF.md`, `UPDATE_SCHEDULE.md`에는 자동 검증과 실기기 확인을 구분하고 전체 모바일 최적화 완료라고 표현하지 않는다.

- [x] **Step 2: 전체 자동 검증**

  다음 명령을 각각 실행해 실패 원인을 분리한다.

  ```bash
  npm run check:responsive-ui
  npm run check:mobile-ux
  npm run check:doc-sync
  npm run check:onboarding
  npm run check:user-data-merge
  npm run check:todo-history
  npm run check:planner-briefing
  npm run check:career-milestones
  npm run check:personal-application-dates
  npm run check:job-draft
  npm run check:productivity-log
  npx tsc --noEmit
  npm run build
  git diff --check
  ```

  Expected: 모든 명령 exit 0, Vite production build 성공.

- [ ] **Step 3: 반응형 화면 검증**

  기존 로컬 Vite 서버를 재사용하거나 `local-dev-runner` 기준으로 충돌 없는 localhost를 시작한다. 390px, 768px, 1024px에서 다음을 확인한다.

  - 하단 바가 첫 화면부터 보이고 다섯 칸이며 본문 마지막 항목을 가리지 않음
  - 전체 메뉴 상단에서 하단 메뉴 편집 진입 가능
  - 네 개 선택, 제거 후 추가, 위·아래 이동, 초기화, 저장 후 즉시 반영
  - 팔레트 버튼과 네 테마 선택, Escape 닫기, 포커스 복귀
  - 프로필의 현재 화면 종류와 100%/90% 표시
  - 콘솔 오류와 Vite 오류 overlay 없음

  인증 세션을 자동 브라우저에 연결할 수 없으면 코드·자동 검사와 운영 배포 후 실제 휴대폰 사용자 확인을 명시한다.

  2026-07-16 운영 로그인 전 확인에서는 390px, 768px, 1024px 모두 scale 1, `100dvh`, horizontal overflow 0, console error 0을 확인했다. 브라우저에 인증 세션이 없어 위의 로그인 후 하단 메뉴·편집·테마·밀도와 실제 기기 주소창·키보드 기준은 미완료로 남긴다.

- [x] **Step 4: Firebase Hosting 배포**

  Run: `firebase deploy --only hosting`

  Expected: `Deploy complete!`와 `https://my-planner-487bd.web.app`.

  Result: exit 0, `hosting[my-planner-487bd]` 33개 파일 업로드와 release complete를 확인했다.

- [x] **Step 5: 운영 자산 확인**

  운영 `index.html`이 새 asset hash를 반환하는지 확인하고, 배포된 CSS/JS에서 `100dvh`, `mobile-navigation-editor`, `mobile-theme-trigger`, `자동(권장)` 표식을 확인한다.

  Result: `index-CD5IE4I1.js`, `index-D8jI16M-.css`, `App-zMiqyG0Y.js`, `ProfilePage-Be2h5m7v.js`와 네 표식을 확인했다.

- [x] **Step 6: 계획 체크박스와 최종 상태 갱신**

  실제 완료된 항목만 `[x]`로 바꾸고 실기기 로그인 검증이 되지 않은 항목은 `[ ]`로 남긴다. 마지막 `git status --short --branch`로 기존 미커밋 보완분과 이번 변경을 모두 보존했는지 확인한다. 커밋·push는 사용자 별도 지시 전 수행하지 않는다.

---

## Plan Self-Review Checklist

- [x] R-090~092의 모든 요구가 구현 Task와 검증 Step에 연결되어 있다.
- [x] `MobileBottomTabId`, `DensityMode`, preference 필드 이름이 모든 Task에서 일치한다.
- [x] 기존 `uiScale`과 48열 dashboard layout을 삭제하거나 변형하는 단계가 없다.
- [x] 모바일 로그아웃·루틴·입력 회귀를 실행하는 단계가 있다.
- [x] 미정 표기나 구현 주체가 해석해야 하는 빈 단계가 없다.
- [x] 커밋·push를 자동 수행하는 단계가 없다.
