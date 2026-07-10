import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import type { Task } from '../types'
import { toLocalDateKey } from '../utils/date'
import { getGoalDueText } from '../utils/goals'

const TASK_TYPES = ['업무', '개인', '공부', '기타'] as const
const TASK_PRIORITIES = ['높음', '보통', '낮음'] as const
const TASK_STATUSES = ['진행 중', '대기', '완료'] as const

type StatusFilter = 'all' | typeof TASK_STATUSES[number]

const PRIORITY_WEIGHT: Record<string, number> = {
  높음: 0,
  보통: 1,
  낮음: 2,
}

const emptyForm = () => ({
  name: '',
  due: '',
  type: '업무' as string,
  priority: '보통' as string,
  status: '진행 중' as string,
  owner: '',
})

const sortTasks = (tasks: Task[]): Task[] =>
  [...tasks].sort((a, b) => {
    const aDone = a.done || a.status === '완료'
    const bDone = b.done || b.status === '완료'
    if (aDone !== bDone) return aDone ? 1 : -1

    const aDue = a.due ? new Date(`${a.due}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    const bDue = b.due ? new Date(`${b.due}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    if (aDue !== bDue) return aDue - bDue
    return (PRIORITY_WEIGHT[a.priority ?? '보통'] ?? 1) - (PRIORITY_WEIGHT[b.priority ?? '보통'] ?? 1)
  })

const getTaskTone = (task: Task) => {
  if (task.done || task.status === '완료') return 'done'
  if (!task.due) return 'open'
  const today = toLocalDateKey()
  if (task.due < today) return 'overdue'
  if (task.due === today) return 'today'
  return 'future'
}

export default function TaskTracker() {
  const { tasks, setTasks } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState<StatusFilter>('all')

  const addTask = () => {
    const name = form.name.trim()
    if (!name) return
    const task: Task = {
      id: `task-${Date.now()}`,
      name,
      due: form.due || undefined,
      type: form.type,
      priority: form.priority,
      status: form.status,
      owner: form.owner.trim() || undefined,
      done: form.status === '완료',
    }
    setTasks(prev => [task, ...prev])
    setForm(emptyForm())
  }

  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task
      const next = { ...task, ...patch }
      if (patch.status) next.done = patch.status === '완료'
      if (patch.done !== undefined) next.status = patch.done ? '완료' : (task.status === '완료' ? '진행 중' : task.status)
      return next
    }))
  }

  const removeTask = (id: string) => setTasks(prev => prev.filter(task => task.id !== id))

  const visible = sortTasks(tasks).filter(task => filter === 'all' || task.status === filter)
  const activeTasks = tasks.filter(task => !task.done && task.status !== '완료')
  const waitingTasks = tasks.filter(task => task.status === '대기')
  const doneTasks = tasks.filter(task => task.done || task.status === '완료')
  const highPriority = activeTasks.filter(task => task.priority === '높음')
  const nextTask = sortTasks(activeTasks).find(task => task.due)
  const runningTasks = activeTasks.filter(task => task.status === '진행 중')
  const focusTasks = sortTasks(activeTasks).slice(0, 5)
  const completionPct = tasks.length === 0 ? 0 : Math.round((doneTasks.length / tasks.length) * 100)

  return (
    <div className="task-page">
      <PageHeader
        title="작업 관리"
        description="마감, 우선순위와 상태가 있는 실행 작업을 관리합니다."
      />

      <section className="task-summary-grid">
        <TaskSummary label="진행 작업" value={`${activeTasks.length}개`} sub={`완료 ${doneTasks.length}개`} />
        <TaskSummary label="높은 우선순위" value={`${highPriority.length}개`} sub={highPriority[0]?.name ?? '긴급 항목 없음'} />
        <TaskSummary label="대기" value={`${waitingTasks.length}개`} sub="시작 전 상태" />
        <TaskSummary label="다음 마감" value={nextTask ? getGoalDueText(nextTask.due) : '-'} sub={nextTask?.name ?? '마감 등록 없음'} />
      </section>

      <section className="task-command-board">
        <article className="task-focus-card">
          <div className="task-card-heading">
            <div>
              <span>실행 대기열</span>
              <h3>지금 볼 작업</h3>
            </div>
            <b>{runningTasks.length}</b>
          </div>
          <div className="task-focus-list">
            {focusTasks.length === 0 ? (
              <p className="task-empty-inline">진행할 작업이 없습니다.</p>
            ) : focusTasks.map(task => (
              <div key={task.id} className={`task-focus-item ${getTaskTone(task)}`}>
                <span>{task.priority ?? '보통'}</span>
                <strong>{task.name}</strong>
                <small>{getGoalDueText(task.due)}</small>
                <button type="button" onClick={() => updateTask(task.id, { status: '완료', done: true })}>완료</button>
              </div>
            ))}
          </div>
        </article>

        <article className="task-balance-card">
          <div className="task-card-heading">
            <div>
              <span>상태 균형</span>
              <h3>{completionPct}% 완료</h3>
            </div>
          </div>
          <div className="task-balance-bar">
            <i style={{ width: `${completionPct}%` }} />
          </div>
          <div className="task-balance-grid">
            <small>진행 {runningTasks.length}</small>
            <small>대기 {waitingTasks.length}</small>
            <small>완료 {doneTasks.length}</small>
          </div>
        </article>
      </section>

      <section className="task-add">
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addTask() }}
          placeholder="예: 분기 보고서 작성"
          className="task-name-input"
        />
        <input
          type="date"
          value={form.due}
          onChange={e => setForm(f => ({ ...f, due: e.target.value }))}
        />
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
          {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          value={form.owner}
          onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
          placeholder="담당자"
          className="task-owner-input"
        />
        <button type="button" onClick={addTask}>추가</button>
      </section>

      <nav className="task-filters">
        {(['all', ...TASK_STATUSES] as StatusFilter[]).map(s => (
          <button key={s} type="button" className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
            {s === 'all' ? '전체' : s}
          </button>
        ))}
      </nav>

      <section className="task-table">
        {visible.length === 0 ? (
          <div className="task-empty">등록된 작업이 없습니다.</div>
        ) : (
          <>
            <div className="task-row task-row-head">
              <span>완료</span>
              <span>작업명</span>
              <span>유형</span>
              <span>우선순위</span>
              <span>상태</span>
              <span>담당자</span>
              <span>마감</span>
              <span>링크</span>
            </div>
            {visible.map(task => (
              <div key={task.id} className={`task-row ${getTaskTone(task)}${task.done ? ' done' : ''}`}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={e => updateTask(task.id, { done: e.target.checked })}
                />
                <input
                  value={task.name}
                  onChange={e => updateTask(task.id, { name: e.target.value })}
                  className={task.done ? 'done-text' : ''}
                />
                <select value={task.type ?? '업무'} onChange={e => updateTask(task.id, { type: e.target.value })}>
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={task.priority ?? '보통'} onChange={e => updateTask(task.id, { priority: e.target.value })}>
                  {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={task.status ?? '진행 중'} onChange={e => updateTask(task.id, { status: e.target.value })}>
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  value={task.owner ?? ''}
                  onChange={e => updateTask(task.id, { owner: e.target.value })}
                  placeholder="-"
                />
                <div className="task-due">
                  <input
                    type="date"
                    value={task.due ?? ''}
                    onChange={e => updateTask(task.id, { due: e.target.value })}
                  />
                  <small>{getGoalDueText(task.due)}</small>
                </div>
                <div className="task-actions">
                  {task.sourceUrl && <a href={task.sourceUrl} target="_blank" rel="noreferrer">열기</a>}
                  <button type="button" className="ghost-button" onClick={() => removeTask(task.id)}>삭제</button>
                </div>
              </div>
            ))}
          </>
        )}
      </section>


    </div>
  )
}

function TaskSummary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="task-summary-card">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </article>
  )
}
