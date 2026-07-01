import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import type { CareerEventStatus, ScheduledTask } from '../types'
import { toLocalDateKey } from '../utils/date'
import { countCalendarLinkedItems, getCalendarLinkedItems, makeCalendarDays, type CalendarLinkedItems } from '../utils/calendar'
import {
  CAREER_CATEGORY_LABELS,
  CAREER_STATUS_LABELS,
  formatCareerDday,
  getCareerMilestones,
  getCareerNextMilestone,
} from '../utils/careerEvents'

type SourceKey = keyof CalendarLinkedItems

const SOURCE_META: Record<SourceKey, { label: string; className: string }> = {
  scheduled: { label: '예정', className: 'scheduled' },
  career: { label: '기회', className: 'career' },
  personalApplications: { label: '내 신청', className: 'personal' },
  jobPostings: { label: '공고', className: 'jobs' },
  todos: { label: 'Todo', className: 'todos' },
  tasks: { label: '작업', className: 'tasks' },
  goals: { label: '목표', className: 'goals' },
  projects: { label: '프로젝트', className: 'projects' },
}

const SOURCE_ORDER: SourceKey[] = ['scheduled', 'career', 'personalApplications', 'jobPostings', 'todos', 'tasks', 'goals', 'projects']

const dateLabel = (dateKey: string) =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    .format(new Date(`${dateKey}T12:00:00`))

const monthLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(new Date(year, month, 1))

export default function CalendarPage() {
  const {
    todos, setTodos,
    scheduledTasks, setScheduledTasks,
    careerEvents, setCareerEvents,
    personalApplications,
    jobPostings,
    tasks, goals, projects,
  } = useApp()
  const { setPage } = useRouter()
  const todayKey = toLocalDateKey()
  const today = new Date(`${todayKey}T12:00:00`)
  const [viewDate, setViewDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [visibleSources, setVisibleSources] = useState<Record<SourceKey, boolean>>({
    scheduled: true,
    career: true,
    personalApplications: true,
    jobPostings: true,
    todos: true,
    tasks: true,
    goals: true,
    projects: true,
  })
  const [quickTitle, setQuickTitle] = useState('')
  const [quickTime, setQuickTime] = useState('')
  const [quickCareerTitle, setQuickCareerTitle] = useState('')

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const days = useMemo(() => makeCalendarDays(year, month), [year, month])
  const calendarSources = { todos, scheduledTasks, careerEvents, personalApplications, jobPostings, tasks, goals, projects }

  const getItems = (date: string) => getCalendarLinkedItems(calendarSources, date, todayKey)
  const visibleCount = (items: CalendarLinkedItems) =>
    SOURCE_ORDER.reduce((total, source) => total + (visibleSources[source] ? items[source].length : 0), 0)

  const monthDateKeys = days
    .filter(date => date.getMonth() === month)
    .map(date => toLocalDateKey(date))
  const monthTotal = monthDateKeys.reduce((total, date) => total + countCalendarLinkedItems(getItems(date)), 0)
  const monthCareer = monthDateKeys.reduce((total, date) => total + getItems(date).career.length, 0)
  const monthTracked = monthDateKeys.reduce((total, date) =>
    total + getItems(date).personalApplications.length + getItems(date).jobPostings.length, 0)
  const selectedItems = getItems(selectedDate)
  const selectedTotal = visibleCount(selectedItems)

  const moveMonth = (amount: number) => {
    setViewDate(previous => new Date(previous.getFullYear(), previous.getMonth() + amount, 1))
  }
  const goToday = () => {
    setViewDate(today)
    setSelectedDate(todayKey)
  }
  const toggleSource = (source: SourceKey) => {
    setVisibleSources(previous => ({ ...previous, [source]: !previous[source] }))
  }

  const addScheduled = () => {
    const title = quickTitle.trim()
    if (!title) return
    const task: ScheduledTask = {
      id: `calendar-scheduled-${Date.now()}`,
      title,
      date: selectedDate,
      time: quickTime || undefined,
      done: false,
    }
    setScheduledTasks(previous => [...previous, task])
    setQuickTitle('')
    setQuickTime('')
  }

  const addCareer = () => {
    const title = quickCareerTitle.trim()
    if (!title) return
    setCareerEvents(previous => [...previous, {
      id: `calendar-career-${Date.now()}`,
      title,
      category: 'other',
      status: 'interested',
      date: selectedDate,
    }])
    setQuickCareerTitle('')
  }

  const setTodoDone = (id: string, done: boolean) => {
    setTodos(previous => previous.map(todo => todo.id === id ? { ...todo, done } : todo))
  }
  const setScheduledDone = (id: string, done: boolean) => {
    setScheduledTasks(previous => previous.map(task => task.id === id ? { ...task, done } : task))
  }
  const setCareerStatus = (id: string, status: CareerEventStatus) => {
    setCareerEvents(previous => previous.map(event => event.id === id ? { ...event, status } : event))
  }

  const makeEntries = (items: CalendarLinkedItems) => [
    ...items.scheduled.map(item => ({
      key: `scheduled-${item.id}`,
      source: 'scheduled' as SourceKey,
      title: item.title,
      detail: [item.time, item.location, item.note].filter(Boolean).join(' · '),
      done: item.done,
      action: (
        <input
          type="checkbox"
          checked={item.done}
          onChange={event => setScheduledDone(item.id, event.target.checked)}
          aria-label={`${item.title} 완료`}
        />
      ),
    })),
    ...items.career.map(item => {
      const next = getCareerNextMilestone(item, todayKey)
      const milestones = getCareerMilestones(item, selectedDate).filter(label => label !== '일정')
      return {
        key: `career-${item.id}`,
        source: 'career' as SourceKey,
        title: item.title,
        detail: [
          item.organization,
          milestones.join(' · ') || CAREER_CATEGORY_LABELS[item.category],
          next ? `${formatCareerDday(next.date, todayKey)} ${next.label}` : undefined,
        ].filter(Boolean).join(' · '),
        done: item.status === 'completed' || item.status === 'cancelled',
        action: (
          <select
            value={item.status}
            onChange={event => setCareerStatus(item.id, event.target.value as CareerEventStatus)}
            aria-label={`${item.title} 상태`}
          >
            {Object.entries(CAREER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        ),
      }
    }),
    ...items.personalApplications.map(item => {
      const markers = [
        item.deadline === selectedDate ? '마감' : undefined,
        item.appliedDate === selectedDate ? '신청일' : undefined,
        item.resultDate === selectedDate ? '결과' : undefined,
        item.startDate === selectedDate ? '시작' : undefined,
        item.endDate === selectedDate ? '종료' : undefined,
      ].filter(Boolean)
      return {
        key: `personal-${item.id}`,
        source: 'personalApplications' as SourceKey,
        title: item.title,
        detail: [item.organization, markers.join(' · ') || '내 신청'].filter(Boolean).join(' · '),
        done: ['rejected', 'finished', 'cancelled'].includes(item.status),
        action: (
          <button type="button" onClick={() => setPage('personalApplications')}>
            보기
          </button>
        ),
      }
    }),
    ...items.jobPostings.map(item => {
      const markers = [
        item.deadline === selectedDate ? '마감' : undefined,
        item.appliedDate === selectedDate ? '지원일' : undefined,
        item.resultDate === selectedDate ? '결과' : undefined,
      ].filter(Boolean)
      return {
        key: `job-${item.id}`,
        source: 'jobPostings' as SourceKey,
        title: `${item.company} · ${item.position}`,
        detail: markers.join(' · ') || '지원 공고',
        done: ['rejected', 'closed'].includes(item.status),
        action: (
          <button type="button" onClick={() => setPage('jobPostings')}>
            보기
          </button>
        ),
      }
    }),
    ...items.todos.map(item => ({
      key: `todo-${item.id}`,
      source: 'todos' as SourceKey,
      title: item.text,
      detail: item.priority === 'high' ? '중요 Todo' : 'Todo',
      done: item.done,
      action: (
        <input
          type="checkbox"
          checked={item.done}
          onChange={event => setTodoDone(item.id, event.target.checked)}
          aria-label={`${item.text} 완료`}
        />
      ),
    })),
    ...items.tasks.map(item => ({
      key: `task-${item.id}`,
      source: 'tasks' as SourceKey,
      title: item.name,
      detail: [item.priority, item.status, item.owner].filter(Boolean).join(' · '),
      done: item.done,
      action: null,
    })),
    ...items.goals.map(item => ({
      key: `goal-${item.id}`,
      source: 'goals' as SourceKey,
      title: item.name,
      detail: `진행률 ${item.pct}%`,
      done: item.pct >= 100,
      action: null,
    })),
    ...items.projects.map(item => ({
      key: `project-${item.id}`,
      source: 'projects' as SourceKey,
      title: item.name,
      detail: `진행률 ${item.pct}%`,
      done: item.pct >= 100,
      action: null,
    })),
  ].filter(entry => visibleSources[entry.source])

  return (
    <div className="calendar-page">
      <header className="calendar-page-header">
        <div>
          <h2>캘린더</h2>
          <p>Todo, 예정 작업, 기회 일정, 내 신청, 지원 공고, 작업 관리, 목표와 프로젝트 마감을 날짜 기준으로 모아 봅니다.</p>
        </div>
        <div className="calendar-page-controls">
          <button type="button" onClick={() => moveMonth(-1)}>이전</button>
          <strong>{monthLabel(year, month)}</strong>
          <button type="button" onClick={() => moveMonth(1)}>다음</button>
          <button type="button" onClick={goToday}>오늘</button>
        </div>
      </header>

      <section className="calendar-summary">
        <Summary label="이번 달 항목" value={monthTotal} />
        <Summary label="기회 일정" value={monthCareer} />
        <Summary label="내 신청/공고" value={monthTracked} />
        <Summary label="선택일 항목" value={selectedTotal} />
      </section>

      <section className="calendar-source-filter" aria-label="캘린더 표시 항목">
        {SOURCE_ORDER.map(source => (
          <button
            key={source}
            type="button"
            className={visibleSources[source] ? `active ${SOURCE_META[source].className}` : ''}
            onClick={() => toggleSource(source)}
          >
            {SOURCE_META[source].label}
          </button>
        ))}
      </section>

      <section className="calendar-workspace">
        <div className="calendar-month-grid" aria-label="월간 캘린더">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
          {days.map(day => {
            const dateKey = toLocalDateKey(day)
            const items = getItems(dateKey)
            const entries = makeEntries(items)
            const currentMonth = day.getMonth() === month
            const selected = dateKey === selectedDate
            return (
              <button
                type="button"
                key={dateKey}
                className={[
                  'calendar-day-cell',
                  currentMonth ? '' : 'muted',
                  selected ? 'selected' : '',
                  dateKey === todayKey ? 'today' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedDate(dateKey)}
              >
                <span className="calendar-day-number">{day.getDate()}</span>
                <div className="calendar-day-events">
                  {entries.slice(0, 4).map(entry => (
                    <span key={entry.key} className={`calendar-event-dot ${SOURCE_META[entry.source].className}`}>
                      {entry.title}
                    </span>
                  ))}
                  {entries.length > 4 && <small>+{entries.length - 4}개</small>}
                </div>
              </button>
            )
          })}
        </div>

        <aside className="calendar-agenda">
          <div className="agenda-heading">
            <div>
              <h3>{dateLabel(selectedDate)}</h3>
              <span>{selectedTotal}개 항목</span>
            </div>
            <div className="agenda-actions">
              <button type="button" onClick={() => setPage('career')}>기회 일정</button>
              <button type="button" onClick={() => setPage('personalApplications')}>내 신청</button>
              <button type="button" onClick={() => setPage('jobPostings')}>지원 공고</button>
            </div>
          </div>

          <div className="quick-add-panel">
            <div className="quick-add-row">
              <input type="time" value={quickTime} onChange={event => setQuickTime(event.target.value)} aria-label="예정 작업 시간" />
              <input
                value={quickTitle}
                onChange={event => setQuickTitle(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) addScheduled() }}
                placeholder="예정 작업 빠른 추가"
              />
              <button type="button" onClick={addScheduled}>추가</button>
            </div>
            <div className="quick-add-row career">
              <input
                value={quickCareerTitle}
                onChange={event => setQuickCareerTitle(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) addCareer() }}
                placeholder="기회 일정 빠른 추가"
              />
              <button type="button" onClick={addCareer}>기회 추가</button>
            </div>
          </div>

          <div className="agenda-list">
            {makeEntries(selectedItems).length === 0 ? (
              <p className="empty-text">선택한 날짜에 표시할 항목이 없습니다.</p>
            ) : makeEntries(selectedItems).map(entry => (
              <article key={entry.key} className={`agenda-item ${SOURCE_META[entry.source].className}`}>
                <span>{SOURCE_META[entry.source].label}</span>
                <div>
                  <strong className={entry.done ? 'done-text' : ''}>{entry.title}</strong>
                  {entry.detail && <small>{entry.detail}</small>}
                </div>
                {entry.action}
              </article>
            ))}
          </div>
        </aside>
      </section>

      <style>{`
        .calendar-page { max-width: 1220px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 14px; }
        .calendar-page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; }
        .calendar-page-header h2 { margin: 0 0 6px; font-size: 24px; letter-spacing: 0; }
        .calendar-page-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .calendar-page-controls { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 7px; }
        .calendar-page-controls button, .agenda-heading button, .quick-add-panel button { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .calendar-page-controls strong { min-width: 130px; text-align: center; font-size: 14px; }
        .calendar-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .calendar-summary-card { min-width: 0; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .calendar-summary-card span { display: block; color: var(--muted); font-size: 11px; font-weight: 800; }
        .calendar-summary-card strong { display: block; margin-top: 5px; font-size: 24px; line-height: 1.05; }
        .calendar-summary-card.urgent { border-color: rgba(224, 82, 82, 0.35); background: rgba(224, 82, 82, 0.08); }
        .calendar-source-filter { display: flex; flex-wrap: wrap; gap: 6px; }
        .calendar-source-filter button { height: 32px; border: 1px solid var(--border); border-radius: 999px; background: var(--bg3); color: var(--muted); padding: 0 12px; font-size: 12px; cursor: pointer; }
        .calendar-source-filter button.active { color: var(--text); font-weight: 800; }
        .calendar-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 14px; align-items: start; }
        .calendar-month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--bg2); }
        .calendar-weekday { padding: 9px 6px; border-bottom: 1px solid var(--border); background: var(--bg3); color: var(--muted); font-size: 12px; font-weight: 800; text-align: center; }
        .calendar-day-cell { min-height: 128px; min-width: 0; border: 0; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--bg2); color: var(--text); padding: 8px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 6px; }
        .calendar-day-cell:nth-child(7n + 7) { border-right: 0; }
        .calendar-day-cell.muted { color: var(--muted); background: var(--bg); opacity: 0.62; }
        .calendar-day-cell.selected { outline: 2px solid var(--accent); outline-offset: -2px; }
        .calendar-day-cell.today .calendar-day-number { background: var(--accent); color: #fff; }
        .calendar-day-number { width: 26px; height: 26px; border-radius: 999px; display: grid; place-items: center; font-size: 13px; font-weight: 800; }
        .calendar-day-events { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .calendar-event-dot { min-width: 0; border-left: 3px solid var(--accent); border-radius: 4px; background: var(--bg3); padding: 3px 5px; color: var(--text); font-size: 11px; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .calendar-event-dot.scheduled, .agenda-item.scheduled { border-color: #3b82f6; }
        .calendar-event-dot.career, .agenda-item.career { border-color: #a855f7; }
        .calendar-event-dot.personal, .agenda-item.personal { border-color: #14b8a6; }
        .calendar-event-dot.jobs, .agenda-item.jobs { border-color: #f97316; }
        .calendar-event-dot.todos, .agenda-item.todos { border-color: #f59e0b; }
        .calendar-event-dot.tasks, .agenda-item.tasks { border-color: #64748b; }
        .calendar-event-dot.goals, .agenda-item.goals { border-color: #10b981; }
        .calendar-event-dot.projects, .agenda-item.projects { border-color: #0ea5e9; }
        .calendar-day-events small { color: var(--muted); font-size: 10px; }
        .calendar-agenda { border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .agenda-heading { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .agenda-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
        .agenda-heading h3 { margin: 0 0 3px; font-size: 16px; letter-spacing: 0; }
        .agenda-heading span { color: var(--muted); font-size: 12px; }
        .quick-add-panel { display: flex; flex-direction: column; gap: 7px; }
        .quick-add-row { display: grid; grid-template-columns: 86px minmax(0, 1fr) auto; gap: 6px; }
        .quick-add-row.career { grid-template-columns: minmax(0, 1fr) auto; }
        .quick-add-row input { min-width: 0; height: 34px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 9px; font-size: 12px; outline: none; }
        .agenda-list { display: flex; flex-direction: column; gap: 7px; }
        .agenda-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 9px; border-left: 3px solid var(--accent); border-radius: 8px; background: var(--bg3); }
        .agenda-item > span { padding: 3px 7px; border-radius: 999px; background: var(--bg4); color: var(--muted); font-size: 10px; font-weight: 800; white-space: nowrap; }
        .agenda-item strong { display: block; min-width: 0; color: var(--text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agenda-item small { display: block; margin-top: 2px; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agenda-item input[type="checkbox"] { width: 17px; height: 17px; accent-color: var(--accent); }
        .agenda-item select { max-width: 112px; min-width: 92px; height: 30px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg2); color: var(--text); font-size: 11px; }
        .agenda-item button { min-height: 30px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg2); color: var(--text); padding: 0 10px; font-size: 11px; font-weight: 800; cursor: pointer; }
        .done-text { color: var(--muted) !important; text-decoration: line-through; }
        .empty-text { margin: 0; padding: 18px; color: var(--muted); text-align: center; font-size: 12px; }
        @media (max-width: 980px) {
          .calendar-page-header { align-items: stretch; flex-direction: column; }
          .calendar-page-controls { justify-content: flex-start; }
          .calendar-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .calendar-workspace { grid-template-columns: 1fr; }
          .calendar-agenda { order: -1; }
        }
        @media (max-width: 640px) {
          .calendar-summary { grid-template-columns: 1fr; }
          .calendar-month-grid { overflow-x: auto; display: block; white-space: nowrap; }
          .calendar-weekday, .calendar-day-cell { display: inline-flex; width: 132px; white-space: normal; vertical-align: top; box-sizing: border-box; }
          .calendar-weekday { justify-content: center; }
          .calendar-day-cell { min-height: 116px; }
          .quick-add-row, .quick-add-row.career, .agenda-item { grid-template-columns: 1fr; }
          .agenda-item select { max-width: none; width: 100%; }
        }
      `}</style>
    </div>
  )
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: 'urgent' }) {
  return (
    <article className={tone === 'urgent' ? 'calendar-summary-card urgent' : 'calendar-summary-card'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
