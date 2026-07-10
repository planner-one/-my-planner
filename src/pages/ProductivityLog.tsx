import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { IconButton } from '../components/ui/IconButton'
import { addLocalDays, toLocalDateKey } from '../utils/date'
import {
  getProductivityDayLog,
  getRecentDateKeys,
  type ProductivityActivitySection,
} from '../utils/productivity'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler)

const PART_LABELS = {
  todo: 'Todo',
  habit: '루틴',
  scheduled: '예정',
  focus: '집중',
} as const

const PART_META = {
  todo: '완료 Todo 비율',
  habit: '그날 루틴 체크',
  scheduled: '예정 작업 완료',
  focus: '집중 세션 목표',
} as const

const EMPTY_TEXT: Record<ProductivityActivitySection['id'], string> = {
  todos: '기록된 Todo가 없습니다.',
  habits: '해당 날짜에 예정된 루틴이 없습니다.',
  scheduled: '예정 작업이 없습니다.',
  focus: '집중 세션 기록이 없습니다.',
  topGoals: '하루 방향 기록이 없습니다.',
  deadlines: '마감 작업이 없습니다.',
  timeBlocks: '시간 블록 기록이 없습니다.',
  journal: '저널 기록이 없습니다.',
  review: '회고 기록이 없습니다.',
}

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const getRate = (done: number, total: number) =>
  total === 0 ? 0 : clampPct((done / total) * 100)

const getThemeAccent = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3a7d50'

const withAlpha = (color: string, alpha: number) => {
  const hex = color.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return `rgba(58, 125, 80, ${alpha})`
  const value = Number.parseInt(hex, 16)
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

const formatShortDate = (date: string) => {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

const formatWeekday = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR', { weekday: 'short' })

const PART_COLORS: Record<keyof typeof PART_LABELS, string> = {
  todo: '#2f855a',
  habit: '#2b6cb0',
  scheduled: '#b7791f',
  focus: '#805ad5',
}

const MAX_SECTION_ITEMS = 6

export default function ProductivityLog() {
  const {
    todos, todoHistory, habits, habitHistory, scheduledTasks, counters,
    tasks, goals, projects, topGoals, reviewHistory, journal, timeBlockData,
  } = useApp()
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey())
  const [accent, setAccent] = useState(getThemeAccent)
  const today = toLocalDateKey()

  useEffect(() => {
    const syncAccent = () => setAccent(getThemeAccent())
    const observer = new MutationObserver(syncAccent)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const createLog = (date: string) => getProductivityDayLog({
    date,
    todos,
    todoHistory,
    habits,
    habitHistory,
    scheduledTasks,
    counters,
    tasks,
    goals,
    projects,
    topGoals,
    reviewHistory,
    journal,
    timeBlockData,
  })

  const selectedLog = useMemo(() => createLog(selectedDate), [
    selectedDate,
    todos,
    todoHistory,
    habits,
    habitHistory,
    scheduledTasks,
    counters,
    tasks,
    goals,
    projects,
    topGoals,
    reviewHistory,
    journal,
    timeBlockData,
  ])

  const trendLogs = useMemo(() => getRecentDateKeys(14)
    .map(date => createLog(date)), [
      todos,
      todoHistory,
      habits,
      habitHistory,
      scheduledTasks,
      counters,
      tasks,
      goals,
      projects,
      topGoals,
      reviewHistory,
      journal,
      timeBlockData,
    ])

  const recentLogs = useMemo(() => trendLogs
    .filter(log => log.score || log.sections.some(section => section.total > 0 || section.items.length > 0))
    .slice()
    .reverse(), [trendLogs])

  const monthLogs = useMemo(() => getRecentDateKeys(30)
    .map(date => createLog(date))
    .filter(log => log.score), [
      todos,
      todoHistory,
      habits,
      habitHistory,
      scheduledTasks,
      counters,
      tasks,
      goals,
      projects,
      topGoals,
      reviewHistory,
      journal,
      timeBlockData,
    ])

  const dateObj = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate])
  const scoreParts = selectedLog.score
    ? Object.entries(selectedLog.score.parts).map(([key, value]) => ({
        id: key as keyof typeof PART_LABELS,
        label: PART_LABELS[key as keyof typeof PART_LABELS],
        meta: PART_META[key as keyof typeof PART_META],
        value,
      }))
    : []
  const visibleSections = selectedLog.sections.filter(section =>
    section.total > 0 || section.items.length > 0 || ['todos', 'habits', 'scheduled', 'focus'].includes(section.id)
  )
  const actionableSections = selectedLog.sections.filter(section =>
    ['todos', 'habits', 'scheduled', 'focus'].includes(section.id)
  )
  const hasFocusScore = selectedLog.score?.parts.focus != null
  const summarySections = selectedLog.sections.filter(section =>
    section.id !== 'focus' || hasFocusScore || section.done > 0
  )
  const doneItems = summarySections.reduce((sum, section) =>
    sum + (section.total > 0 ? Math.min(section.done, section.total) : section.done), 0)
  const totalItems = summarySections.reduce((sum, section) => sum + section.total, 0)
  const openItems = summarySections.reduce((sum, section) =>
    sum + section.items.filter(item => item.status === 'open').length, 0)
  const recordedSections = selectedLog.sections.filter(section =>
    section.total > 0 || section.items.length > 0
  ).length
  const monthAverage = monthLogs.length
    ? Math.round(monthLogs.reduce((sum, log) => sum + (log.score?.score ?? 0), 0) / monthLogs.length)
    : null
  const focusSection = selectedLog.sections.find(section => section.id === 'focus')
  const lowestSection = actionableSections
    .filter(section => section.total > 0)
    .map(section => ({ section, rate: getRate(section.done, section.total) }))
    .sort((a, b) => a.rate - b.rate)[0]
  const focusText = focusSection
    && (hasFocusScore || focusSection.done > 0)
    ? `${Math.min(focusSection.done, focusSection.total)}/${focusSection.total}회`
    : '-'
  const scoreTone = selectedLog.score
    ? selectedLog.score.score >= 80 ? '좋은 흐름'
      : selectedLog.score.score >= 50 ? '진행 중'
        : '보강 필요'
    : '기록 대기'
  const selectedDayLabel = `${selectedDate} ${formatWeekday(selectedDate)}`
  const trendChartData = {
    labels: trendLogs.map(log => formatShortDate(log.date)),
    datasets: [{
      data: trendLogs.map(log => log.score?.score ?? null),
      fill: true,
      borderColor: accent,
      backgroundColor: withAlpha(accent, 0.12),
      tension: 0.38,
      cubicInterpolationMode: 'monotone' as const,
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: trendLogs.map(log => log.date === selectedDate ? '#fff' : accent),
      pointBorderColor: trendLogs.map(log => log.date === selectedDate ? accent : 'transparent'),
      pointBorderWidth: trendLogs.map(log => log.date === selectedDate ? 2 : 0),
      spanGaps: true,
    }],
  }
  const partChartParts = scoreParts.filter(part => part.value !== null)
  const partChartData = {
    labels: partChartParts.map(part => part.label),
    datasets: [{
      data: partChartParts.map(part => part.value ?? 0),
      backgroundColor: partChartParts.map(part => PART_COLORS[part.id]),
      borderRadius: 7,
      barThickness: 18,
    }],
  }
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.raw ?? 0}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--muted)', font: { size: 10 } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--muted)', font: { size: 10 }, callback: (value: any) => `${value}%` },
      },
    },
  }
  const partChartOptions = {
    ...chartOptions,
    indexAxis: 'y' as const,
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--muted)', font: { size: 10 }, callback: (value: any) => `${value}%` },
      },
      y: {
        grid: { display: false },
        ticks: { color: 'var(--text)', font: { size: 11, weight: 700 } },
      },
    },
  }

  const shiftDate = (days: number) => {
    setSelectedDate(toLocalDateKey(addLocalDays(dateObj, days)))
  }

  return (
    <div className="productivity-log-page">
      <PageHeader
        title="생산성 기록"
        description="하루 점수와 실제 활동 기록을 함께 비교합니다."
        actions={<div className="productivity-date-controls">
          <IconButton label="어제" icon={<ChevronLeft size={17} />} size="sm" variant="secondary" onClick={() => shiftDate(-1)} />
          <input
            type="date"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value || today)}
          />
          <IconButton label="내일" icon={<ChevronRight size={17} />} size="sm" variant="secondary" onClick={() => shiftDate(1)} />
          <IconButton label="오늘" icon={<RotateCcw size={16} />} size="sm" variant="secondary" onClick={() => setSelectedDate(today)} />
        </div>}
      />

      <section className="productivity-score-board">
        <article className="score-hero">
          <div className="score-hero-top">
            <span>{selectedDayLabel}</span>
            <b>{scoreTone}</b>
          </div>
          <strong>{selectedLog.score ? `${selectedLog.score.score}%` : '-'}</strong>
          <p>생산성 추이 기준 하루 점수</p>
        </article>
        <div className="productivity-summary-strip">
          <SummaryTile label="완료/기록" value={`${doneItems}/${totalItems || 0}`} meta={totalItems ? '집계된 항목' : '기록 없음'} />
          <SummaryTile label="남은 항목" value={`${openItems}개`} meta={openItems ? '아직 열려 있음' : '정리됨'} />
          <SummaryTile label="집중" value={focusText} meta={hasFocusScore ? '오늘 기준 세션' : '오늘만 자동 집계'} />
          <SummaryTile label="30일 평균" value={monthAverage == null ? '-' : `${monthAverage}%`} meta="점수 있는 날 기준" />
        </div>
      </section>

      <section className="productivity-chart-grid">
        <article className="chart-panel trend-panel">
          <div className="panel-heading">
            <div>
              <h3>최근 14일 점수 흐름</h3>
              <span>점수가 있는 날을 이어서 봅니다.</span>
            </div>
            <b>{monthAverage == null ? '-' : `${monthAverage}%`}</b>
          </div>
          <div className="chart-frame">
            {trendLogs.some(log => log.score) ? (
              <Line data={trendChartData} options={chartOptions as any} />
            ) : (
              <p className="empty-text">기록이 쌓이면 최근 추이 그래프가 표시됩니다.</p>
            )}
          </div>
        </article>

        <article className="chart-panel">
          <div className="panel-heading">
            <div>
              <h3>선택일 점수 구성</h3>
              <span>{lowestSection ? `${lowestSection.section.label} 보강 여지` : '기록을 기다리는 중'}</span>
            </div>
            <b>{recordedSections}개 영역</b>
          </div>
          <div className="chart-frame compact">
            {partChartParts.length > 0 ? (
              <Bar data={partChartData} options={partChartOptions as any} />
            ) : (
              <p className="empty-text">이 날짜의 점수 구성 그래프가 아직 없습니다.</p>
            )}
          </div>
        </article>
      </section>

      <section className="score-parts">
        {scoreParts.length === 0 ? (
          <p className="empty-text">이 날짜의 생산성 점수 재료가 아직 없습니다.</p>
        ) : scoreParts.map(part => (
          <article key={part.id} className="score-part">
            <div>
              <b>{part.label}</b>
              <span>{part.meta}</span>
            </div>
            <strong>{part.value == null ? '-' : `${part.value}%`}</strong>
            <i><em style={{ width: `${part.value ?? 0}%`, background: PART_COLORS[part.id] }} /></i>
          </article>
        ))}
      </section>

      <section className="productivity-content-grid">
        <div className="activity-section-list">
          {visibleSections.map(section => (
            <ActivitySectionCard key={section.id} section={section} />
          ))}
        </div>

        <aside className="recent-productivity-panel">
          <div className="panel-heading">
            <h3>최근 기록</h3>
            <span>{recentLogs.length}일</span>
          </div>
          {recentLogs.length === 0 ? (
            <p className="empty-text">최근 생산성 기록이 없습니다.</p>
          ) : (
            <div className="recent-productivity-list" aria-label="최근 생산성 기록 목록">
              {recentLogs.map(log => {
                const active = log.date === selectedDate
                const doneUnits = log.sections.reduce((sum, section) =>
                  sum + (section.total > 0 ? Math.min(section.done, section.total) : section.done), 0)
                return (
                  <button
                    key={log.date}
                    type="button"
                    className={active ? 'recent-productivity-item active' : 'recent-productivity-item'}
                    onClick={() => setSelectedDate(log.date)}
                  >
                    <span>{log.date}</span>
                    <strong>{log.score ? `${log.score.score}%` : '-'}</strong>
                    <small>완료/기록 {doneUnits}개</small>
                  </button>
                )
              })}
            </div>
          )}
        </aside>
      </section>


    </div>
  )
}

function SummaryTile({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <article className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </article>
  )
}

function ActivitySectionCard({ section }: { section: ProductivityActivitySection }) {
  const pct = getRate(section.done, section.total)
  const visibleItems = section.items.slice(0, MAX_SECTION_ITEMS)
  const hiddenCount = section.items.length - visibleItems.length
  return (
    <article className="activity-card">
      <div className="activity-card-header">
        <h3>{section.label}</h3>
        <span>{section.total === 0 ? '기록 없음' : `${section.done}/${section.total}`}</span>
      </div>
      <div className="activity-progress"><i style={{ width: `${pct}%` }} /></div>
      <div className="activity-items">
        {section.items.length === 0 ? (
          <p className="empty-text">{EMPTY_TEXT[section.id]}</p>
        ) : visibleItems.map(item => (
          <div key={item.id} className="activity-item">
            <span className={item.status === 'open' ? 'activity-status open' : 'activity-status'}>
              {item.status === 'open' ? '·' : '✓'}
            </span>
            <div>
              <strong title={item.title}>{item.title}</strong>
              {item.meta && <span>{item.meta}</span>}
            </div>
          </div>
        ))}
        {hiddenCount > 0 && <span className="activity-overflow">외 {hiddenCount}개 더 기록됨</span>}
      </div>
    </article>
  )
}
