import { useMemo, useState, type ReactNode } from 'react'
import { useApp } from '../store/AppContext'
import { addLocalDays, toLocalDateKey } from '../utils/date'
import { isHabitScheduled } from '../utils/habits'

type PrintMode = 'daily' | 'weekly' | 'blank'

const getWeekStart = (date = new Date()) => {
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  return addLocalDays(date, mondayOffset)
}

const makeWeekDates = (start: Date) =>
  Array.from({ length: 7 }, (_, index) => toLocalDateKey(addLocalDays(start, index)))

const formatDate = (dateKey: string) =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    .format(new Date(`${dateKey}T12:00:00`))

const formatShortDate = (dateKey: string) =>
  new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
    .format(new Date(`${dateKey}T12:00:00`))

export default function PrintPlanner() {
  const {
    todos, scheduledTasks, habits, habitHistory, goals, projects, weekTasks,
  } = useApp()
  const [mode, setMode] = useState<PrintMode>('daily')
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey())
  const todayKey = toLocalDateKey()
  const dateObj = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate])
  const weekStart = useMemo(() => getWeekStart(dateObj), [dateObj])
  const weekDates = useMemo(() => makeWeekDates(weekStart), [weekStart])
  const weekKey = toLocalDateKey(weekStart)
  const selectedWeekIncludesToday = weekDates.includes(todayKey)

  const dayTodos = mode === 'blank'
    ? []
    : todos.filter(todo => (!todo.date && selectedDate === todayKey) || todo.date === selectedDate)
  const daySchedules = mode === 'blank'
    ? []
    : scheduledTasks.filter(task => task.date === selectedDate)
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  const activeHabits = mode === 'blank' ? [] : habits.filter(habit => isHabitScheduled(habit, dateObj))
  const habitRecord = habitHistory[selectedDate] ?? {}
  const dueItems = mode === 'blank' ? [] : [
    ...goals.filter(goal => goal.due === selectedDate).map(goal => ({ id: goal.id, text: goal.name, meta: `목표 ${goal.pct}%` })),
    ...projects.filter(project => project.due === selectedDate).map(project => ({ id: project.id, text: project.name, meta: `프로젝트 ${project.pct}%` })),
  ]

  const weekTodoCount = todos.filter(todo =>
    todo.date ? weekDates.includes(todo.date) : selectedWeekIncludesToday
  ).length
  const weeklyFocus = mode === 'blank' ? [] : (weekTasks[weekKey] ?? [])

  return (
    <div className="print-page">
      <header className="print-header">
        <div>
          <h2>플래너 출력</h2>
          <p>현재 저장된 Todo, 일정, 루틴, 목표를 종이 플래너 양식으로 정리합니다.</p>
        </div>
        <div className="print-controls">
          <select value={mode} onChange={event => setMode(event.target.value as PrintMode)}>
            <option value="daily">오늘 플래너</option>
            <option value="weekly">주간 플래너</option>
            <option value="blank">빈 양식</option>
          </select>
          <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} />
          <button type="button" onClick={() => window.print()}>인쇄</button>
        </div>
      </header>

      <section className="print-sheet" aria-label="출력 미리보기">
        {mode === 'weekly' ? (
          <WeeklySheet
            weekDates={weekDates}
            selectedWeekIncludesToday={selectedWeekIncludesToday}
            todayKey={todayKey}
            todos={todos}
            scheduledTasks={scheduledTasks}
            goals={goals}
            projects={projects}
            weeklyFocus={weeklyFocus}
            weekTodoCount={weekTodoCount}
          />
        ) : (
          <DailySheet
            title={mode === 'blank' ? '빈 일일 플래너' : '일일 플래너'}
            selectedDate={selectedDate}
            todos={dayTodos}
            schedules={daySchedules}
            habits={activeHabits.map(habit => ({ id: habit.id, name: habit.name, done: !!habitRecord[habit.id] }))}
            dueItems={dueItems}
            blank={mode === 'blank'}
          />
        )}
      </section>

      <style>{`
        .print-page { max-width: 1040px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .print-header { display: flex; justify-content: space-between; gap: 14px; align-items: flex-end; }
        .print-header h2 { margin: 0 0 6px; font-size: 24px; letter-spacing: 0; }
        .print-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .print-controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
        .print-controls select, .print-controls input { min-width: 0; height: 36px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 10px; font-size: 13px; outline: none; }
        .print-controls button { height: 36px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 14px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .print-sheet { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 18px; }
        .sheet-title { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; border-bottom: 2px solid var(--text); padding-bottom: 12px; margin-bottom: 14px; }
        .sheet-title h3 { margin: 0 0 5px; font-size: 24px; letter-spacing: 0; }
        .sheet-title p { margin: 0; color: var(--muted); font-size: 13px; }
        .sheet-title span { color: var(--muted); font-size: 12px; font-weight: 800; white-space: nowrap; }
        .sheet-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
        .sheet-section { min-height: 150px; border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: var(--bg3); }
        .sheet-section h4 { margin: 0 0 9px; font-size: 13px; letter-spacing: 0; }
        .sheet-list { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
        .sheet-list li { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 8px; align-items: start; font-size: 12px; line-height: 1.35; }
        .sheet-list small { color: var(--muted); font-size: 10px; white-space: nowrap; }
        .check-box { width: 13px; height: 13px; border: 1px solid var(--muted); border-radius: 3px; margin-top: 1px; }
        .check-box.done { background: var(--accent); border-color: var(--accent); }
        .blank-lines { display: grid; gap: 10px; }
        .blank-lines span { height: 18px; border-bottom: 1px solid var(--border); }
        .week-sheet-grid { display: grid; grid-template-columns: repeat(7, minmax(96px, 1fr)); gap: 8px; overflow-x: auto; }
        .week-print-day { min-height: 180px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); padding: 10px; }
        .week-print-day strong { display: block; font-size: 12px; margin-bottom: 8px; }
        .week-print-day p { margin: 7px 0 0; font-size: 11px; line-height: 1.35; word-break: break-word; }
        .week-print-day .muted, .sheet-empty { color: var(--muted); font-size: 11px; }
        .weekly-focus { margin-bottom: 12px; }
        @media (max-width: 900px) {
          .print-header { align-items: stretch; flex-direction: column; }
          .print-controls { justify-content: flex-start; }
          .sheet-grid { grid-template-columns: 1fr; }
        }
        @media print {
          body * { visibility: hidden !important; }
          .print-page, .print-page * { visibility: visible !important; }
          .print-page {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
            color: #111;
            background: #fff;
          }
          .print-header p, .print-controls { display: none !important; }
          .print-sheet {
            border: 0;
            border-radius: 0;
            padding: 0;
            background: #fff;
          }
          .sheet-section, .week-print-day {
            break-inside: avoid;
            background: #fff;
            border-color: #999;
          }
          .sheet-title { border-color: #111; }
          .week-sheet-grid { overflow: visible; grid-template-columns: repeat(7, 1fr); }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  )
}

function DailySheet({
  title,
  selectedDate,
  todos,
  schedules,
  habits,
  dueItems,
  blank,
}: {
  title: string
  selectedDate: string
  todos: { id: string; text: string; done: boolean }[]
  schedules: { id: string; title: string; time?: string; done: boolean }[]
  habits: { id: string; name: string; done: boolean }[]
  dueItems: { id: string; text: string; meta: string }[]
  blank: boolean
}) {
  return (
    <>
      <div className="sheet-title">
        <div>
          <h3>{title}</h3>
          <p>{formatDate(selectedDate)}</p>
        </div>
        <span>나만의 플래너</span>
      </div>
      <div className="sheet-grid">
        <SheetSection title="Todo">
          <SheetList
            items={blank ? [] : todos.map(todo => ({ id: todo.id, text: todo.text, done: todo.done }))}
            empty="오늘 Todo가 없습니다."
            blank={blank}
          />
        </SheetSection>
        <SheetSection title="일정">
          <SheetList
            items={blank ? [] : schedules.map(schedule => ({
              id: schedule.id,
              text: schedule.title,
              done: schedule.done,
              meta: schedule.time,
            }))}
            empty="오늘 일정이 없습니다."
            blank={blank}
          />
        </SheetSection>
        <SheetSection title="루틴">
          <SheetList
            items={blank ? [] : habits.map(habit => ({ id: habit.id, text: habit.name, done: habit.done }))}
            empty="오늘 예정된 루틴이 없습니다."
            blank={blank}
          />
        </SheetSection>
        <SheetSection title="마감과 메모">
          <SheetList
            items={blank ? [] : dueItems.map(item => ({ id: item.id, text: item.text, meta: item.meta, done: false }))}
            empty="오늘 마감 항목이 없습니다."
            blank={blank}
          />
        </SheetSection>
      </div>
    </>
  )
}

function WeeklySheet({
  weekDates,
  selectedWeekIncludesToday,
  todayKey,
  todos,
  scheduledTasks,
  goals,
  projects,
  weeklyFocus,
  weekTodoCount,
}: {
  weekDates: string[]
  selectedWeekIncludesToday: boolean
  todayKey: string
  todos: { id: string; text: string; date?: string; done: boolean }[]
  scheduledTasks: { id: string; title: string; date: string; time?: string }[]
  goals: { id: string; name: string; due?: string; pct: number }[]
  projects: { id: string; name: string; due?: string; pct: number }[]
  weeklyFocus: { id: string; text: string; done: boolean; cat?: string }[]
  weekTodoCount: number
}) {
  return (
    <>
      <div className="sheet-title">
        <div>
          <h3>주간 플래너</h3>
          <p>{formatShortDate(weekDates[0])} - {formatShortDate(weekDates[6])}</p>
        </div>
        <span>Todo {weekTodoCount}개</span>
      </div>
      <div className="sheet-section weekly-focus">
        <h4>이번 주 핵심 작업</h4>
        <SheetList
          items={weeklyFocus.map(item => ({
            id: item.id,
            text: item.text,
            done: item.done,
            meta: item.cat,
          }))}
          empty="이번 주 핵심 작업이 없습니다."
          blank={false}
        />
      </div>
      <div className="week-sheet-grid">
        {weekDates.map(date => {
          const dayTodos = todos.filter(todo => todo.date ? todo.date === date : selectedWeekIncludesToday && date === todayKey)
          const schedules = scheduledTasks.filter(task => task.date === date)
          const dueItems = [
            ...goals.filter(goal => goal.due === date).map(goal => `${goal.name} (${goal.pct}%)`),
            ...projects.filter(project => project.due === date).map(project => `${project.name} (${project.pct}%)`),
          ]
          const empty = dayTodos.length + schedules.length + dueItems.length === 0
          return (
            <article key={date} className="week-print-day">
              <strong>{formatShortDate(date)}</strong>
              {dayTodos.slice(0, 4).map(todo => <p key={todo.id}>Todo · {todo.text}</p>)}
              {schedules.slice(0, 4).map(schedule => (
                <p key={schedule.id}>{schedule.time ? `${schedule.time} ` : ''}{schedule.title}</p>
              ))}
              {dueItems.slice(0, 3).map(item => <p key={item}>마감 · {item}</p>)}
              {empty && <p className="muted">비어 있음</p>}
            </article>
          )
        })}
      </div>
    </>
  )
}

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sheet-section">
      <h4>{title}</h4>
      {children}
    </section>
  )
}

function SheetList({
  items,
  empty,
  blank,
}: {
  items: { id: string; text: string; done: boolean; meta?: string }[]
  empty: string
  blank: boolean
}) {
  if (blank) {
    return (
      <div className="blank-lines">
        {Array.from({ length: 7 }, (_, index) => <span key={index} />)}
      </div>
    )
  }
  if (items.length === 0) return <p className="sheet-empty">{empty}</p>
  return (
    <ul className="sheet-list">
      {items.map(item => (
        <li key={item.id}>
          <span className={item.done ? 'check-box done' : 'check-box'} />
          <span>{item.text}</span>
          {item.meta && <small>{item.meta}</small>}
        </li>
      ))}
    </ul>
  )
}
