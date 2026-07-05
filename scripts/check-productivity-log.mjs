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

  writeFileSync(
    compiledPath,
    readFileSync(compiledPath, 'utf8')
      .replaceAll("from './counters'", "from './counters.js'")
      .replaceAll("from './habits'", "from './habits.js'")
      .replaceAll("from './date'", "from './date.js'"),
  )
  writeFileSync(
    compiledCountersPath,
    readFileSync(compiledCountersPath, 'utf8')
      .replaceAll("from './date'", "from './date.js'"),
  )

  const {
    getProductivityDayLog,
    getRecentDateKeys,
  } = await import(pathToFileURL(compiledPath).href)

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

  console.log('Productivity day log checks passed.')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
