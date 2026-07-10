import { useMemo, useState, type ReactNode } from 'react'
import { Printer } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
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
      <PageHeader
        title="플래너 출력"
        description="저장된 계획을 일일 또는 주간 종이 플래너로 구성합니다."
        actions={<div className="print-controls">
          <select value={mode} onChange={event => setMode(event.target.value as PrintMode)}>
            <option value="daily">오늘 플래너</option>
            <option value="weekly">주간 플래너</option>
            <option value="blank">빈 양식</option>
          </select>
          <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} />
          <Button icon={<Printer size={16} />} onClick={() => window.print()}>인쇄</Button>
        </div>}
      />

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
