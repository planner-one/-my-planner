import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Task } from '../types'
import { getGoalDueText } from '../utils/goals'

const TASK_TYPES = ['업무', '개인', '공부', '기타'] as const
const TASK_PRIORITIES = ['높음', '보통', '낮음'] as const
const TASK_STATUSES = ['진행 중', '대기', '완료'] as const

type StatusFilter = 'all' | typeof TASK_STATUSES[number]

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
    return aDue - bDue
  })

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

  return (
    <div className="task-page">
      <header className="task-header">
        <div>
          <h2>작업 관리</h2>
          <p>마감일, 우선순위, 상태와 담당자를 기준으로 장기 작업을 관리합니다.</p>
        </div>
      </header>

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
              <div key={task.id} className={`task-row${task.done ? ' done' : ''}`}>
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
        .task-header p { margin: 0; color: var(--muted); font-size: 13px; }
        .task-add { display: grid; grid-template-columns: minmax(0,1.6fr) 130px 100px 90px 100px minmax(0,0.8fr) auto; gap: 8px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
        .task-add input, .task-add select { min-width: 0; height: 34px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 9px; font-family: inherit; font-size: 13px; outline: none; }
        .task-add button { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .task-filters { display: flex; gap: 5px; }
        .task-filters button { border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 7px 12px; cursor: pointer; font-size: 12px; }
        .task-filters button.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 700; }
        .task-table { display: flex; flex-direction: column; gap: 6px; }
        .task-row { display: grid; grid-template-columns: 28px minmax(0,1.6fr) 100px 90px 100px minmax(0,0.8fr) 150px 68px; gap: 8px; align-items: center; padding: 9px 10px; border-radius: 8px; background: var(--bg2); border: 1px solid var(--border); }
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
          .task-add { grid-template-columns: 1fr 1fr; }
          .task-row, .task-row-head { grid-template-columns: 1fr; }
          .task-row-head { display: none; }
          .task-row { gap: 6px; }
        }
      `}</style>
    </div>
  )
}
