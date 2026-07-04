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

  const carriedAndChecked = {
    id: 'carried-1',
    text: '지원서 수정',
    done: true,
    priority: 'medium',
    category: 'work',
    date: '2026-07-03',
  }

  const synced = syncPastTodoHistory({
    currentDate: '2026-07-04',
    todos: [carriedAndChecked],
    todoHistory: [oldSnapshot],
    savedAt: '2026-07-04T00:00:00.000Z',
  })

  const syncedYesterday = synced.find(result => result.date === '2026-07-03')
  assert(syncedYesterday, 'yesterday history should exist after sync')
  assert(syncedYesterday.total === 1, 'stale existing history should be updated with carried todo')
  assert(syncedYesterday.done === 1, 'checked carried todo should remain checked in history')
  assert(syncedYesterday.items[0].text === '지원서 수정', 'carried todo text should be preserved')
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
    todos: [carriedAndChecked],
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
    items: [carriedAndChecked],
  }

  const resolvedOldItems = getUnresolvedIncompleteTodos({
    sourceDate: '2026-07-02',
    items: [missedOnJuly2],
    today: '2026-07-04',
    todoHistory: [laterDoneHistory],
    todos: [],
  })

  assert(resolvedOldItems.length === 0, 'a todo completed on a later day should not be offered again')

  const latestStillOpen = getUnresolvedIncompleteTodos({
    sourceDate: '2026-07-03',
    items: [{ ...carriedAndChecked, id: 'carried-open', done: false }],
    today: '2026-07-04',
    todoHistory: [],
    todos: [],
  })

  assert(latestStillOpen.length === 1, 'latest incomplete occurrence should still be importable')

  console.log('Todo history carry-forward checks passed.')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
