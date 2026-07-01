import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { ScheduledTask, Todo } from '../types'
import { addLocalDays, toLocalDateKey } from '../utils/date'
import { isHabitScheduled } from '../utils/habits'
import { CAREER_CATEGORY_LABELS, getCareerMilestones } from '../utils/careerEvents'

const TODO_CATEGORIES = ['work', 'personal', 'study'] as const
const CATEGORY_LABEL: Record<typeof TODO_CATEGORIES[number], string> = {
  work: '업무',
  personal: '개인',
  study: '공부',
}
const TIME_SLOTS = Array.from({ length: 18 }, (_, index) => `${String(index + 6).padStart(2, '0')}:00`)

export default function DailyPlanner() {
  const {
    todos, setTodos,
    scheduledTasks, setScheduledTasks,
    timeBlockData, setTimeBlockData,
    habits, habitHistory, setHabitHistory,
    careerEvents,
    tasks, goals, projects,
  } = useApp()
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey())
  const [todoText, setTodoText] = useState('')
  const [todoCategory, setTodoCategory] = useState<typeof TODO_CATEGORIES[number]>('work')
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')

  const dateObj = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate])
  const dayTodos = todos.filter(todo => (!todo.date && selectedDate === toLocalDateKey()) || todo.date === selectedDate)
  const daySchedules = scheduledTasks
    .filter(task => task.date === selectedDate)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  const dayCareerEvents = careerEvents
    .filter(event => getCareerMilestones(event, selectedDate).length > 0)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title))
  const activeHabits = habits.filter(habit => isHabitScheduled(habit, dateObj))
  const dueTasks = tasks.filter(task => task.due === selectedDate && !task.done && task.status !== '완료')
  const dueGoals = goals.filter(goal => goal.due === selectedDate && goal.status !== '완료' && goal.pct < 100)
  const dueProjects = projects.filter(project => project.due === selectedDate && project.status !== '완료' && project.pct < 100)
  const deadlineTotal = dueTasks.length + dueGoals.length + dueProjects.length
  const todayRecord = habitHistory[selectedDate] ?? {}
  const todoDone = dayTodos.filter(todo => todo.done).length
  const todoPct = dayTodos.length === 0 ? 0 : Math.round((todoDone / dayTodos.length) * 100)
  const habitDone = activeHabits.filter(habit => todayRecord[habit.id]).length
  const habitPct = activeHabits.length === 0 ? 0 : Math.round((habitDone / activeHabits.length) * 100)
  const scheduleTotal = daySchedules.length + dayCareerEvents.length
  const scheduleDone = daySchedules.filter(task => task.done).length
    + dayCareerEvents.filter(event => event.status === 'completed' || event.status === 'cancelled').length
  const schedulePct = scheduleTotal === 0 ? 0 : Math.round((scheduleDone / scheduleTotal) * 100)
  const blocks = timeBlockData[selectedDate] ?? {}

  const shiftDate = (days: number) => {
    setSelectedDate(toLocalDateKey(addLocalDays(dateObj, days)))
  }

  const addTodo = () => {
    const text = todoText.trim()
    if (!text) return
    const item: Todo = {
      id: `daily-todo-${Date.now()}`,
      text,
      done: false,
      priority: 'medium',
      category: todoCategory,
      date: selectedDate,
    }
    setTodos(prev => [item, ...prev])
    setTodoText('')
  }

  const updateTodo = (id: string, patch: Partial<Todo>) => {
    setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, ...patch } : todo))
  }

  const removeTodo = (id: string) => {
    if (!window.confirm('이 Todo를 삭제할까요?')) return
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }

  const addSchedule = () => {
    const title = scheduleTitle.trim()
    if (!title) return
    const task: ScheduledTask = {
      id: `daily-schedule-${Date.now()}`,
      title,
      date: selectedDate,
      time: scheduleTime,
      done: false,
    }
    setScheduledTasks(prev => [...prev, task])
    setScheduleTitle('')
  }

  const updateSchedule = (id: string, patch: Partial<ScheduledTask>) => {
    setScheduledTasks(prev => prev.map(task => task.id === id ? { ...task, ...patch } : task))
  }

  const removeSchedule = (id: string) => {
    if (!window.confirm('이 일정을 삭제할까요?')) return
    setScheduledTasks(prev => prev.filter(task => task.id !== id))
  }

  const updateBlock = (slot: string, value: string) => {
    setTimeBlockData(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] ?? {}),
        [slot]: value,
      },
    }))
  }

  const toggleHabit = (id: string) => {
    setHabitHistory(prev => ({
      ...prev,
      [selectedDate]: {
        ...Object.fromEntries(activeHabits.map(habit => [habit.id, prev[selectedDate]?.[habit.id] ?? false])),
        [id]: !prev[selectedDate]?.[id],
      },
    }))
  }

  return (
    <div className="daily-page">
      <header className="daily-header">
        <div>
          <h2>일일 플래너</h2>
          <p>하루의 Todo, 루틴, 일정, 시간 블록을 한 화면에서 조정합니다.</p>
        </div>
        <div className="daily-date-controls">
          <button type="button" onClick={() => shiftDate(-1)}>어제</button>
          <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} />
          <button type="button" onClick={() => shiftDate(1)}>내일</button>
          <button type="button" onClick={() => setSelectedDate(toLocalDateKey())}>오늘</button>
        </div>
      </header>

      <section className="daily-summary">
        <Summary label="Todo" value={`${todoDone}/${dayTodos.length}`} pct={todoPct} />
        <Summary label="루틴" value={`${habitDone}/${activeHabits.length}`} pct={habitPct} />
        <Summary label="일정" value={String(scheduleTotal)} pct={schedulePct} />
        <Summary label="마감" value={String(deadlineTotal)} pct={deadlineTotal > 0 ? 100 : 0} />
      </section>

      <section className="daily-grid">
        <div className="daily-panel">
          <h3>Todo</h3>
          <div className="daily-add">
            <select value={todoCategory} onChange={event => setTodoCategory(event.target.value as typeof todoCategory)}>
              {TODO_CATEGORIES.map(category => <option key={category} value={category}>{CATEGORY_LABEL[category]}</option>)}
            </select>
            <input
              value={todoText}
              onChange={event => setTodoText(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) addTodo() }}
              placeholder="오늘 할 일"
            />
            <button type="button" onClick={addTodo}>추가</button>
          </div>
          <div className="daily-list">
            {dayTodos.length === 0 ? <p className="empty-text">오늘 할 일을 추가하세요.</p> : dayTodos.map(todo => (
              <div key={todo.id} className="daily-row">
                <input type="checkbox" checked={todo.done} onChange={event => updateTodo(todo.id, { done: event.target.checked })} />
                <span>{CATEGORY_LABEL[(todo.category as typeof TODO_CATEGORIES[number]) ?? 'work'] ?? '업무'}</span>
                <input value={todo.text} onChange={event => updateTodo(todo.id, { text: event.target.value })} className={todo.done ? 'done-text' : ''} />
                <button type="button" onClick={() => removeTodo(todo.id)}>삭제</button>
              </div>
            ))}
          </div>
        </div>

        <div className="daily-panel">
          <h3>일정</h3>
          <div className="daily-add schedule-add">
            <input type="time" value={scheduleTime} onChange={event => setScheduleTime(event.target.value)} />
            <input
              value={scheduleTitle}
              onChange={event => setScheduleTitle(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) addSchedule() }}
              placeholder="일정 제목"
            />
            <button type="button" onClick={addSchedule}>추가</button>
          </div>
          <div className="daily-list">
            {scheduleTotal === 0 ? (
              <p className="empty-text">등록된 일정이 없습니다.</p>
            ) : (
              <>
                {daySchedules.map(task => (
                  <div key={task.id} className="schedule-row">
                    <input type="checkbox" checked={task.done} onChange={event => updateSchedule(task.id, { done: event.target.checked })} />
                    <input type="time" value={task.time ?? ''} onChange={event => updateSchedule(task.id, { time: event.target.value })} />
                    <input value={task.title} onChange={event => updateSchedule(task.id, { title: event.target.value })} className={task.done ? 'done-text' : ''} />
                    <button type="button" onClick={() => removeSchedule(task.id)}>삭제</button>
                  </div>
                ))}
                {dayCareerEvents.map(event => {
                  const labels = getCareerMilestones(event, selectedDate).filter(label => label !== '일정')
                  const done = event.status === 'completed' || event.status === 'cancelled'
                  return (
                    <div key={event.id} className="career-schedule-row">
                      <span>{labels.join(' · ') || CAREER_CATEGORY_LABELS[event.category]}</span>
                      <strong className={done ? 'done-text' : ''}>
                        {event.time ? `${event.time} ` : ''}{event.title}
                      </strong>
                      <small>{[event.organization, CAREER_CATEGORY_LABELS[event.category]].filter(Boolean).join(' · ')}</small>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>

        <div className="daily-panel">
          <h3>루틴</h3>
          <div className="habit-list">
            {activeHabits.length === 0 ? <p className="empty-text">이 날짜에 예정된 루틴이 없습니다.</p> : activeHabits.map(habit => (
              <button type="button" key={habit.id} className={todayRecord[habit.id] ? 'habit-chip done' : 'habit-chip'} onClick={() => toggleHabit(habit.id)}>
                {todayRecord[habit.id] ? '완료' : '대기'} · {habit.name}
              </button>
            ))}
          </div>
        </div>

        <div className="daily-panel deadline-panel">
          <h3>오늘 마감/연결</h3>
          <div className="deadline-list">
            {deadlineTotal === 0 ? (
              <p className="empty-text">오늘 마감인 작업, 목표, 프로젝트가 없습니다.</p>
            ) : (
              <>
                {dueTasks.map(task => <DeadlineItem key={task.id} label="작업" title={task.name} meta={task.priority ?? task.status ?? ''} />)}
                {dueProjects.map(project => <DeadlineItem key={project.id} label="프로젝트" title={project.name} meta={`${project.pct}%`} />)}
                {dueGoals.map(goal => <DeadlineItem key={goal.id} label="목표" title={goal.name} meta={`${goal.pct}%`} />)}
              </>
            )}
          </div>
        </div>

        <div className="daily-panel time-panel">
          <h3>시간 블록</h3>
          <div className="time-blocks">
            {TIME_SLOTS.map(slot => (
              <label key={slot} className="time-block-row">
                <span>{slot}</span>
                <input
                  value={blocks[slot] ?? ''}
                  onChange={event => updateBlock(slot, event.target.value)}
                  placeholder="계획"
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .daily-page { max-width: 1120px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .daily-header { display: flex; justify-content: space-between; gap: 14px; align-items: flex-end; }
        .daily-header h2 { margin: 0 0 6px; font-size: 24px; letter-spacing: 0; }
        .daily-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .daily-date-controls { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
        .daily-date-controls button, .daily-add button { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .daily-date-controls input, .daily-add input, .daily-add select, .daily-row input:not([type]), .schedule-row input { min-width: 0; height: 34px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 9px; font-size: 13px; outline: none; }
        .daily-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .daily-summary-card, .daily-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
        .daily-summary-card { padding: 13px; }
        .daily-summary-card span { color: var(--muted); font-size: 11px; font-weight: 700; }
        .daily-summary-card b { display: block; margin: 5px 0; font-size: 21px; }
        .daily-mini-progress { height: 6px; border-radius: 999px; background: var(--bg4); overflow: hidden; }
        .daily-mini-progress i { display: block; height: 100%; background: var(--accent); }
        .daily-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
        .daily-panel { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .daily-panel h3 { margin: 0; font-size: 15px; }
        .daily-add { display: grid; grid-template-columns: 88px minmax(0, 1fr) auto; gap: 8px; }
        .schedule-add { grid-template-columns: 105px minmax(0, 1fr) auto; }
        .daily-list, .habit-list { display: flex; flex-direction: column; gap: 7px; }
        .daily-row { display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; gap: 7px; align-items: center; padding: 8px; border-radius: 8px; background: var(--bg3); }
        .daily-row span { padding: 3px 7px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 10px; font-weight: 800; white-space: nowrap; }
        .schedule-row { display: grid; grid-template-columns: auto 94px minmax(0, 1fr) auto; gap: 7px; align-items: center; padding: 8px; border-radius: 8px; background: var(--bg3); }
        .career-schedule-row { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 8px; align-items: center; padding: 9px; border-radius: 8px; background: var(--bg3); border-left: 3px solid #a855f7; }
        .career-schedule-row span { padding: 3px 7px; border-radius: 999px; background: rgba(168, 85, 247, 0.14); color: #a855f7; font-size: 10px; font-weight: 800; white-space: nowrap; }
        .career-schedule-row strong { min-width: 0; color: var(--text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .career-schedule-row small { grid-column: 1 / -1; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .daily-row button, .schedule-row button { min-width: 44px; min-height: 32px; border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 11px; padding: 7px 9px; }
        .daily-row input[type="checkbox"], .schedule-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
        .done-text { color: var(--muted) !important; text-decoration: line-through; }
        .empty-text { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; text-align: center; padding: 12px; }
        .habit-chip { border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); padding: 10px; text-align: left; cursor: pointer; font-size: 13px; }
        .habit-chip.done { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 800; }
        .deadline-list { display: flex; flex-direction: column; gap: 7px; }
        .deadline-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 9px; border-radius: 8px; background: var(--bg3); }
        .deadline-item span { padding: 3px 7px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 10px; font-weight: 900; white-space: nowrap; }
        .deadline-item strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
        .deadline-item small { color: var(--muted); font-size: 11px; white-space: nowrap; }
        .time-panel { grid-column: 1 / -1; }
        .time-blocks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .time-block-row { display: grid; grid-template-columns: 54px minmax(0, 1fr); align-items: center; gap: 7px; }
        .time-block-row span { color: var(--muted); font-size: 11px; font-weight: 800; }
        .time-block-row input { min-width: 0; height: 32px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 8px; font-size: 12px; outline: none; }
        @media (max-width: 900px) {
          .daily-header { align-items: stretch; flex-direction: column; }
          .daily-date-controls { justify-content: flex-start; }
          .daily-grid, .daily-summary { grid-template-columns: 1fr; }
          .time-blocks { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px) {
          .daily-add, .schedule-add, .daily-row, .schedule-row, .career-schedule-row, .time-blocks { grid-template-columns: 1fr; }
          .career-schedule-row small { grid-column: auto; }
        }
      `}</style>
    </div>
  )
}

function Summary({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <article className="daily-summary-card">
      <span>{label}</span>
      <b>{value}</b>
      <div className="daily-mini-progress"><i style={{ width: `${pct}%` }} /></div>
    </article>
  )
}

function DeadlineItem({ label, title, meta }: { label: string; title: string; meta: string }) {
  return (
    <div className="deadline-item">
      <span>{label}</span>
      <strong>{title}</strong>
      <small>{meta}</small>
    </div>
  )
}
