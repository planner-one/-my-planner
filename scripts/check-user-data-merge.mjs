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

  const { mergeUserDataForStaleSave } = await import(pathToFileURL(compiledPath).href)

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
    personalApplications: [
      {
        id: 'double-tomorrow',
        title: '내일두배통장',
        type: 'savings',
        status: 'submitted',
        deadline: '2026-07-20',
        updatedAt: '2026-07-06T09:00:00.000Z',
      },
      {
        id: 'mentor',
        title: '기관 멘토링',
        type: 'mentoring',
        status: 'reviewing',
        updatedAt: '2026-07-06T09:10:00.000Z',
      },
    ],
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
    personalApplications: [
      {
        id: 'double-tomorrow',
        title: '내일두배통장 서류 보완',
        type: 'savings',
        status: 'reviewing',
        nextAction: '추가 서류 제출',
        updatedAt: '2026-07-06T10:04:00.000Z',
      },
      {
        id: 'housing-support',
        title: '청년 주거 지원',
        type: 'housing',
        status: 'preparing',
        updatedAt: '2026-07-06T10:03:00.000Z',
      },
    ],
  }

  const merged = mergeUserDataForStaleSave(remote, staleIncoming)

  assert(merged._lastSaved === staleIncoming._lastSaved, 'merged save should keep the new save timestamp')
  assert(merged.todos.some(todo => todo.id === 'latest-only'), 'remote latest todo should not disappear')
  assert(merged.todos.find(todo => todo.id === 'portfolio')?.done === true, 'stale unchecked state should not clear a completed todo')
  assert(!merged.todos.some(todo => todo.id === 'old-live'), 'old live todo already resolved in history should not be resurrected')
  assert(merged.todoHistory?.length === 1, 'remote todo history should be preserved')
  assert(merged.todoHistory?.[0].done === 1, 'completed remote history should remain completed')
  assert(merged.personalApplications?.length === 3, 'remote and incoming personal applications should be merged')
  assert(
    merged.personalApplications?.find(item => item.id === 'double-tomorrow')?.title === '내일두배통장 서류 보완',
    'newer personal application edit should win during stale-save merge',
  )
  assert(
    merged.personalApplications?.some(item => item.id === 'mentor'),
    'remote-only personal application should not disappear during stale-save merge',
  )

  const blankIncoming = {
    _lastSaved: '2026-07-06T10:06:00.000Z',
    personalApplications: [],
  }
  const mergedBlank = mergeUserDataForStaleSave(remote, blankIncoming)
  assert(
    mergedBlank.personalApplications?.length === remote.personalApplications.length,
    'blank incoming personal applications should not wipe remote records',
  )

  console.log('User data stale-save merge checks passed.')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
