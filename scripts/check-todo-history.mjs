import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tmp = mkdtempSync(join(tmpdir(), 'planner-todo-history-'))

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
      'src/utils/todos.ts',
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

  const compiledPath = findFile(tmp, 'todos.js')
  assert(compiledPath, 'compiled todo utility was not found')

  const {
    syncPastTodoHistory,
    getUnresolvedIncompleteTodos,
    carryIncompleteTodosToDate,
  } = await import(pathToFileURL(compiledPath).href)

  const oldSnapshot = {
    date: '2026-07-03',
    total: 0,
    done: 0,
    completionRate: 0,
    savedAt: '2026-07-03T00:10:00.000Z',
    source: 'manual',
    items: [],
  }

  const laterCheckedPastTodo = {
    id: 'carried-1',
    text: '지원서 수정',
    done: true,
    priority: 'medium',
    category: 'work',
    date: '2026-07-03',
  }

  const synced = syncPastTodoHistory({
    currentDate: '2026-07-04',
    todos: [laterCheckedPastTodo],
    todoHistory: [oldSnapshot],
    savedAt: '2026-07-04T00:00:00.000Z',
  })

  const syncedYesterday = synced.find(result => result.date === '2026-07-03')
  assert(syncedYesterday, 'yesterday history should exist after sync')
  assert(syncedYesterday.total === 1, 'stale existing history should keep a record of the carried todo')
  assert(syncedYesterday.done === 0, 'later checked carry-forward should not complete the original day')
  assert(syncedYesterday.completionRate === 0, 'original missed day should stay incomplete')
  assert(syncedYesterday.items[0].text === '지원서 수정', 'carried todo text should be preserved')
  assert(syncedYesterday.items[0].done === false, 'retroactively discovered todo should be recorded as missed')
  assert(syncedYesterday.source === 'manual', 'existing manual source label should be preserved')

  const correctedSnapshot = {
    ...oldSnapshot,
    correctedAt: '2026-07-04T01:00:00.000Z',
    correctionHistory: [{
      correctedAt: '2026-07-04T01:00:00.000Z',
      note: '사용자가 직접 보정함',
      changes: [],
    }],
  }

  const preserved = syncPastTodoHistory({
    currentDate: '2026-07-04',
    todos: [laterCheckedPastTodo],
    todoHistory: [correctedSnapshot],
    savedAt: '2026-07-04T00:00:00.000Z',
  })

  assert(preserved[0].total === 0, 'corrected history should not be overwritten automatically')

  const missedOnJuly2 = {
    id: 'missed-1',
    text: '지원서 수정',
    done: false,
    priority: 'medium',
    category: 'work',
    date: '2026-07-02',
  }

  const laterDoneHistory = {
    date: '2026-07-03',
    total: 1,
    done: 1,
    completionRate: 100,
    savedAt: '2026-07-04T00:00:00.000Z',
    source: 'auto',
    items: [laterCheckedPastTodo],
  }

  const resolvedOldItems = getUnresolvedIncompleteTodos({
    sourceDate: '2026-07-02',
    items: [missedOnJuly2],
    today: '2026-07-04',
    todoHistory: [laterDoneHistory],
    todos: [],
  })

  assert(resolvedOldItems.length === 0, 'a todo completed on a later day should not be offered again')

  const laterHistoryDoneIsNotCarried = carryIncompleteTodosToDate({
    currentDate: '2026-07-04',
    todos: [missedOnJuly2],
    todoHistory: [laterDoneHistory],
  })

  assert(laterHistoryDoneIsNotCarried.length === 0, 'a stale live todo completed in later history should not be carried forward unchecked')

  const latestStillOpen = getUnresolvedIncompleteTodos({
    sourceDate: '2026-07-03',
    items: [{ ...laterCheckedPastTodo, id: 'carried-open', done: false }],
    today: '2026-07-04',
    todoHistory: [],
    todos: [],
  })

  assert(latestStillOpen.length === 1, 'latest incomplete occurrence should still be importable')

  const autoCarried = carryIncompleteTodosToDate({
    currentDate: '2026-07-05',
    todos: [
      {
        id: 'old-open',
        text: '포트폴리오 수정',
        done: false,
        priority: 'medium',
        category: 'work',
        date: '2026-07-04',
      },
      {
        id: 'old-done',
        text: '완료된 일',
        done: true,
        priority: 'medium',
        category: 'work',
        date: '2026-07-04',
      },
    ],
  })

  assert(autoCarried.length === 2, 'one incomplete past todo should be moved to current date')
  assert(autoCarried[0].id === 'old-open__carry__2026-07-05', 'auto-carried todo should get a new occurrence id')
  assert(autoCarried[0].date === '2026-07-05', 'auto-carried todo should be dated as current date')
  assert(!autoCarried.some(todo => todo.id === 'old-open' && todo.date === '2026-07-04'), 'original past occurrence should not remain in live todos')

  const notDuplicated = carryIncompleteTodosToDate({
    currentDate: '2026-07-05',
    todos: autoCarried,
  })

  assert(notDuplicated.length === autoCarried.length, 'auto carry should not duplicate an item already on current date')

  const cleanupManualDuplicate = carryIncompleteTodosToDate({
    currentDate: '2026-07-05',
    todos: [
      {
        id: 'manual-original',
        text: '포트폴리오 수정',
        done: false,
        priority: 'medium',
        category: 'work',
        date: '2026-07-04',
      },
      {
        id: 'manual-copy',
        text: '포트폴리오 수정',
        done: false,
        priority: 'medium',
        category: 'work',
        date: '2026-07-05',
      },
    ],
  })

  assert(cleanupManualDuplicate.length === 1, 'older duplicate should be removed when a later occurrence exists')
  assert(cleanupManualDuplicate[0].id === 'manual-copy', 'latest occurrence should be kept')

  const missedHistory = syncPastTodoHistory({
    currentDate: '2026-07-05',
    todos: [{
      id: 'missed-yesterday',
      text: '전날 못한 일',
      done: false,
      priority: 'medium',
      category: 'work',
      date: '2026-07-04',
    }],
    todoHistory: [],
    savedAt: '2026-07-05T00:00:00.000Z',
  })
  const carriedMissed = carryIncompleteTodosToDate({
    currentDate: '2026-07-05',
    todos: [{
      id: 'missed-yesterday',
      text: '전날 못한 일',
      done: false,
      priority: 'medium',
      category: 'work',
      date: '2026-07-04',
    }],
    todoHistory: missedHistory,
  })
  const completedAfterCarry = carriedMissed.map(todo => ({ ...todo, done: true }))
  const historyAfterTodayCompletion = syncPastTodoHistory({
    currentDate: '2026-07-05',
    todos: completedAfterCarry,
    todoHistory: missedHistory,
    savedAt: '2026-07-05T08:00:00.000Z',
  })
  const preservedMissedDay = historyAfterTodayCompletion.find(result => result.date === '2026-07-04')
  assert(preservedMissedDay?.done === 0, 'completing the carried todo today should not complete yesterday history')
  assert(preservedMissedDay?.items[0].done === false, 'yesterday item should remain unchecked after carry-forward completion')

  const repairedExistingWrongHistory = syncPastTodoHistory({
    currentDate: '2026-07-05',
    todos: [{
      id: 'same-id-carry',
      text: '이미 잘못 완료 처리된 이월 항목',
      done: true,
      priority: 'medium',
      category: 'work',
      date: '2026-07-05',
    }],
    todoHistory: [{
      date: '2026-07-04',
      total: 1,
      done: 1,
      completionRate: 100,
      savedAt: '2026-07-05T00:00:00.000Z',
      source: 'auto',
      items: [{
        id: 'same-id-carry',
        text: '이미 잘못 완료 처리된 이월 항목',
        done: true,
        priority: 'medium',
        category: 'work',
        date: '2026-07-04',
      }],
    }],
    savedAt: '2026-07-05T09:00:00.000Z',
  })
  const repairedWrongDay = repairedExistingWrongHistory.find(result => result.date === '2026-07-04')
  assert(repairedWrongDay?.done === 0, 'existing history completed by same-id carry should be repaired as missed')
  assert(repairedWrongDay?.items[0].done === false, 'same-id carried history item should be unchecked after repair')

  const correctedDoneIsNotCarried = carryIncompleteTodosToDate({
    currentDate: '2026-07-05',
    todos: [
      {
        id: 'corrected-old-open',
        text: '기록에서 완료로 보정된 일',
        done: false,
        priority: 'medium',
        category: 'work',
        date: '2026-07-04',
      },
    ],
    todoHistory: [{
      date: '2026-07-04',
      total: 1,
      done: 1,
      completionRate: 100,
      savedAt: '2026-07-05T00:00:00.000Z',
      source: 'manual',
      correctedAt: '2026-07-05T00:10:00.000Z',
      correctionHistory: [{
        correctedAt: '2026-07-05T00:10:00.000Z',
        note: '완료로 보정',
        changes: [],
      }],
      items: [{
        id: 'corrected-old-open',
        text: '기록에서 완료로 보정된 일',
        done: true,
        priority: 'medium',
        category: 'work',
        date: '2026-07-04',
      }],
    }],
  })

  assert(correctedDoneIsNotCarried.length === 0, 'todo completed through correction should not be carried forward')

  console.log('Todo history carry-forward checks passed.')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
