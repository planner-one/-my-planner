import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tmp = mkdtempSync(join(tmpdir(), 'planner-briefing-'))

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
      'src/utils/plannerBriefing.ts',
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

  const compiledPath = findFile(tmp, 'plannerBriefing.js')
  assert(compiledPath, 'compiled briefing utility was not found')

  const {
    getPlannerDayBriefing,
    formatPlannerBriefingLines,
  } = await import(pathToFileURL(compiledPath).href)

  const briefing = getPlannerDayBriefing({
    todos: [
      { id: 'todo-tomorrow', text: '지원서 맞춤 수정', done: false, priority: 'high', category: 'work', date: '2026-07-06' },
      { id: 'todo-done', text: '이미 끝낸 일', done: true, priority: 'low', category: 'personal', date: '2026-07-06' },
      { id: 'todo-legacy', text: '날짜 없는 오늘 항목', done: false, priority: 'medium', category: 'study' },
    ],
    topGoals: [
      { id: 'direction', text: '오전에는 지원 준비에 집중', done: false, date: '2026-07-06' },
    ],
    scheduledTasks: [
      { id: 'schedule', title: '포트폴리오 점검', date: '2026-07-06', time: '10:30', done: false },
      { id: 'schedule-done', title: '완료된 미래 일정', date: '2026-07-06', done: true },
    ],
    careerEvents: [
      {
        id: 'career',
        title: '채용 설명회',
        category: 'briefing',
        status: 'planned',
        date: '2026-07-05',
        applicationDeadline: '2026-07-06',
      },
    ],
    personalApplications: [
      {
        id: 'application',
        title: '청년 지원사업',
        type: 'youth_support',
        status: 'preparing',
        deadline: '2026-07-06',
        nextAction: '서류 업로드',
      },
      {
        id: 'application-cancelled',
        title: '취소된 신청',
        type: 'other',
        status: 'cancelled',
        deadline: '2026-07-06',
      },
    ],
    jobPostings: [
      {
        id: 'job',
        company: '테스트랩',
        position: '프론트엔드',
        platform: 'wanted',
        status: 'preparing',
        deadline: '2026-07-06',
      },
      {
        id: 'job-closed',
        company: '닫힌회사',
        position: '백엔드',
        platform: 'other',
        status: 'closed',
        deadline: '2026-07-06',
      },
    ],
    tasks: [
      { id: 'task', name: '이력서 문장 다듬기', due: '2026-07-06', done: false, status: '진행 중' },
    ],
    goals: [
      { id: 'goal', name: '취업 준비', due: '2026-07-06', pct: 40, steps: [] },
    ],
    projects: [
      { id: 'project', name: '포트폴리오', due: '2026-07-06', pct: 20, steps: [] },
    ],
  }, '2026-07-06', '2026-07-05')

  assert(briefing.total === 9, 'tomorrow briefing should include every open next-day source')
  assert(briefing.summary.todos === 1, 'completed and legacy today todos should not count for tomorrow')
  assert(briefing.summary.schedules === 2, 'scheduled tasks and career milestones should count as schedules')
  assert(briefing.summary.deadlines === 5, 'deadline count should include work and application/job deadlines')
  assert(briefing.summary.applications === 2, 'applications summary should include personal applications and job postings')

  const lines = formatPlannerBriefingLines(briefing)
  assert(lines.some(line => line.includes('[Todo]')), 'formatted briefing should include Todo section')
  assert(lines.some(line => line.includes('테스트랩')), 'formatted briefing should include job posting title')

  console.log('Planner briefing checks passed.')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
