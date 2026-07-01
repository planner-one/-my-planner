import { useState } from 'react'
import { useApp } from '../store/AppContext'
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
      <header className="task-header">
        <div>
          <h2>작업 관리</h2>
          <p>작업 관리는 바로 실행할 개별 항목을 다룹니다. 여러 작업을 묶는 진행률 관리는 프로젝트에서 봅니다.</p>
        </div>
      </header>

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

      <style>{`
        .task-page { max-width: 1100px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .task-header h2 { margin: 0 0 5px; font-size: 24px; letter-spacing: 0; }
        .task-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .task-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .task-summary-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 13px; }
        .task-summary-card span { color: var(--muted); font-size: 11px; font-weight: 800; }
        .task-summary-card b { display: block; margin: 5px 0 3px; color: var(--text); font-size: 20px; }
        .task-summary-card small { display: block; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .task-command-board { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(240px, 0.65fr); gap: 12px; align-items: stretch; }
        .task-focus-card, .task-balance-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .task-card-heading { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .task-card-heading span { color: var(--accent); font-size: 11px; font-weight: 900; }
        .task-card-heading h3 { margin: 4px 0 0; font-size: 17px; letter-spacing: 0; }
        .task-card-heading b { color: var(--accent); font-size: 28px; line-height: 1; }
        .task-focus-list { display: flex; flex-direction: column; gap: 7px; }
        .task-focus-item { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto auto; gap: 8px; align-items: center; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); padding: 8px; }
        .task-focus-item.today, .task-focus-item.overdue { border-color: rgba(49, 130, 80, 0.35); background: var(--accent-soft); }
        .task-focus-item span { border-radius: 999px; background: var(--bg2); color: var(--muted); padding: 4px 7px; font-size: 10px; font-weight: 900; text-align: center; white-space: nowrap; }
        .task-focus-item.overdue span, .task-focus-item.today span { color: var(--accent); }
        .task-focus-item strong { min-width: 0; color: var(--text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .task-focus-item small { color: var(--muted); font-size: 11px; white-space: nowrap; }
        .task-focus-item button { min-height: 30px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 10px; font-size: 11px; font-weight: 800; cursor: pointer; }
        .task-empty-inline { margin: 0; padding: 16px; border: 1px dashed var(--border); border-radius: 8px; color: var(--muted); text-align: center; font-size: 12px; }
        .task-balance-bar { height: 10px; border-radius: 999px; background: var(--bg4); overflow: hidden; }
        .task-balance-bar i { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
        .task-balance-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
        .task-balance-grid small { border-radius: 7px; background: var(--bg3); color: var(--muted); font-size: 11px; font-weight: 800; padding: 9px 7px; text-align: center; }
        .task-add { display: grid; grid-template-columns: minmax(0,1.6fr) 130px 100px 90px 100px minmax(0,0.8fr) auto; gap: 8px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
        .task-add input, .task-add select { min-width: 0; height: 34px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 9px; font-family: inherit; font-size: 13px; outline: none; }
        .task-add button { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .task-filters { display: flex; gap: 5px; }
        .task-filters button { border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 7px 12px; cursor: pointer; font-size: 12px; }
        .task-filters button.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 700; }
        .task-table { display: flex; flex-direction: column; gap: 6px; }
        .task-row { display: grid; grid-template-columns: 28px minmax(0,1.6fr) 100px 90px 100px minmax(0,0.8fr) 150px 68px; gap: 8px; align-items: center; padding: 9px 10px; border-radius: 8px; background: var(--bg2); border: 1px solid var(--border); }
        .task-row.today, .task-row.overdue { border-left: 4px solid var(--accent); }
        .task-row-head { background: transparent; border: none; color: var(--muted); font-size: 11px; font-weight: 700; padding: 0 10px; }
        .task-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
        .task-row input[type="text"], .task-row input:not([type]), .task-row select { min-width: 0; height: 32px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg3); color: var(--text); padding: 0 8px; font-family: inherit; font-size: 12px; outline: none; }
        .task-row.done input:not([type]) { opacity: 0.6; }
        .done-text { color: var(--muted) !important; text-decoration: line-through; }
        .task-due { display: flex; flex-direction: column; gap: 2px; }
        .task-due input { height: 32px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg3); color: var(--text); padding: 0 8px; font-size: 12px; }
        .task-due small { color: var(--muted); font-size: 10px; white-space: nowrap; }
        .task-actions { display: flex; align-items: center; justify-content: flex-end; gap: 5px; }
        .task-actions a { color: var(--accent); font-size: 11px; font-weight: 700; text-decoration: none; }
        .ghost-button { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 11px; padding: 5px; }
        .task-empty { padding: 40px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--muted); text-align: center; }
        @media (max-width: 900px) {
          .task-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .task-command-board { grid-template-columns: 1fr; }
          .task-add { grid-template-columns: 1fr 1fr; }
          .task-row, .task-row-head { grid-template-columns: 1fr; }
          .task-row-head { display: none; }
          .task-row { gap: 6px; }
          .task-focus-item { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .task-summary-grid { grid-template-columns: 1fr; }
        }
      `}</style>
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
