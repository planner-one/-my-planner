import { useMemo } from 'react'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { toLocalDateKey } from '../utils/date'
import { getTodayTopGoals, sortPriorityGoals } from '../utils/goals'
import { sortProjects } from '../utils/projects'

const daysUntil = (date?: string) => {
  if (!date) return Number.POSITIVE_INFINITY
  const today = new Date(`${toLocalDateKey()}T12:00:00`).getTime()
  const target = new Date(`${date}T12:00:00`).getTime()
  return Math.ceil((target - today) / 86400000)
}

const dueLabel = (date?: string) => {
  const diff = daysUntil(date)
  if (!Number.isFinite(diff)) return '마감 없음'
  if (diff < 0) return `${Math.abs(diff)}일 지남`
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  return `${diff}일 남음`
}

export const meta = {
  id: 'workOverview',
  name: '작업 흐름',
  icon: '🧭',
  defaultW: 12,
  defaultH: 7,
  minW: 7,
  minH: 5,
  order: 10,
}

export default function WorkOverviewWidget() {
  const { tasks, projects, goals, topGoals } = useApp()
  const { setPage } = useRouter()

  const activeTasks = tasks.filter(task => !task.done && task.status !== '완료')
  const activeProjects = projects.filter(project => project.status !== '완료' && project.pct < 100)
  const activeGoals = goals.filter(goal => goal.status !== '완료' && goal.pct < 100)
  const todayTopGoals = getTodayTopGoals(topGoals)
  const focusDone = todayTopGoals.filter(goal => goal.done).length
  const projectAvg = activeProjects.length === 0
    ? 0
    : Math.round(activeProjects.reduce((sum, project) => sum + project.pct, 0) / activeProjects.length)
  const goalAvg = activeGoals.length === 0
    ? 0
    : Math.round(activeGoals.reduce((sum, goal) => sum + goal.pct, 0) / activeGoals.length)

  const nextItems = useMemo(() => {
    const taskItems = activeTasks.map(task => ({
      key: `task-${task.id}`,
      type: '작업',
      title: task.name,
      due: task.due,
      page: 'tasks' as const,
      pct: task.status === '대기' ? 0 : 35,
    }))
    const projectItems = sortProjects(activeProjects).map(project => ({
      key: `project-${project.id}`,
      type: '프로젝트',
      title: project.name,
      due: project.due,
      page: 'projects' as const,
      pct: project.pct,
    }))
    const goalItems = sortPriorityGoals(activeGoals).map(goal => ({
      key: `goal-${goal.id}`,
      type: '목표',
      title: goal.name,
      due: goal.due,
      page: 'goals' as const,
      pct: goal.pct,
    }))
    return [...taskItems, ...projectItems, ...goalItems]
      .sort((a, b) => {
        const diff = daysUntil(a.due) - daysUntil(b.due)
        if (diff !== 0) return diff
        return a.pct - b.pct
      })
      .slice(0, 4)
  }, [activeGoals, activeProjects, activeTasks])

  return (
    <div style={{
      height: '100%',
      padding: 12,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 7, flexShrink: 0 }}>
        <Metric label="작업" value={activeTasks.length} sub="실행 대기" onClick={() => setPage('tasks')} />
        <Metric label="프로젝트" value={`${projectAvg}%`} sub={`${activeProjects.length}개 진행`} onClick={() => setPage('projects')} />
        <Metric label="목표" value={`${goalAvg}%`} sub={`오늘 방향 ${focusDone}/${todayTopGoals.length}`} onClick={() => setPage('goals')} />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <strong style={{ fontSize: 12, color: 'var(--text)' }}>다음에 볼 것</strong>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>마감·진행률 기준</span>
        </div>
        {nextItems.length === 0 ? (
          <button
            type="button"
            onClick={() => setPage('tasks')}
            style={{
              flex: 1,
              border: '1px dashed var(--border)',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            작업, 프로젝트, 목표를 추가하면 흐름이 표시됩니다
          </button>
        ) : nextItems.map(item => (
          <button
            type="button"
            key={item.key}
            onClick={() => setPage(item.page)}
            style={{
              minHeight: 0,
              border: 'none',
              borderRadius: 8,
              background: 'var(--bg3)',
              padding: '8px 9px',
              cursor: 'pointer',
              display: 'grid',
              gridTemplateColumns: '70px minmax(0, 1fr) auto',
              gap: 8,
              alignItems: 'center',
              textAlign: 'left',
            }}
          >
            <span style={{
              borderRadius: 999,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              padding: '3px 7px',
              fontSize: 10,
              fontWeight: 800,
              textAlign: 'center',
            }}>{item.type}</span>
            <span style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 800,
            }}>{item.title}</span>
            <span style={{ color: daysUntil(item.due) <= 1 ? 'var(--accent)' : 'var(--muted)', fontSize: 10, fontWeight: 800 }}>
              {dueLabel(item.due)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  sub,
  onClick,
}: {
  label: string
  value: number | string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 0,
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg3)',
        padding: '9px 8px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ display: 'block', color: 'var(--muted)', fontSize: 10, fontWeight: 800 }}>{label}</span>
      <b style={{ display: 'block', color: 'var(--text)', fontSize: 18, marginTop: 3 }}>{value}</b>
      <small style={{ display: 'block', color: 'var(--muted)', fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</small>
    </button>
  )
}
