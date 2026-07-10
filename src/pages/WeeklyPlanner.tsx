import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { IconButton } from '../components/ui/IconButton'
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
    todos, scheduledTasks, goals, projects, careerEvents, tasks: managedTasks,
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
  const weekManagedTasks = managedTasks.filter(task => task.due && weekDates.includes(task.due) && !task.done && task.status !== '완료')
  const weekGoals = goals.filter(goal => goal.due && weekDates.includes(goal.due))
  const weekProjects = projects.filter(project => project.due && weekDates.includes(project.due))
  const unfinishedWeekTasks = tasks.filter(task => !task.done)
  const weekDeadlineTotal = weekManagedTasks.length + weekGoals.length + weekProjects.length
  const firstDeadline = weekManagedTasks[0]?.name ?? weekGoals[0]?.name ?? weekProjects[0]?.name
  const busiestDay = weekDates
    .map(date => {
      const count = todos.filter(todo => belongsToDate(todo, date)).length
        + scheduledTasks.filter(task => task.date === date).length
        + careerEvents.filter(event => getCareerMilestones(event, date).length > 0).length
        + managedTasks.filter(task => task.due === date && !task.done && task.status !== '완료').length
        + goals.filter(goal => goal.due === date).length
        + projects.filter(project => project.due === date).length
      return { date, count }
    })
    .sort((a, b) => b.count - a.count)[0]

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
      <PageHeader
        title="주간 플래너"
        description="이번 주의 핵심 작업, 일정과 마감을 날짜 흐름으로 확인합니다."
        actions={<div className="week-controls">
          <IconButton label="이전 주" icon={<ChevronLeft size={17} />} size="sm" variant="secondary" onClick={() => moveWeek(-7)} />
          <strong>{formatWeekRange(weekStart)}</strong>
          <IconButton label="다음 주" icon={<ChevronRight size={17} />} size="sm" variant="secondary" onClick={() => moveWeek(7)} />
          <IconButton label="이번 주" icon={<RotateCcw size={16} />} size="sm" variant="secondary" onClick={() => setWeekStart(getWeekStart())} />
        </div>}
      />

      <section className="weekly-summary">
        <SummaryCard label="주간 작업" value={`${doneCount}/${tasks.length}`} sub={`${pct}% 완료`} />
        <SummaryCard
          label="Todo"
          value={`${weekTodos.filter(todo => todo.done).length}/${weekTodos.length}`}
          sub={selectedWeekIncludesToday ? '오늘 미지정 포함' : '날짜 지정 항목'}
        />
        <SummaryCard label="예정" value={String(weekScheduled.length + weekCareerEvents.length)} sub="캘린더 일정" />
        <SummaryCard label="마감" value={String(weekManagedTasks.length + weekGoals.length + weekProjects.length)} sub="작업/목표/프로젝트" />
      </section>

      <section className="weekly-focus-board">
        <article className="week-focus-main">
          <span>이번 주 운영</span>
          <strong>{unfinishedWeekTasks[0]?.text ?? '핵심 작업 없음'}</strong>
          <div className="week-focus-progress"><i style={{ width: `${pct}%` }} /></div>
        </article>
        <WeeklyFocus label="남은 핵심" value={`${unfinishedWeekTasks.length}개`} sub={unfinishedWeekTasks[0]?.cat ?? '정리됨'} />
        <WeeklyFocus label="첫 마감" value={firstDeadline ?? '없음'} sub={`${weekDeadlineTotal}개 연결`} />
        <WeeklyFocus label="가장 바쁜 날" value={busiestDay && busiestDay.count > 0 ? dateLabel(busiestDay.date) : '없음'} sub={busiestDay && busiestDay.count > 0 ? `${busiestDay.count}개 항목` : '여유 있음'} />
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
              const dayManagedTasks = managedTasks.filter(task => task.due === date && !task.done && task.status !== '완료')
              const dayDue = [
                ...dayManagedTasks.map(task => `작업 · ${task.name}`),
                ...goals.filter(goal => goal.due === date).map(goal => goal.name),
                ...projects.filter(project => project.due === date).map(project => project.name),
              ]
              return (
                <article key={date} className="week-day-card">
                  <strong>{dateLabel(date)}</strong>
                  <small>Todo {dayTodos.filter(todo => todo.done).length}/{dayTodos.length}</small>
                  <em>{dayTodos.length + dayScheduled.length + dayCareerEvents.length + dayDue.length}개</em>
                  {dayScheduled.slice(0, 3).map(task => <p key={task.id}>{task.time ? `${task.time} ` : ''}{task.title}</p>)}
                  {dayCareerEvents.slice(0, 3).map(event => {
                    const labels = getCareerMilestones(event, date).filter(label => label !== '일정')
                    return (
                      <p key={event.id} className="career-text">
                        {(labels.join(' · ') || CAREER_CATEGORY_LABELS[event.category])} · {event.time ? `${event.time} ` : ''}{event.title}
                      </p>
                    )
                  })}
                  {dayDue.slice(0, 3).map(title => <p key={title} className="due-text">마감 · {title}</p>)}
                  {dayDue.length > 3 && <p className="more-text">마감 +{dayDue.length - 3}</p>}
                  {dayTodos.length + dayScheduled.length + dayCareerEvents.length + dayDue.length === 0 && <p className="muted">비어 있음</p>}
                </article>
              )
            })}
          </div>
        </div>
      </section>


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

function WeeklyFocus({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="weekly-focus-card">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </article>
  )
}
