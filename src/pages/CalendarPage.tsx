import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { PageHeader } from '../components/ui/PageHeader'
import { IconButton } from '../components/ui/IconButton'
import type { CareerEventStatus, ScheduledTask } from '../types'
import { toLocalDateKey } from '../utils/date'
import { countCalendarLinkedItems, getCalendarLinkedItems, makeCalendarDays, type CalendarLinkedItems } from '../utils/calendar'
import {
  CAREER_CATEGORY_LABELS,
  CAREER_STATUS_LABELS,
  formatCareerDday,
  getCareerMilestones,
  getCareerNextMilestone,
  syncCareerEventDateFields,
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

const isPastDate = (dateKey: string, todayKey: string) => dateKey < todayKey

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
  const activeSourceCount = SOURCE_ORDER.filter(source => visibleSources[source]).length

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
    const careerEvent = syncCareerEventDateFields({
      id: `calendar-career-${Date.now()}`,
      title,
      category: 'other',
      status: 'interested',
      date: selectedDate,
    })
    setCareerEvents(previous => [...previous, careerEvent])
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

  const selectedEntries = makeEntries(selectedItems)
  const selectedDoneCount = selectedEntries.filter(entry => entry.done).length
  const selectedActionCount = selectedEntries.length - selectedDoneCount
  const selectedDatePast = isPastDate(selectedDate, todayKey)

  return (
    <div className="calendar-page">
      <PageHeader
        title="캘린더"
        description="날짜가 있는 할 일, 일정, 신청과 마감을 한 흐름에서 확인합니다."
        actions={(
          <div className="calendar-page-controls">
            <IconButton label="이전 달" icon={<ChevronLeft size={17} />} size="sm" variant="secondary" onClick={() => moveMonth(-1)} />
            <strong>{monthLabel(year, month)}</strong>
            <IconButton label="다음 달" icon={<ChevronRight size={17} />} size="sm" variant="secondary" onClick={() => moveMonth(1)} />
            <IconButton label="오늘로 이동" icon={<RotateCcw size={16} />} size="sm" variant="secondary" onClick={goToday} />
          </div>
        )}
      />

      <section className="calendar-summary">
        <Summary label="이번 달 항목" value={monthTotal} />
        <Summary label="기회 일정" value={monthCareer} />
        <Summary label="내 신청/공고" value={monthTracked} />
        <Summary label="선택일 항목" value={selectedTotal} />
      </section>

      <section className="calendar-source-filter" aria-label="캘린더 표시 항목">
        <div className="planner-section-heading compact">
          <div>
            <h3>표시 항목</h3>
            <p>월력과 오른쪽 상세 패널에 보여줄 데이터 범위를 빠르게 조절합니다.</p>
          </div>
          <small>{activeSourceCount}/{SOURCE_ORDER.length}개 활성화</small>
        </div>
        <div className="calendar-source-filter-buttons">
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
        </div>
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
              <span>{selectedTotal}개 항목 · {selectedDatePast ? '지난 날짜' : selectedDate === todayKey ? '오늘' : '다가오는 날짜'}</span>
            </div>
            <div className="agenda-actions">
              <button type="button" className="planner-button secondary" onClick={() => setPage('career')}>기회 일정</button>
              <button type="button" className="planner-button secondary" onClick={() => setPage('personalApplications')}>내 신청</button>
              <button type="button" className="planner-button secondary" onClick={() => setPage('jobPostings')}>지원 공고</button>
            </div>
          </div>

          <div className="agenda-meta">
            <span className="planner-chip">남은 항목 {selectedActionCount}개</span>
            <span className="planner-chip">완료/종료 {selectedDoneCount}개</span>
            <span className="planner-chip">선택 소스 {activeSourceCount}개</span>
          </div>

          <div className="quick-add-panel">
            <div className="planner-section-heading compact">
              <div>
                <h3>빠른 추가</h3>
                <p>선택한 날짜에 예정 작업이나 기회 일정을 바로 올립니다.</p>
              </div>
              <small>{selectedDate}</small>
            </div>
            <div className="quick-add-row">
              <input className="planner-input" type="time" value={quickTime} onChange={event => setQuickTime(event.target.value)} aria-label="예정 작업 시간" />
              <input
                className="planner-input"
                value={quickTitle}
                onChange={event => setQuickTitle(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) addScheduled() }}
                placeholder="예정 작업 빠른 추가"
              />
              <button type="button" className="planner-button" onClick={addScheduled}>추가</button>
            </div>
            <div className="quick-add-row career">
              <input
                className="planner-input"
                value={quickCareerTitle}
                onChange={event => setQuickCareerTitle(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) addCareer() }}
                placeholder="기회 일정 빠른 추가"
              />
              <button type="button" className="planner-button" onClick={addCareer}>기회 추가</button>
            </div>
          </div>

          <div className="agenda-list">
            {selectedEntries.length === 0 ? (
              <p className="empty-text">선택한 날짜에 표시할 항목이 없습니다.</p>
            ) : selectedEntries.map(entry => (
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
