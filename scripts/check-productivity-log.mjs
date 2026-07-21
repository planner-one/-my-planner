import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tmp = mkdtempSync(join(tmpdir(), 'planner-productivity-log-'))

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
      'src/utils/productivity.ts',
      'src/utils/productivityCategories.ts',
      'src/utils/counters.ts',
      'src/utils/habits.ts',
      'src/utils/date.ts',
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

  const compiledPath = findFile(tmp, 'productivity.js')
  assert(compiledPath, 'compiled productivity utility was not found')
  const compiledCountersPath = findFile(tmp, 'counters.js')
  assert(compiledCountersPath, 'compiled counters utility was not found')
  const compiledHabitsPath = findFile(tmp, 'habits.js')
  assert(compiledHabitsPath, 'compiled habits utility was not found')
  const compiledCategoriesPath = findFile(tmp, 'productivityCategories.js')
  assert(compiledCategoriesPath, 'compiled productivity categories utility was not found')

  writeFileSync(
    compiledPath,
    readFileSync(compiledPath, 'utf8')
      .replaceAll("from './counters'", "from './counters.js'")
      .replaceAll("from './habits'", "from './habits.js'")
      .replaceAll("from './date'", "from './date.js'")
      .replaceAll("from './productivityCategories'", "from './productivityCategories.js'"),
  )
  writeFileSync(
    compiledCountersPath,
    readFileSync(compiledCountersPath, 'utf8')
      .replaceAll("from './date'", "from './date.js'"),
  )
  writeFileSync(
    compiledHabitsPath,
    readFileSync(compiledHabitsPath, 'utf8')
      .replaceAll("from './date'", "from './date.js'")
      .replaceAll("from './productivityCategories'", "from './productivityCategories.js'"),
  )

  const {
    getProductivityDayLog,
    getProductivityPeriodRange,
    getProductivityPeriodSummary,
    getRecentDateKeys,
  } = await import(pathToFileURL(compiledPath).href)
  const {
    getProductivityTimeMinutes,
    getScheduledTaskSuggestedMinutes,
    mergeProductivityTimeHistory,
    normalizeProductivityCategory,
    updateProductivityLinkedTimeEntry,
    updateProductivityTimeBucket,
  } = await import(pathToFileURL(compiledCategoriesPath).href)
  const { migrateHabits } = await import(pathToFileURL(compiledHabitsPath).href)

  const today = getRecentDateKeys(1)[0]
  const log = getProductivityDayLog({
    date: today,
    todos: [
      { id: 'todo-done', text: '완료 Todo', done: true, priority: 'high', category: 'work', date: today },
      { id: 'todo-open', text: '남은 Todo', done: false, priority: 'medium', category: 'study', date: today },
    ],
    todoHistory: [],
    habits: [
      { id: 'habit-done', name: '물 마시기', icon: '물', repeatDays: [0, 1, 2, 3, 4, 5, 6], createdAt: today },
      { id: 'habit-open', name: '독서', icon: '책', repeatDays: [0, 1, 2, 3, 4, 5, 6], createdAt: today },
    ],
    habitHistory: {
      [today]: {
        'habit-done': true,
        'habit-open': false,
      },
    },
    scheduledTasks: [
      { id: 'schedule-done', title: '완료 일정', date: today, done: true, time: '10:00' },
      { id: 'schedule-open', title: '남은 일정', date: today, done: false, time: '14:00' },
    ],
    counters: [
      { id: 'focus-sessions', name: '집중 세션', unit: '회', period: 'daily', value: 2, dateKey: today, autoKey: 'pomodoro-focus' },
    ],
    productivityTimeHistory: {
      [today]: {
        work: { manualMinutes: 30, focusSessions: 0, updatedAt: today + 'T08:00:00.000Z' },
      },
    },
    tasks: [
      { id: 'task-done', name: '마감 작업', due: today, done: true, status: '완료' },
    ],
    goals: [
      { id: 'goal-open', name: '마감 목표', due: today, pct: 40, steps: [] },
    ],
    projects: [],
    topGoals: [
      { id: 'direction', text: '하루 방향', done: true, date: today },
    ],
    reviewHistory: [
      { date: today, r1: '한 일', r2: '', r3: '', updatedAt: `${today}T10:00:00.000Z` },
    ],
    journal: [
      { date: today, title: '오늘 기록', mood: '뿌듯' },
    ],
    timeBlockData: {
      [today]: {
        '09:00': '준비',
      },
    },
  })

  assert(log.score?.score === 50, 'score should average four 50% productivity parts')
  assert(log.sections.find(section => section.id === 'todos')?.done === 1, 'todo section should count completed todos')
  assert(log.sections.find(section => section.id === 'habits')?.total === 2, 'habit section should include scheduled habits')
  assert(log.sections.find(section => section.id === 'focus')?.done === 2, 'focus section should count focus sessions')
  assert(log.sections.find(section => section.id === 'deadlines')?.total === 2, 'deadline section should include due tasks and goals')
  assert(log.sections.find(section => section.id === 'journal')?.items[0]?.title === '오늘 기록', 'journal section should show journal title')

  const weeklyRange = getProductivityPeriodRange('week', '2026-07-08')
  assert(weeklyRange.startDate === '2026-07-06', 'week should start on Monday')
  assert(weeklyRange.endDate === '2026-07-12', 'week should end on Sunday')

  const monthlyRange = getProductivityPeriodRange('month', '2026-07-21')
  assert(monthlyRange.startDate === '2026-07-01', 'month should start on day 1')
  assert(monthlyRange.endDate === '2026-07-31', 'month should end on its last day')

  const makeTodoResult = (date, items) => ({
    date,
    total: items.length,
    done: items.filter(item => item.done).length,
    completionRate: items.length ? Math.round((items.filter(item => item.done).length / items.length) * 100) : 0,
    savedAt: `${date}T23:59:00.000Z`,
    source: 'auto',
    items,
  })
  const periodInput = {
    anchorDate: '2026-07-08',
    today: '2026-07-09',
    todos: [],
    todoHistory: [
      makeTodoResult('2026-07-06', [
        { id: 'work-done', text: '업무 완료', done: true, priority: 'high', category: 'work', date: '2026-07-06' },
        { id: 'study-open', text: '공부 미완료', done: false, priority: 'medium', category: 'study', date: '2026-07-06' },
      ]),
      makeTodoResult('2026-07-07', [
        { id: 'legacy-open', text: '기존 미분류', done: false, priority: 'low', date: '2026-07-07' },
      ]),
    ],
    habits: [{
      id: 'exercise-habit',
      name: '운동',
      category: 'exercise',
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
      createdAt: '2026-07-06T08:00:00.000Z',
    }],
    habitHistory: {
      '2026-07-06': { 'exercise-habit': true },
    },
    scheduledTasks: [
      { id: 'personal-done', title: '개인 일정', date: '2026-07-08', category: 'personal', done: true },
      { id: 'future-work', title: '미래 업무', date: '2026-07-10', category: 'work', done: false },
    ],
    counters: [],
    productivityTimeHistory: {
      '2026-07-06': {
        work: {
          manualMinutes: 30,
          focusSessions: 1,
          updatedAt: '2026-07-06T12:00:00.000Z',
        },
      },
    },
  }
  const weekly = getProductivityPeriodSummary({ ...periodInput, mode: 'week' })
  assert(weekly.days.length === 7, 'weekly summary should contain Monday through Sunday')
  assert(weekly.groups.length === 7, 'weekly flow should group by day')
  assert(weekly.categories.work.done === 1 && weekly.categories.work.total === 1, 'future work should be excluded from completion totals')
  assert(weekly.categories.study.rate === 0, 'incomplete study should have a 0% rate')
  assert(weekly.categories.exercise.done === 1 && weekly.categories.exercise.total === 4, 'missed scheduled habits should remain in the denominator')
  assert(weekly.categories.personal.rate === 100, 'completed personal schedule should have a 100% rate')
  assert(weekly.categories.uncategorized.total === 1, 'legacy items without a category should remain visible as uncategorized')
  assert(weekly.categories.work.totalMinutes === 55, 'manual and focus time should be combined without affecting completion counts')
  assert(weekly.days.find(day => day.date === '2026-07-10')?.isFuture === true, 'future days should be marked')
  assert(weekly.days.find(day => day.date === '2026-07-10')?.categories.work.total === 0, 'future activity should not enter the denominator')

  const monthly = getProductivityPeriodSummary({ ...periodInput, mode: 'month' })
  assert(monthly.days.length === 31, 'July monthly summary should contain 31 days')
  assert(monthly.groups.length === 5, 'July 2026 should be grouped into five Monday-based calendar rows')
  assert(monthly.categories.work.total === 1, 'monthly summary should also exclude future work')
  assert(monthly.categories.work.rate === 100, 'monthly category rate should aggregate completed and total counts')
  assert(monthly.categories.personal.total === 1, 'monthly summary should include scheduled activity')
  assert(monthly.categories.personal.rate === 100, 'monthly scheduled completion should retain its category rate')
  assert(monthly.categories.work.focusSessions === 1, 'monthly time totals should include categorized focus sessions')
  assert(monthly.categories.personal.manualMinutes === 0, 'empty time fields should remain zero')
  assert(monthly.categories.personal.totalMinutes === 0, 'completion data must not fabricate time data')

  assert(normalizeProductivityCategory(undefined) === 'uncategorized', 'missing legacy categories should normalize to uncategorized')
  const migratedHabits = migrateHabits([
    { id: 'default-habit-3', name: '운동', createdAt: '2026-07-01T08:00:00.000Z' },
    { id: 'custom-habit', name: '사용자 루틴', createdAt: '2026-07-01T08:00:00.000Z' },
  ], {}, true)
  assert(migratedHabits.habits[0].category === 'exercise', 'stable default habit IDs should receive deterministic categories')
  assert(migratedHabits.habits[1].category === 'uncategorized', 'custom legacy habits should not be guessed')
  const updatedTime = updateProductivityTimeBucket({}, '2026-07-09', 'study', current => ({
    manualMinutes: current.manualMinutes + 45,
  }), '2026-07-09T09:00:00.000Z')
  assert(updatedTime['2026-07-09'].study.manualMinutes === 45, 'manual time should update by date and category')
  const focusedTime = updateProductivityTimeBucket({}, '2026-07-09', 'exercise', current => ({
    focusSessions: current.focusSessions + 1,
  }), '2026-07-09T09:00:00.000Z')
  assert(focusedTime['2026-07-09'].exercise.focusSessions === 1, 'a categorized focus completion should add one session')
  assert(getProductivityTimeMinutes(focusedTime['2026-07-09'].exercise) === 25, 'one focus session should add 25 categorized minutes')
  assert(
    getScheduledTaskSuggestedMinutes({ time: '09:30', endTime: '11:00' }) === 90,
    'a valid scheduled range should suggest its planned duration',
  )
  assert(
    getScheduledTaskSuggestedMinutes({ time: '11:00', endTime: '09:30' }) === null,
    'an invalid scheduled range should not fabricate a duration',
  )
  const linkedTime = updateProductivityLinkedTimeEntry(
    updatedTime,
    '2026-07-09',
    'study',
    { sourceType: 'scheduled', sourceId: 'schedule-study', title: '강의 복습' },
    current => current + 50,
    '2026-07-09T09:10:00.000Z',
  )
  assert(
    linkedTime['2026-07-09'].study.linkedEntries?.['scheduled:schedule-study']?.minutes === 50,
    'scheduled time should keep its source id and title snapshot in the selected date/category bucket',
  )
  assert(
    getProductivityTimeMinutes(linkedTime['2026-07-09'].study) === 95,
    'manual and scheduled-linked time should remain separate while contributing to the total',
  )
  const mergedTime = mergeProductivityTimeHistory(
    {
      '2026-07-09': {
        study: { manualMinutes: 15, focusSessions: 0, updatedAt: '2026-07-09T08:00:00.000Z' },
      },
    },
    updatedTime,
  )
  assert(mergedTime['2026-07-09'].study.manualMinutes === 45, 'newer date/category time buckets should win multi-tab merges')
  const mergedLinkedTime = mergeProductivityTimeHistory(
    {
      '2026-07-09': {
        work: {
          manualMinutes: 30,
          focusSessions: 0,
          linkedEntries: {
            'scheduled:remote': { sourceType: 'scheduled', sourceId: 'remote', title: '원격 일정', minutes: 20, updatedAt: '2026-07-09T10:01:00.000Z' },
            'scheduled:shared': { sourceType: 'scheduled', sourceId: 'shared', title: '공통 일정', minutes: 15, updatedAt: '2026-07-09T10:02:00.000Z' },
          },
          updatedAt: '2026-07-09T10:03:00.000Z',
        },
      },
    },
    {
      '2026-07-09': {
        work: {
          manualMinutes: 45,
          focusSessions: 0,
          linkedEntries: {
            'scheduled:incoming': { sourceType: 'scheduled', sourceId: 'incoming', title: '로컬 일정', minutes: 25, updatedAt: '2026-07-09T10:04:00.000Z' },
            'scheduled:shared': { sourceType: 'scheduled', sourceId: 'shared', title: '공통 일정', minutes: 35, updatedAt: '2026-07-09T10:05:00.000Z' },
          },
          updatedAt: '2026-07-09T10:05:00.000Z',
        },
      },
    },
  )
  assert(
    mergedLinkedTime['2026-07-09'].work.linkedEntries?.['scheduled:remote']?.minutes === 20
      && mergedLinkedTime['2026-07-09'].work.linkedEntries?.['scheduled:incoming']?.minutes === 25,
    'different scheduled sources should survive a stale multi-tab merge',
  )
  assert(
    mergedLinkedTime['2026-07-09'].work.linkedEntries?.['scheduled:shared']?.minutes === 35,
    'the newest update should win only for the same scheduled source',
  )

  const pageSource = readFileSync(join(root, 'src/pages/ProductivityLog.tsx'), 'utf8')
  const pomodoroSource = readFileSync(join(root, 'src/widgets/PomodoroWidget.tsx'), 'utf8')
  const timeModalSource = readFileSync(join(root, 'src/components/ProductivityTimeModal.tsx'), 'utf8')
  const scheduleTimeButtonSource = readFileSync(join(root, 'src/components/ScheduledTaskTimeButton.tsx'), 'utf8')
  assert(/useState<'day' \| 'week' \| 'month'>\('week'\)/.test(pageSource), 'productivity page should always enter on the current week tab')
  assert(pageSource.includes('<ProductivityPeriodView'), 'productivity page should render period analysis')
  assert(pageSource.includes('<ProductivityTimeModal'), 'productivity page should expose the separate time modal')
  assert(pageSource.includes('<ProductivityCategoryModal'), 'productivity page should expose classification management')
  assert(pomodoroSource.includes('pomodoro_productivity_category'), 'pomodoro should remember the last selected category')
  assert(pomodoroSource.includes('focusSessions: bucket.focusSessions + 1'), 'pomodoro completion should increment categorized focus sessions')
  assert(timeModalSource.includes('linked-time-records'), 'time modal should distinguish and edit scheduled-linked time')
  assert(scheduleTimeButtonSource.includes('실제 소요 시간'), 'scheduled tasks should require the user to confirm actual time')
  assert(scheduleTimeButtonSource.includes('getScheduledTaskSuggestedMinutes'), 'planned schedule duration should only be used as an input suggestion')
  assert(
    ['max-width: 960px', 'max-width: 768px', 'max-width: 640px', 'max-width: 420px']
      .every(marker => pageSource.includes(marker)),
    'productivity tabs, charts, and modals should keep explicit desktop, tablet, and mobile breakpoints',
  )
  const categoryEntryFiles = [
    ['src/components/OnboardingGuide.tsx', 'PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED'],
    ['src/pages/DailyPlanner.tsx', 'PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED'],
    ['src/pages/HabitTracker.tsx', 'PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED'],
    ['src/pages/CalendarPage.tsx', 'PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED'],
    ['src/widgets/HabitWidget.tsx', 'PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED'],
    ['src/widgets/ScheduledTaskWidget.tsx', 'PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED'],
    ['src/widgets/CalendarWidget.tsx', 'PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED'],
    ['src/pages/TodoPage.tsx', "exercise: { label: '운동'"],
    ['src/widgets/TodoWidget.tsx', "exercise: { label: '운동'"],
  ]
  categoryEntryFiles.forEach(([file, marker]) => {
    assert(readFileSync(join(root, file), 'utf8').includes(marker), `${file} should expose the shared productivity categories`)
  })
  ;[
    'src/pages/DailyPlanner.tsx',
    'src/pages/CalendarPage.tsx',
    'src/widgets/ScheduledTaskWidget.tsx',
    'src/widgets/CalendarWidget.tsx',
  ].forEach(file => {
    assert(
      readFileSync(join(root, file), 'utf8').includes('<ScheduledTaskTimeButton'),
      `${file} should expose scheduled task time entry`,
    )
  })

  console.log('Productivity day, period, category, and time checks passed.')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
