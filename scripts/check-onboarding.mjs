import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'

const repoRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(repoRoot, 'src/utils/onboarding.ts')
const tempDir = path.join(os.tmpdir(), 'planner-onboarding-check')
const tempModulePath = path.join(tempDir, 'onboarding.mjs')

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
  GENERIC_STARTER_WIDGET_IDS,
  ONBOARDING_PURPOSE_CONFIGS,
  ONBOARDING_PURPOSES,
  STARTER_DASHBOARD_COLUMNS,
  STARTER_WIDGET_DEFAULTS,
  buildStarterDashboard,
  getOnboardingPurposeConfig,
  resolveInitialOnboardingState,
} = await import(`${tempModulePath}?t=${Date.now()}`)

const now = '2026-07-14T09:00:00.000Z'
const pending = resolveInitialOnboardingState(null, now)
assert.equal(pending?.status, 'pending', 'missing user document should start onboarding')
assert.equal(pending?.startedAt, now, 'new onboarding should keep its detection timestamp')
assert.equal(
  resolveInitialOnboardingState({}, now),
  null,
  'legacy user document without onboarding state should not auto-open onboarding',
)
const completedState = {
  version: 1,
  status: 'completed',
  purpose: 'daily',
  startedAt: now,
  updatedAt: now,
  completedAt: now,
}
assert.equal(
  resolveInitialOnboardingState({ onboarding: completedState }, now),
  completedState,
  'stored onboarding state should be restored as-is',
)

const expectedPurposes = {
  daily: {
    label: '일상 관리',
    widgetIds: ['todo', 'calendar', 'habit', 'memo', 'review'],
  },
  workStudy: {
    label: '업무·학습',
    widgetIds: ['workOverview', 'todo', 'calendar', 'scheduled', 'pomodoro', 'goal'],
  },
  jobSearch: {
    label: '취업 준비',
    widgetIds: ['calendar', 'todo', 'workOverview', 'menu', 'memo'],
  },
  opportunity: {
    label: '기회·신청 관리',
    widgetIds: ['calendar', 'todo', 'menu', 'goal', 'memo'],
  },
}

const expectedWidgetDefaults = {
  todo: ['오늘 할 일', 8, 7, 4, 4, 'TodoWidget.tsx'],
  calendar: ['캘린더', 16, 11, 10, 7, 'CalendarWidget.tsx'],
  habit: ['일일 루틴', 7, 7, 4, 3, 'HabitWidget.tsx'],
  memo: ['빠른 메모', 8, 6, 4, 3, 'MemoWidget.tsx'],
  review: ['하루 마무리', 8, 8, 5, 5, 'ReviewWidget.tsx'],
  workOverview: ['작업 흐름', 12, 7, 7, 5, 'WorkOverviewWidget.tsx'],
  scheduled: ['예정된 작업', 8, 7, 4, 4, 'ScheduledTaskWidget.tsx'],
  pomodoro: ['집중 타이머', 7, 6, 4, 4, 'PomodoroWidget.tsx'],
  goal: ['목표', 8, 7, 5, 4, 'GoalWidget.tsx'],
  menu: ['메뉴', 6, 8, 4, 4, 'MenuWidget.tsx'],
}

assert.equal(STARTER_DASHBOARD_COLUMNS, 48, 'starter dashboard should use 48 columns')
assert.deepEqual(
  ONBOARDING_PURPOSES.map(config => config.purpose),
  Object.keys(expectedPurposes),
  'purpose configs should keep the approved order',
)

for (const [purpose, expected] of Object.entries(expectedPurposes)) {
  const config = getOnboardingPurposeConfig(purpose)
  assert.equal(config, ONBOARDING_PURPOSE_CONFIGS[purpose], `${purpose} lookup should return its config`)
  assert.equal(config.label, expected.label, `${purpose} should keep its Korean label`)
  assert.ok(config.description.trim(), `${purpose} should have a Korean description`)
  assert.ok(config.firstItemDescription.trim(), `${purpose} should describe the first item`)
  assert.deepEqual(config.widgetIds, expected.widgetIds, `${purpose} should keep its approved widget sequence`)
}

assert.deepEqual(
  GENERIC_STARTER_WIDGET_IDS,
  ['todo', 'calendar', 'memo', 'habit', 'menu'],
  'skipped onboarding should use the generic preset',
)

const readMeta = sourceText => {
  const block = sourceText.match(/export const meta = \{([\s\S]*?)\n\}/)?.[1] ?? ''
  const stringValue = key => block.match(new RegExp(`${key}:\\s*'([^']+)'`))?.[1]
  const numberValue = key => Number(block.match(new RegExp(`${key}:\\s*(\\d+)`))?.[1])
  return {
    id: stringValue('id'),
    name: stringValue('name'),
    defaultW: numberValue('defaultW'),
    defaultH: numberValue('defaultH'),
    minW: numberValue('minW'),
    minH: numberValue('minH'),
  }
}

for (const [widgetId, [name, defaultW, defaultH, minW, minH, fileName]] of Object.entries(expectedWidgetDefaults)) {
  const expected = { id: widgetId, name, defaultW, defaultH, minW, minH }
  assert.deepEqual(STARTER_WIDGET_DEFAULTS[widgetId], expected, `${widgetId} defaults should remain stable`)

  const widgetSource = await readFile(path.join(repoRoot, 'src/widgets', fileName), 'utf8')
  assert.deepEqual(
    STARTER_WIDGET_DEFAULTS[widgetId],
    readMeta(widgetSource),
    `${widgetId} starter defaults should match its widget meta`,
  )
}

const hasOverlap = (left, right) =>
  left.x < right.x + right.w
  && left.x + left.w > right.x
  && left.y < right.y + right.h
  && left.y + left.h > right.y

const assertDashboard = (purpose, expectedIds) => {
  const first = buildStarterDashboard(purpose)
  const second = buildStarterDashboard(purpose)

  assert.deepEqual(first, second, `${purpose ?? 'generic'} layout should be deterministic`)
  assert.deepEqual(
    first.dashboardActive,
    expectedIds.map(widgetId => `${widgetId}-starter-v1`),
    `${purpose ?? 'generic'} should use stable instance ids`,
  )
  assert.equal(first.dashboardLayout.length, expectedIds.length)
  assert.equal(new Set(first.dashboardActive).size, expectedIds.length, 'instance ids should be unique')

  let expectedX = 0
  let expectedY = 0
  let expectedRowHeight = 0

  first.dashboardLayout.forEach((item, index) => {
    const widgetId = expectedIds[index]
    const meta = STARTER_WIDGET_DEFAULTS[widgetId]

    if (expectedX > 0 && expectedX + meta.defaultW > STARTER_DASHBOARD_COLUMNS) {
      expectedX = 0
      expectedY += expectedRowHeight
      expectedRowHeight = 0
    }

    assert.deepEqual(
      item,
      {
        i: `${widgetId}-starter-v1`,
        x: expectedX,
        y: expectedY,
        w: meta.defaultW,
        h: meta.defaultH,
        minW: meta.minW,
        minH: meta.minH,
      },
      `${purpose ?? 'generic'} ${widgetId} should use deterministic row packing`,
    )
    assert.ok(item.x >= 0 && item.x + item.w <= STARTER_DASHBOARD_COLUMNS, `${widgetId} should stay in bounds`)
    assert.ok(item.w >= item.minW && item.h >= item.minH, `${widgetId} should satisfy minimum dimensions`)

    for (const previous of first.dashboardLayout.slice(0, index)) {
      assert.equal(hasOverlap(previous, item), false, `${previous.i} and ${item.i} should not overlap`)
    }

    expectedX += meta.defaultW
    expectedRowHeight = Math.max(expectedRowHeight, meta.defaultH)
  })
}

for (const [purpose, expected] of Object.entries(expectedPurposes)) {
  assertDashboard(purpose, expected.widgetIds)
}
assertDashboard(undefined, GENERIC_STARTER_WIDGET_IDS)

console.log('✓ onboarding preset and layout checks passed')
