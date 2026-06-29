import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Todo, WeekTask } from '../types'
import { addLocalDays, toLocalDateKey } from '../utils/date'
import { CAREER_CATEGORY_LABELS, getCareerMilestones } from '../utils/careerEvents'

const WEEK_CATEGORIES = ['중요', '업무', '공부', '개인'] as const

const getWeekStart = (date = new Date()) => {
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  return addLocalDays(date, mondayOffset)
}

const formatWeekRange = (start: Date) => {
  const end = addLocalDays(start, 6)
  const fmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' })
  return `${fmt.format(start)} - ${fmt.format(end)}`
}

const dateLabel = (dateKey: string) =>
  new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
    .format(new Date(`${dateKey}T12:00:00`))

const makeWeekDates = (start: Date) =>
  Array.from({ length: 7 }, (_, index) => toLocalDateKey(addLocalDays(start, index)))

export default function WeeklyPlanner() {
  const {
    weekTasks, setWeekTasks,
    todos, scheduledTasks, goals, projects, careerEvents,
  } = useApp()
  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const [newTask, setNewTask] = useState('')
  const [newCategory, setNewCategory] = useState<(typeof WEEK_CATEGORIES)[number]>('중요')
  const todayKey = toLocalDateKey()
  const weekKey = toLocalDateKey(weekStart)
  const weekDates = useMemo(() => makeWeekDates(weekStart), [weekStart])
  const selectedWeekIncludesToday = weekDates.includes(todayKey)
  const tasks = weekTasks[weekKey] ?? []
  const doneCount = tasks.filter(task => task.done).length
  const pct = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100)

  const belongsToWeek = (todo: Todo) =>
    todo.date ? weekDates.includes(todo.date) : selectedWeekIncludesToday

  const belongsToDate = (todo: Todo, date: string) =>
    todo.date ? todo.date === date : date === todayKey

  const weekTodos = todos.filter(belongsToWeek)
  const weekScheduled = scheduledTasks.filter(task => weekDates.includes(task.date))
  const weekCareerEvents = careerEvents.filter(event =>
    weekDates.some(date => getCareerMilestones(event, date).length > 0),
  )
  const weekGoals = goals.filter(goal => goal.due && weekDates.includes(goal.due))
  const weekProjects = projects.filter(project => project.due && weekDates.includes(project.due))

  const setWeekTaskList = (updater: (items: WeekTask[]) => WeekTask[]) => {
    setWeekTasks(prev => ({
      ...prev,
      [weekKey]: updater(prev[weekKey] ?? []),
    }))
  }

  const addTask = () => {
    const text = newTask.trim()
    if (!text) return
    const item: WeekTask = {
      id: `week-${Date.now()}`,
      text,
      done: false,
      cat: newCategory,
    }
    setWeekTaskList(items => [item, ...items])
    setNewTask('')
  }

  const updateTask = (id: string, patch: Partial<WeekTask>) => {
    setWeekTaskList(items => items.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  const removeTask = (id: string) => {
    setWeekTaskList(items => items.filter(item => item.id !== id))
  }

  const moveWeek = (days: number) => setWeekStart(prev => addLocalDays(prev, days))

  return (
    <div className="weekly-page">
      <header className="weekly-header">
        <div>
          <h2>주간 플래너</h2>
          <p>한 주의 핵심 작업과 날짜별 일정을 함께 보고 조정합니다.</p>
        </div>
        <div className="week-controls">
          <button type="button" onClick={() => moveWeek(-7)}>이전 주</button>
          <strong>{formatWeekRange(weekStart)}</strong>
          <button type="button" onClick={() => moveWeek(7)}>다음 주</button>
          <button type="button" onClick={() => setWeekStart(getWeekStart())}>이번 주</button>
        </div>
      </header>

      <section className="weekly-summary">
        <SummaryCard label="주간 작업" value={`${doneCount}/${tasks.length}`} sub={`${pct}% 완료`} />
        <SummaryCard
          label="Todo"
          value={`${weekTodos.filter(todo => todo.done).length}/${weekTodos.length}`}
          sub={selectedWeekIncludesToday ? '오늘 미지정 포함' : '날짜 지정 항목'}
        />
        <SummaryCard label="예정" value={String(weekScheduled.length + weekCareerEvents.length)} sub="캘린더 일정" />
        <SummaryCard label="마감" value={String(weekGoals.length + weekProjects.length)} sub="목표/프로젝트" />
      </section>

      <section className="weekly-grid">
        <div className="weekly-panel">
          <div className="panel-heading">
            <h3>이번 주 핵심 작업</h3>
            <span>{pct}%</span>
          </div>
          <div className="week-progress"><span style={{ width: `${pct}%` }} /></div>
          <div className="week-add">
            <select value={newCategory} onChange={event => setNewCategory(event.target.value as typeof newCategory)}>
              {WEEK_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            <input
              value={newTask}
              onChange={event => setNewTask(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) addTask() }}
              placeholder="이번 주 꼭 끝낼 일"
            />
            <button type="button" onClick={addTask}>추가</button>
          </div>

          <div className="week-task-list">
            {tasks.length === 0 ? (
              <p className="empty-text">이번 주 핵심 작업을 추가하세요.</p>
            ) : tasks.map(task => (
              <div key={task.id} className="week-task-row">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={event => updateTask(task.id, { done: event.target.checked })}
                />
                <span className="category-pill">{task.cat ?? '중요'}</span>
                <input
                  value={task.text}
                  onChange={event => updateTask(task.id, { text: event.target.value })}
                  className={task.done ? 'done-text' : ''}
                />
                <button type="button" onClick={() => removeTask(task.id)}>삭제</button>
              </div>
            ))}
          </div>
        </div>

        <div className="weekly-panel">
          <div className="panel-heading">
            <h3>요일별 흐름</h3>
            <span>{weekDates.length}일</span>
          </div>
          <div className="week-days">
            {weekDates.map(date => {
              const dayTodos = todos.filter(todo => belongsToDate(todo, date))
              const dayScheduled = scheduledTasks.filter(task => task.date === date)
              const dayCareerEvents = careerEvents.filter(event => getCareerMilestones(event, date).length > 0)
              const dayDue = [
                ...goals.filter(goal => goal.due === date).map(goal => goal.name),
                ...projects.filter(project => project.due === date).map(project => project.name),
              ]
              return (
                <article key={date} className="week-day-card">
                  <strong>{dateLabel(date)}</strong>
                  <small>Todo {dayTodos.filter(todo => todo.done).length}/{dayTodos.length}</small>
                  {dayScheduled.slice(0, 3).map(task => <p key={task.id}>{task.time ? `${task.time} ` : ''}{task.title}</p>)}
                  {dayCareerEvents.slice(0, 3).map(event => {
                    const labels = getCareerMilestones(event, date).filter(label => label !== '일정')
                    return (
                      <p key={event.id} className="career-text">
                        {(labels.join(' · ') || CAREER_CATEGORY_LABELS[event.category])} · {event.time ? `${event.time} ` : ''}{event.title}
                      </p>
                    )
                  })}
                  {dayDue.slice(0, 2).map(title => <p key={title} className="due-text">마감 · {title}</p>)}
                  {dayTodos.length + dayScheduled.length + dayCareerEvents.length + dayDue.length === 0 && <p className="muted">비어 있음</p>}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <style>{`
        .weekly-page { max-width: 1120px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .weekly-header { display: flex; justify-content: space-between; gap: 14px; align-items: flex-end; }
        .weekly-header h2 { margin: 0 0 6px; font-size: 24px; letter-spacing: 0; }
        .weekly-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .week-controls { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 7px; }
        .week-controls button, .week-add button { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .week-controls strong { min-width: 150px; text-align: center; font-size: 13px; }
        .weekly-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .summary-card, .weekly-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
        .summary-card { padding: 13px; }
        .summary-card span { color: var(--muted); font-size: 11px; font-weight: 700; }
        .summary-card b { display: block; margin-top: 6px; font-size: 22px; color: var(--text); }
        .summary-card small { color: var(--muted); font-size: 11px; }
        .weekly-grid { display: grid; grid-template-columns: minmax(320px, 0.85fr) minmax(0, 1.15fr); gap: 14px; align-items: start; }
        .weekly-panel { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .panel-heading { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .panel-heading h3 { margin: 0; font-size: 15px; }
        .panel-heading span { color: var(--accent); font-size: 12px; font-weight: 800; }
        .week-progress { height: 7px; border-radius: 999px; background: var(--bg4); overflow: hidden; }
        .week-progress span { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
        .week-add { display: grid; grid-template-columns: 94px minmax(0, 1fr) auto; gap: 8px; }
        .week-add input, .week-add select, .week-task-row input:not([type]) { min-width: 0; height: 34px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 9px; font-size: 13px; outline: none; }
        .week-task-list { display: flex; flex-direction: column; gap: 7px; }
        .week-task-row { display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; gap: 7px; align-items: center; padding: 8px; border-radius: 8px; background: var(--bg3); }
        .week-task-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
        .week-task-row button { min-width: 44px; min-height: 32px; border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 11px; padding: 7px 9px; }
        .category-pill { padding: 3px 7px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 10px; font-weight: 800; white-space: nowrap; }
        .done-text { color: var(--muted) !important; text-decoration: line-through; }
        .empty-text, .muted { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; text-align: center; padding: 12px; }
        .week-days { display: grid; grid-template-columns: repeat(7, minmax(96px, 1fr)); gap: 8px; overflow-x: auto; padding-bottom: 2px; }
        .week-day-card { min-height: 132px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); padding: 10px; }
        .week-day-card strong { display: block; font-size: 12px; margin-bottom: 4px; }
        .week-day-card small { color: var(--muted); font-size: 10px; }
        .week-day-card p { margin: 7px 0 0; color: var(--text); font-size: 11px; line-height: 1.35; word-break: break-word; }
        .week-day-card .career-text { color: #a855f7; font-weight: 700; }
        .week-day-card .due-text { color: var(--accent); font-weight: 700; }
        @media (max-width: 900px) {
          .weekly-header { align-items: stretch; flex-direction: column; }
          .week-controls { justify-content: flex-start; }
          .weekly-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .weekly-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .weekly-summary { grid-template-columns: 1fr; }
          .week-add, .week-task-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </article>
  )
}
