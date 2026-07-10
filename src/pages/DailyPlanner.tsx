import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { IconButton } from '../components/ui/IconButton'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
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
type DeleteTarget = { type: 'todo' | 'schedule'; id: string } | null

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
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

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
  const nextTodo = dayTodos.find(todo => !todo.done)
  const nextSchedule = daySchedules.find(task => !task.done)
  const nextCareerEvent = dayCareerEvents.find(event => event.status !== 'completed' && event.status !== 'cancelled')
  const nextDeadline = dueTasks[0]?.name ?? dueProjects[0]?.name ?? dueGoals[0]?.name
  const dayDoneUnits = todoDone + habitDone + scheduleDone
  const dayTotalUnits = dayTodos.length + activeHabits.length + scheduleTotal
  const dayPace = dayTotalUnits === 0 ? 0 : Math.round((dayDoneUnits / dayTotalUnits) * 100)

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
    setDeleteTarget({ type: 'todo', id })
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
    setDeleteTarget({ type: 'schedule', id })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'todo') {
      setTodos(prev => prev.filter(todo => todo.id !== deleteTarget.id))
    } else {
      setScheduledTasks(prev => prev.filter(task => task.id !== deleteTarget.id))
    }
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
      <PageHeader
        title="일일 플래너"
        description="하루의 실행 항목, 루틴, 일정과 시간 블록을 한 화면에서 조정합니다."
        actions={<div className="daily-date-controls">
          <IconButton label="어제" icon={<ChevronLeft size={17} />} size="sm" variant="secondary" onClick={() => shiftDate(-1)} />
          <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} />
          <IconButton label="내일" icon={<ChevronRight size={17} />} size="sm" variant="secondary" onClick={() => shiftDate(1)} />
          <IconButton label="오늘" icon={<RotateCcw size={16} />} size="sm" variant="secondary" onClick={() => setSelectedDate(toLocalDateKey())} />
        </div>}
      />

      <section className="daily-summary">
        <Summary label="Todo" value={`${todoDone}/${dayTodos.length}`} pct={todoPct} />
        <Summary label="루틴" value={`${habitDone}/${activeHabits.length}`} pct={habitPct} />
        <Summary label="일정" value={String(scheduleTotal)} pct={schedulePct} />
        <Summary label="마감" value={String(deadlineTotal)} pct={deadlineTotal > 0 ? 100 : 0} />
      </section>

      <section className="daily-focus-board">
        <article className="daily-pace-card">
          <span>오늘 진행감</span>
          <strong>{dayPace}%</strong>
          <div className="daily-pace-bar"><i style={{ width: `${dayPace}%` }} /></div>
        </article>
        <FocusItem label="다음 Todo" title={nextTodo?.text ?? '남은 Todo 없음'} meta={nextTodo ? CATEGORY_LABEL[(nextTodo.category as typeof TODO_CATEGORIES[number]) ?? 'work'] ?? '업무' : '정리됨'} />
        <FocusItem
          label="다음 일정"
          title={nextSchedule?.title ?? nextCareerEvent?.title ?? '예정 없음'}
          meta={nextSchedule?.time ?? nextCareerEvent?.time ?? '시간 미지정'}
        />
        <FocusItem label="연결 마감" title={nextDeadline ?? '오늘 마감 없음'} meta={`${deadlineTotal}개`} />
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={deleteTarget?.type === 'todo' ? 'Todo 삭제' : '일정 삭제'}
        description="선택한 항목을 삭제합니다."
        confirmLabel="삭제"
        danger
      />


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

function FocusItem({ label, title, meta }: { label: string; title: string; meta: string }) {
  return (
    <article className="daily-focus-item">
      <span>{label}</span>
      <strong>{title}</strong>
      <small>{meta}</small>
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
