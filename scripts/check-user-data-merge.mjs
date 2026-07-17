import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tmp = mkdtempSync(join(tmpdir(), 'planner-user-data-merge-'))

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const findFile = (dir, fileName) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      const found = findFile(path, fileName)
      if (found) return found
    } else if (entry === fileName) {
      return path
    }
  }
  return null
}

try {
  writeFileSync(join(tmp, 'package.json'), '{"type":"module"}\n')
  execFileSync(
    process.platform === 'win32' ? 'node_modules/.bin/tsc.cmd' : './node_modules/.bin/tsc',
    [
      'src/utils/userDataMerge.ts',
      '--target', 'ES2020',
      '--module', 'ES2020',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
      '--strict',
      '--ignoreConfig',
      '--outDir', tmp,
    ],
    { cwd: root, stdio: 'pipe' },
  )

  const compiledPath = findFile(tmp, 'userDataMerge.js')
  assert(compiledPath, 'compiled user data merge utility was not found')
  writeFileSync(
    compiledPath,
    readFileSync(compiledPath, 'utf8').replace("from './todos'", "from './todos.js'"),
  )

  const { mergeUserDataForStaleSave, rebaseUserDataAfterSave } = await import(pathToFileURL(compiledPath).href)

  const remote = {
    _lastSaved: '2026-07-06T10:00:00.000Z',
    todos: [
      {
        id: 'portfolio',
        text: '포트폴리오 수정',
        done: true,
        priority: 'medium',
        category: 'personal',
        date: '2026-07-06',
      },
      {
        id: 'latest-only',
        text: '최신 창에서 만든 Todo',
        done: false,
        priority: 'high',
        category: 'work',
        date: '2026-07-06',
      },
    ],
    todoHistory: [{
      date: '2026-07-05',
      total: 1,
      done: 1,
      completionRate: 100,
      savedAt: '2026-07-06T09:30:00.000Z',
      source: 'auto',
      items: [{
        id: 'old-live',
        text: '과거 미완료였던 일',
        done: true,
        priority: 'medium',
        category: 'work',
        date: '2026-07-05',
      }],
    }],
  }

  const staleIncoming = {
    _lastSaved: '2026-07-06T10:05:00.000Z',
    todos: [
      {
        id: 'portfolio',
        text: '포트폴리오 수정',
        done: false,
        priority: 'medium',
        category: 'personal',
        date: '2026-07-06',
      },
      {
        id: 'old-live',
        text: '과거 미완료였던 일',
        done: false,
        priority: 'medium',
        category: 'work',
        date: '2026-07-05',
      },
    ],
    todoHistory: [],
  }

  const merged = mergeUserDataForStaleSave(remote, staleIncoming)

  assert(merged._lastSaved === staleIncoming._lastSaved, 'merged save should keep the new save timestamp')
  assert(merged.todos.some(todo => todo.id === 'latest-only'), 'remote latest todo should not disappear')
  assert(merged.todos.find(todo => todo.id === 'portfolio')?.done === true, 'stale unchecked state should not clear a completed todo')
  assert(!merged.todos.some(todo => todo.id === 'old-live'), 'old live todo already resolved in history should not be resurrected')
  assert(merged.todoHistory?.length === 1, 'remote todo history should be preserved')
  assert(merged.todoHistory?.[0].done === 1, 'completed remote history should remain completed')

  const onboardingStartedAt = '2026-07-14T09:00:00.000Z'
  const remotePending = {
    _lastSaved: '2026-07-14T09:01:00.000Z',
    dashboardActive: [],
    dashboardLayout: [],
    onboarding: {
      version: 1,
      status: 'pending',
      startedAt: onboardingStartedAt,
      updatedAt: '2026-07-14T09:01:00.000Z',
    },
  }
  const incomingCompleted = {
    _lastSaved: '2026-07-14T09:02:00.000Z',
    dashboardActive: ['todo-starter-v1'],
    dashboardLayout: [{ i: 'todo-starter-v1', x: 0, y: 0, w: 8, h: 7 }],
    onboarding: {
      version: 1,
      status: 'completed',
      purpose: 'daily',
      startedAt: onboardingStartedAt,
      updatedAt: '2026-07-14T09:02:00.000Z',
      completedAt: '2026-07-14T09:02:00.000Z',
    },
  }
  const completedMerge = mergeUserDataForStaleSave(remotePending, incomingCompleted)
  assert(completedMerge.onboarding?.status === 'completed', 'completed onboarding should beat pending state')
  assert(
    completedMerge.dashboardActive?.[0] === 'todo-starter-v1',
    'an onboarding status upgrade should keep its starter dashboard',
  )

  const stalePendingMerge = mergeUserDataForStaleSave(incomingCompleted, remotePending)
  assert(stalePendingMerge.onboarding?.status === 'completed', 'stale pending state should not reopen onboarding')
  assert(
    stalePendingMerge.dashboardActive?.[0] === 'todo-starter-v1',
    'stale pending save should not clear the completed starter dashboard',
  )

  const remoteWithCustomDashboard = {
    ...remotePending,
    dashboardActive: ['memo-custom'],
    dashboardLayout: [{ i: 'memo-custom', x: 0, y: 0, w: 8, h: 6 }],
  }
  const customDashboardMerge = mergeUserDataForStaleSave(remoteWithCustomDashboard, incomingCompleted)
  assert(
    customDashboardMerge.dashboardActive?.[0] === 'memo-custom',
    'onboarding completion should not replace a dashboard created in another tab',
  )

  const remoteWithOrphanLayout = {
    ...remotePending,
    dashboardLayout: [{ i: 'removed-widget', x: 0, y: 0, w: 8, h: 6 }],
  }
  const orphanLayoutMerge = mergeUserDataForStaleSave(remoteWithOrphanLayout, incomingCompleted)
  assert(
    orphanLayoutMerge.dashboardActive?.[0] === 'todo-starter-v1'
      && orphanLayoutMerge.dashboardLayout?.[0]?.i === 'todo-starter-v1',
    'a visually empty dashboard should replace orphan layout with the starter preset',
  )

  const futurePending = {
    ...remotePending,
    onboarding: {
      ...remotePending.onboarding,
      version: 2,
      updatedAt: '2026-07-14T09:03:00.000Z',
    },
  }
  const futureVersionMerge = mergeUserDataForStaleSave(futurePending, incomingCompleted)
  assert(futureVersionMerge.onboarding?.version === 2, 'a future onboarding version should beat v1 status ranking')

  const sentBeforeConcurrentEdit = {
    _lastSaved: '2026-07-14T09:04:00.000Z',
    nickname: '이전 별명',
    tasks: [{ id: 'shared-task', name: '이전 작업명', done: false }],
    notes: [{ id: 'remove-me', title: '지울 노트', content: '', fav: false }],
    onboarding: remotePending.onboarding,
  }
  const localAfterConcurrentEdit = {
    ...sentBeforeConcurrentEdit,
    _lastSaved: '2026-07-14T09:04:30.000Z',
    nickname: '새 별명',
    tasks: [{ id: 'shared-task', name: '새 작업명', done: false }],
    notes: [],
  }
  const staleSaveResult = {
    ...sentBeforeConcurrentEdit,
    _lastSaved: '2026-07-14T09:05:00.000Z',
    tasks: [
      { id: 'shared-task', name: '이전 작업명', done: false },
      { id: 'remote-task', name: '다른 탭 작업', done: false },
    ],
    notes: [
      { id: 'remove-me', title: '지울 노트', content: '', fav: false },
      { id: 'remote-note', title: '다른 탭 노트', content: '', fav: false },
    ],
    onboarding: incomingCompleted.onboarding,
  }
  const rebased = rebaseUserDataAfterSave(
    sentBeforeConcurrentEdit,
    localAfterConcurrentEdit,
    staleSaveResult,
  )
  assert(rebased.nickname === '새 별명', 'rebase should preserve a scalar edited while save was in flight')
  assert(
    rebased.tasks?.find(task => task.id === 'shared-task')?.name === '새 작업명',
    'rebase should preserve a same-id item edited while save was in flight',
  )
  assert(
    rebased.tasks?.some(task => task.id === 'remote-task'),
    'rebase should retain an item merged from another tab',
  )
  assert(
    !rebased.notes?.some(note => note.id === 'remove-me')
      && rebased.notes?.some(note => note.id === 'remote-note'),
    'rebase should apply a local deletion without dropping a remote addition',
  )
  assert(rebased.onboarding?.status === 'completed', 'rebase should adopt untouched remote onboarding completion')
  assert(rebased._lastSaved === staleSaveResult._lastSaved, 'rebase should keep the accepted remote save baseline')

  const atomicOnboardingRebase = rebaseUserDataAfterSave(
    {
      onboarding: {
        ...remotePending.onboarding,
        purpose: 'daily',
      },
    },
    {
      onboarding: {
        ...remotePending.onboarding,
        purpose: 'jobSearch',
        updatedAt: '2026-07-14T09:04:30.000Z',
      },
    },
    {
      onboarding: {
        ...incomingCompleted.onboarding,
        purpose: 'workStudy',
      },
    },
  )
  assert(
    atomicOnboardingRebase.onboarding?.status === 'completed'
      && atomicOnboardingRebase.onboarding?.purpose === 'workStudy'
      && atomicOnboardingRebase.onboarding?.completedAt === incomingCompleted.onboarding.completedAt,
    'onboarding rebase should select one whole state instead of mixing status and purpose fields',
  )

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

  const newerIncomingDisplay = mergeUserDataForStaleSave(
    {
      uiScale: 85,
      displayPreferences: { densityMode: 'auto', updatedAt: '2026-07-16T10:01:00.000Z' },
    },
    {
      uiScale: 105,
      displayPreferences: { densityMode: 'manual', updatedAt: '2026-07-16T10:06:00.000Z' },
    },
  )
  assert(
    newerIncomingDisplay.displayPreferences?.densityMode === 'manual'
      && newerIncomingDisplay.uiScale === 105,
    'newer incoming display preferences should keep their ui scale as one setting pair',
  )

  const newerRemoteDisplay = mergeUserDataForStaleSave(
    {
      uiScale: 85,
      displayPreferences: { densityMode: 'manual', updatedAt: '2026-07-16T10:06:00.000Z' },
    },
    {
      uiScale: 105,
      displayPreferences: { densityMode: 'auto', updatedAt: '2026-07-16T10:01:00.000Z' },
    },
  )
  assert(
    newerRemoteDisplay.displayPreferences?.densityMode === 'manual'
      && newerRemoteDisplay.uiScale === 85,
    'newer remote display preferences should keep their ui scale as one setting pair',
  )

  const newerIncomingDisplayWithoutScale = mergeUserDataForStaleSave(
    {
      uiScale: 85,
      displayPreferences: { densityMode: 'auto', updatedAt: '2026-07-16T10:01:00.000Z' },
    },
    {
      displayPreferences: { densityMode: 'manual', updatedAt: '2026-07-16T10:06:00.000Z' },
    },
  )
  assert(
    newerIncomingDisplayWithoutScale.displayPreferences?.densityMode === 'manual'
      && newerIncomingDisplayWithoutScale.uiScale === 85,
    'newer incoming display preferences without scale should keep the remote scale fallback',
  )

  const newerRemoteDisplayWithoutScale = mergeUserDataForStaleSave(
    {
      displayPreferences: { densityMode: 'manual', updatedAt: '2026-07-16T10:06:00.000Z' },
    },
    {
      uiScale: 105,
      displayPreferences: { densityMode: 'auto', updatedAt: '2026-07-16T10:01:00.000Z' },
    },
  )
  assert(
    newerRemoteDisplayWithoutScale.displayPreferences?.densityMode === 'manual'
      && newerRemoteDisplayWithoutScale.uiScale === 105,
    'newer remote display preferences without scale should keep the incoming scale fallback',
  )

  const equalTimestampRemoteDisplayWithoutScale = mergeUserDataForStaleSave(
    {
      displayPreferences: { densityMode: 'auto', updatedAt: '2026-07-16T10:06:00.000Z' },
    },
    {
      uiScale: 105,
      displayPreferences: { densityMode: 'manual', updatedAt: '2026-07-16T10:06:00.000Z' },
    },
  )
  assert(
    equalTimestampRemoteDisplayWithoutScale.displayPreferences?.densityMode === 'auto'
      && equalTimestampRemoteDisplayWithoutScale.uiScale === 105,
    'equal display timestamps should keep the remote preference with incoming scale fallback',
  )

  const emptyTimestampRemoteDisplayWithoutScale = mergeUserDataForStaleSave(
    {
      displayPreferences: { densityMode: 'manual', updatedAt: '' },
    },
    {
      uiScale: 0,
      displayPreferences: { densityMode: 'auto', updatedAt: '' },
    },
  )
  assert(
    emptyTimestampRemoteDisplayWithoutScale.displayPreferences?.densityMode === 'manual'
      && emptyTimestampRemoteDisplayWithoutScale.uiScale === 0,
    'empty display timestamps should keep the remote preference and preserve a zero scale fallback',
  )

  const legacyRemoteWithoutDisplayPreferences = mergeUserDataForStaleSave(
    { uiScale: 85 },
    {
      uiScale: 105,
      displayPreferences: { densityMode: 'manual', updatedAt: '2026-07-16T10:06:00.000Z' },
    },
  )
  assert(
    legacyRemoteWithoutDisplayPreferences.uiScale === 85
      && legacyRemoteWithoutDisplayPreferences.displayPreferences?.densityMode === 'manual',
    'a legacy remote document without display preferences should keep remote-first ui scale behavior',
  )

  const legacyIncomingWithoutDisplayPreferences = mergeUserDataForStaleSave(
    {
      uiScale: 85,
      displayPreferences: { densityMode: 'auto', updatedAt: '2026-07-16T10:01:00.000Z' },
    },
    { uiScale: 105 },
  )
  assert(
    legacyIncomingWithoutDisplayPreferences.uiScale === 85
      && legacyIncomingWithoutDisplayPreferences.displayPreferences?.densityMode === 'auto',
    'a legacy incoming document without display preferences should keep remote-first ui scale behavior',
  )

  const legacyBothWithoutDisplayPreferences = mergeUserDataForStaleSave(
    { uiScale: 85 },
    { uiScale: 105 },
  )
  assert(
    legacyBothWithoutDisplayPreferences.uiScale === 85
      && legacyBothWithoutDisplayPreferences.displayPreferences === undefined,
    'legacy documents without display preferences should keep remote-first ui scale behavior',
  )

  const forcedStalePreferenceMerge = mergeUserDataForStaleSave(
    {
      nickname: '서버값',
      notes: [{ id: 'draft', title: '초안', content: '서버 초안', fav: false }],
      navigationPreferences: {
        mobileBottomTabs: ['calendar', 'tasks', 'career', 'profile'],
        updatedAt: '2026-07-16T10:01:00.000Z',
      },
    },
    {
      nickname: '로컬 편집',
      notes: [{ id: 'draft', title: '초안', content: '로컬 초안', fav: false }],
      navigationPreferences: {
        mobileBottomTabs: ['notes', 'todos', 'weekly', 'profile'],
        updatedAt: '2026-07-16T10:06:00.000Z',
      },
    },
  )
  assert(
    forcedStalePreferenceMerge.nickname === '서버값'
      && forcedStalePreferenceMerge.notes?.[0]?.content === '서버 초안'
      && forcedStalePreferenceMerge.navigationPreferences?.mobileBottomTabs[0] === 'notes',
    'forced stale merge demonstrates why strict preference saves must retain the cached last-saved baseline',
  )

  const staleSliderWithFreshTimestamp = mergeUserDataForStaleSave(
    {
      uiScale: 90,
      displayPreferences: { densityMode: 'auto', updatedAt: '2026-07-16T10:06:00.000Z' },
    },
    {
      uiScale: 105,
      displayPreferences: { densityMode: 'manual', updatedAt: '2026-07-16T10:07:00.000Z' },
    },
  )
  assert(
    staleSliderWithFreshTimestamp.uiScale === 105
      && staleSliderWithFreshTimestamp.displayPreferences?.densityMode === 'manual',
    'a stale slider save with a fresh display timestamp should win as one setting pair',
  )

  const appContextSource = readFileSync(join(root, 'src/store/AppContext.tsx'), 'utf8')
  const strictSaveSource = appContextSource.match(
    /const saveWithOverridesStrict[\s\S]*?\n  const saveImmediately/,
  )?.[0] ?? ''
  assert(
    /const saved = await saveSyncedUserData\(uid,\s*payload\)/.test(strictSaveSource),
    'strict preference saves should use the cached last-saved baseline',
  )
  assert(
    !/saveSyncedUserData\(uid,\s*payload,\s*true\)/.test(strictSaveSource),
    'strict preference saves should not force stale merge',
  )

  console.log('User data stale-save merge checks passed.')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
