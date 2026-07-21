import { useEffect, useMemo, useState } from 'react'
import ProductivityCategoryModal from '../components/ProductivityCategoryModal'
import ProductivityPeriodView from '../components/ProductivityPeriodView'
import ProductivityTimeModal from '../components/ProductivityTimeModal'
import { useApp } from '../store/AppContext'
import { addLocalDays, toLocalDateKey } from '../utils/date'
import {
  getProductivityDayLog,
  getProductivityPeriodSummary,
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
    productivityTimeHistory,
  } = useApp()
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey())
  const [anchorDate, setAnchorDate] = useState(toLocalDateKey())
  const [timeModalOpen, setTimeModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
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
    productivityTimeHistory,
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
    productivityTimeHistory,
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
      productivityTimeHistory,
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
      productivityTimeHistory,
    ])

  const periodSummary = useMemo(() => getProductivityPeriodSummary({
    mode: viewMode === 'month' ? 'month' : 'week',
    anchorDate,
    today,
    todos,
    todoHistory,
    habits,
    habitHistory,
    scheduledTasks,
    counters,
    productivityTimeHistory,
  }), [
    anchorDate,
    counters,
    habitHistory,
    habits,
    productivityTimeHistory,
    scheduledTasks,
    todoHistory,
    todos,
    today,
    viewMode,
  ])

  const periodScoreLogs = useMemo(() => periodSummary.days
    .filter(day => !day.isFuture)
    .map(day => createLog(day.date))
    .filter(log => log.score), [
      periodSummary.days,
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
      productivityTimeHistory,
    ])
  const periodReferenceScore = periodScoreLogs.length
    ? Math.round(periodScoreLogs.reduce((sum, log) => sum + (log.score?.score ?? 0), 0) / periodScoreLogs.length)
    : null

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

  const shiftPeriod = (direction: number) => {
    if (viewMode === 'week') {
      const anchor = new Date(`${anchorDate}T12:00:00`)
      setAnchorDate(toLocalDateKey(addLocalDays(anchor, direction * 7)))
      return
    }
    const anchor = new Date(`${anchorDate}T12:00:00`)
    setAnchorDate(toLocalDateKey(new Date(
      anchor.getFullYear(),
      anchor.getMonth() + direction,
      1,
      12,
    )))
  }

  const changeViewMode = (mode: 'day' | 'week' | 'month') => {
    setViewMode(mode)
    if (mode === 'day') setSelectedDate(today)
    else setAnchorDate(today)
  }

  const periodLabel = viewMode === 'month'
    ? new Date(`${anchorDate}T12:00:00`).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
    : `${periodSummary.startDate} ~ ${periodSummary.endDate}`
  const modalStartDate = viewMode === 'day' ? selectedDate : periodSummary.startDate
  const modalEndDate = viewMode === 'day' ? selectedDate : periodSummary.endDate

  return (
    <div className="productivity-log-page">
      <header className="productivity-log-header">
        <div>
          <h2>생산성 기록</h2>
          <p>분야별 완료 흐름과 하루 기록</p>
        </div>
        <div className="productivity-view-tabs" role="tablist" aria-label="생산성 기록 기간">
          {([
            ['day', '일간'],
            ['week', '주간'],
            ['month', '월간'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={viewMode === mode}
              className={viewMode === mode ? 'active' : ''}
              onClick={() => changeViewMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="productivity-period-toolbar">
        {viewMode === 'day' ? (
          <div className="productivity-date-controls">
            <button type="button" onClick={() => shiftDate(-1)} aria-label="이전 날짜">이전</button>
            <input
              type="date"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value || today)}
            />
            <button type="button" onClick={() => shiftDate(1)} aria-label="다음 날짜">다음</button>
            <button type="button" onClick={() => setSelectedDate(today)}>오늘</button>
          </div>
        ) : (
          <div className="productivity-date-controls period">
            <button type="button" onClick={() => shiftPeriod(-1)} aria-label="이전 기간">이전</button>
            <strong>{periodLabel}</strong>
            <button type="button" onClick={() => shiftPeriod(1)} aria-label="다음 기간">다음</button>
            <button type="button" onClick={() => setAnchorDate(today)}>
              {viewMode === 'week' ? '이번 주' : '이번 달'}
            </button>
          </div>
        )}
        {viewMode === 'day' && (
          <div className="daily-log-actions">
            <button type="button" onClick={() => setTimeModalOpen(true)}>시간 기록</button>
            <button type="button" onClick={() => setCategoryModalOpen(true)}>분류 관리</button>
          </div>
        )}
      </div>

      {viewMode === 'day' ? (
        <>
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
        </>
      ) : (
        <ProductivityPeriodView
          summary={periodSummary}
          referenceScore={periodReferenceScore}
          scoreDays={periodScoreLogs.length}
          onOpenTime={() => setTimeModalOpen(true)}
          onOpenCategories={() => setCategoryModalOpen(true)}
        />
      )}

      <ProductivityTimeModal
        open={timeModalOpen}
        startDate={modalStartDate}
        endDate={modalEndDate}
        onClose={() => setTimeModalOpen(false)}
      />
      <ProductivityCategoryModal
        open={categoryModalOpen}
        startDate={modalStartDate}
        endDate={modalEndDate}
        onClose={() => setCategoryModalOpen(false)}
      />

      <style>{`
        .productivity-log-page { max-width: 1180px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 14px; }
        .productivity-log-header { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
        .productivity-log-header h2 { margin: 0 0 6px; font-size: 24px; letter-spacing: 0; }
        .productivity-log-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .productivity-view-tabs { display: grid; grid-template-columns: repeat(3, minmax(64px, 1fr)); gap: 3px; padding: 3px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .productivity-view-tabs button { height: 34px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); padding: 0 14px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .productivity-view-tabs button.active { background: var(--accent); color: #fff; }
        .productivity-period-toolbar { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .productivity-date-controls { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; padding: 4px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .productivity-date-controls button { height: 34px; border: 0; border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 12px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .productivity-date-controls button:last-child { background: var(--accent); color: #fff; }
        .productivity-date-controls input { height: 34px; min-width: 0; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 10px; font-family: inherit; font-size: 13px; outline: none; }
        .productivity-date-controls.period { flex: 1; display: grid; grid-template-columns: auto minmax(180px, 1fr) auto auto; align-items: center; }
        .productivity-date-controls.period strong { min-width: 0; text-align: center; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .daily-log-actions { display: flex; gap: 7px; flex-shrink: 0; }
        .daily-log-actions button, .section-heading-row > button, .period-overview-metric button { height: 36px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg2); color: var(--text); padding: 0 12px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .period-analysis { display: flex; flex-direction: column; gap: 16px; }
        .period-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .period-primary-metric, .period-overview-metric { min-width: 0; min-height: 124px; padding: 15px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); display: flex; flex-direction: column; justify-content: space-between; gap: 8px; }
        .period-primary-metric { border-color: var(--accent); background: var(--accent-soft); }
        .period-primary-metric span, .period-overview-metric span { color: var(--muted); font-size: 12px; font-weight: 700; }
        .period-primary-metric strong, .period-overview-metric strong { color: var(--text); font-size: 28px; line-height: 1.15; overflow-wrap: anywhere; }
        .period-primary-metric strong { color: var(--accent); font-size: 36px; }
        .period-primary-metric small, .period-overview-metric small { color: var(--muted); font-size: 11px; }
        .period-overview-metric button { align-self: flex-start; height: 30px; background: var(--accent); color: #fff; border-color: var(--accent); }
        .category-summary-section { display: flex; flex-direction: column; gap: 12px; padding: 2px 0; }
        .section-heading-row { min-width: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .section-heading-row > div { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .section-heading-row h3 { margin: 0; font-size: 16px; }
        .section-heading-row span { color: var(--muted); font-size: 12px; }
        .category-summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
        .category-summary-card { min-width: 0; padding: 13px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
        .category-summary-card > div { min-width: 0; display: flex; align-items: center; gap: 7px; }
        .category-summary-card i, .time-total-grid i { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
        .category-summary-card b { min-width: 0; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .category-summary-card strong { font-size: 19px; }
        .category-summary-card > span { grid-column: 1 / -1; color: var(--muted); font-size: 11px; }
        .period-chart-grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr); gap: 12px; }
        .period-chart-panel { min-width: 0; min-height: 310px; padding: 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); display: flex; flex-direction: column; gap: 12px; }
        .period-chart-frame { min-width: 0; height: 240px; }
        .period-chart-frame.balance { height: 225px; }
        .period-chart-frame .empty-text { height: 100%; display: grid; place-items: center; text-align: center; }
        .productivity-score-board { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 12px; }
        .score-hero, .summary-tile, .score-part, .activity-card, .recent-productivity-panel, .chart-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
        .score-hero { padding: 18px; display: flex; flex-direction: column; gap: 10px; min-height: 142px; justify-content: space-between; }
        .score-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .score-hero-top b { flex-shrink: 0; border-radius: 999px; background: var(--accent-soft); color: var(--accent); padding: 4px 8px; font-size: 11px; }
        .score-hero span, .score-part span, .activity-card-header span, .activity-item span, .empty-text, .recent-productivity-item small, .chart-panel .panel-heading span, .summary-tile span { color: var(--muted); font-size: 12px; line-height: 1.5; }
        .score-hero strong { font-size: 42px; line-height: 1; color: var(--accent); }
        .score-hero p { margin: 0; color: var(--muted); font-size: 12px; }
        .productivity-summary-strip, .score-parts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .summary-tile { min-width: 0; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
        .summary-tile strong { font-size: 22px; color: var(--text); }
        .summary-tile span, .summary-tile small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .summary-tile small { color: var(--muted); font-size: 11px; font-weight: 700; }
        .productivity-chart-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr); gap: 12px; align-items: stretch; }
        .chart-panel { min-width: 0; padding: 14px; display: flex; flex-direction: column; gap: 12px; min-height: 268px; }
        .chart-frame { min-height: 198px; height: 198px; }
        .chart-frame.compact { height: 188px; min-height: 188px; }
        .chart-frame .empty-text { height: 100%; display: grid; place-items: center; text-align: center; }
        .score-part { min-width: 0; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .score-part div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .score-part b { font-size: 13px; }
        .score-part strong { font-size: 20px; color: var(--text); }
        .score-part i { height: 6px; border-radius: 999px; background: var(--bg4); overflow: hidden; }
        .score-part em { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
        .productivity-content-grid { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 12px; align-items: start; }
        .activity-section-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .activity-card { min-width: 0; padding: 14px; display: flex; flex-direction: column; gap: 11px; }
        .activity-card-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .activity-card-header h3, .panel-heading h3 { margin: 0; font-size: 15px; }
        .activity-progress { height: 6px; border-radius: 999px; background: var(--bg4); overflow: hidden; }
        .activity-progress i { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
        .activity-items { display: flex; flex-direction: column; gap: 7px; }
        .activity-item { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; align-items: start; padding: 9px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); }
        .activity-status { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 900; background: var(--accent-soft); color: var(--accent); }
        .activity-status.open { background: var(--bg4); color: var(--muted); }
        .activity-item strong { display: block; min-width: 0; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .recent-productivity-panel { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .recent-productivity-list { max-height: 430px; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding-right: 2px; display: flex; flex-direction: column; gap: 10px; }
        .recent-productivity-list::-webkit-scrollbar { width: 8px; }
        .recent-productivity-list::-webkit-scrollbar-track { background: transparent; }
        .recent-productivity-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
        .panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .panel-heading div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .panel-heading span { color: var(--muted); font-size: 12px; font-weight: 700; }
        .panel-heading b { flex-shrink: 0; color: var(--accent); font-size: 14px; }
        .recent-productivity-item { width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); padding: 10px; text-align: left; cursor: pointer; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 8px; }
        .recent-productivity-item.active { border-color: var(--accent); background: var(--accent-soft); }
        .recent-productivity-item span { font-size: 12px; color: var(--muted); }
        .recent-productivity-item strong { color: var(--accent); }
        .recent-productivity-item small { grid-column: 1 / -1; }
        .empty-text { margin: 0; }
        .activity-overflow { color: var(--muted); font-size: 12px; font-weight: 700; padding: 4px 2px 0; }
        .productivity-modal-backdrop { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 20px; background: rgba(0, 0, 0, 0.45); }
        .productivity-modal { width: min(920px, 100%); max-height: min(86vh, 820px); overflow: hidden; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--text); box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24); display: flex; flex-direction: column; gap: 14px; padding: 18px; box-sizing: border-box; }
        .productivity-modal-header { flex-shrink: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .productivity-modal-header > div { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .productivity-modal-header h3 { margin: 0; font-size: 19px; }
        .productivity-modal-header span { color: var(--muted); font-size: 12px; }
        .modal-close-button { width: 34px; height: 34px; flex-shrink: 0; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--muted); font-size: 22px; line-height: 1; cursor: pointer; }
        .time-total-grid { flex-shrink: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--border); }
        .time-total-grid article { min-width: 0; padding: 12px; background: var(--bg3); display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 5px 7px; align-items: center; }
        .time-total-grid span { min-width: 0; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .time-total-grid strong, .time-total-grid small { grid-column: 1 / -1; }
        .time-total-grid strong { font-size: 16px; }
        .time-total-grid small { color: var(--muted); font-size: 10px; }
        .manual-time-form { flex-shrink: 0; display: grid; grid-template-columns: minmax(150px, 1fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) auto; gap: 9px; align-items: end; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); }
        .manual-time-form label { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
        .manual-time-form label > span { color: var(--muted); font-size: 11px; font-weight: 700; }
        .manual-time-form input, .manual-time-form select, .classification-row select, .inline-number-control input { height: 36px; min-width: 0; box-sizing: border-box; border: 1px solid var(--border); border-radius: 7px; background: var(--bg2); color: var(--text); padding: 0 9px; font-family: inherit; font-size: 12px; outline: none; }
        .manual-time-form > button { height: 36px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 16px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .number-with-unit { position: relative; min-width: 0; }
        .number-with-unit input { width: 100%; padding-right: 30px; }
        .number-with-unit > span { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 11px; pointer-events: none; }
        .time-record-table, .classification-list { min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; border: 1px solid var(--border); border-radius: 8px; }
        .time-record-head, .time-record-row { display: grid; grid-template-columns: minmax(150px, 1fr) minmax(180px, 1.1fr) minmax(120px, 0.8fr) minmax(70px, 0.6fr); gap: 10px; align-items: center; padding: 10px 12px; }
        .time-record-head { position: sticky; top: 0; z-index: 1; background: var(--bg3); color: var(--muted); font-size: 11px; font-weight: 800; }
        .time-record-row { border-top: 1px solid var(--border); }
        .time-record-row > div:first-child { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .time-record-row > div:first-child b { font-size: 12px; }
        .time-record-row > div:first-child span { font-size: 11px; font-weight: 800; }
        .time-record-row > strong { font-size: 12px; text-align: right; }
        .inline-number-control { min-width: 0; display: flex; align-items: center; gap: 5px; }
        .inline-number-control input { width: 72px; }
        .inline-number-control > span { color: var(--muted); font-size: 11px; }
        .inline-number-control button { height: 30px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg3); color: var(--muted); padding: 0 7px; font-size: 10px; cursor: pointer; }
        .linked-time-records { grid-column: 1 / -1; min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 9px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); }
        .linked-time-heading { color: var(--muted); font-size: 10px; font-weight: 800; }
        .linked-time-record { min-width: 0; display: grid; grid-template-columns: minmax(140px, 1fr) auto; gap: 10px; align-items: center; }
        .linked-time-record > div:first-child { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .linked-time-record small { color: var(--muted); font-size: 9px; }
        .linked-time-record b { min-width: 0; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .time-record-table > .empty-text, .classification-list > .empty-text { padding: 24px; text-align: center; }
        .category-filter-tabs { flex-shrink: 0; display: flex; gap: 4px; padding: 3px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); align-self: flex-start; }
        .category-filter-tabs button { height: 32px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); padding: 0 12px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .category-filter-tabs button.active { background: var(--accent); color: #fff; }
        .classification-row { min-width: 0; display: grid; grid-template-columns: 100px minmax(0, 1fr) 120px; gap: 12px; align-items: center; padding: 11px 12px; border-bottom: 1px solid var(--border); }
        .classification-row:last-child { border-bottom: 0; }
        .classification-source { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .classification-source b { font-size: 11px; }
        .classification-source span { color: var(--muted); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .classification-row > strong { min-width: 0; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .classification-row select { width: 100%; }
        @media (max-width: 960px) {
          .productivity-score-board, .productivity-content-grid, .productivity-chart-grid, .period-chart-grid { grid-template-columns: 1fr; }
          .score-parts, .productivity-summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .period-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .category-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .recent-productivity-list { max-height: 340px; }
        }
        @media (max-width: 768px) {
          .productivity-period-toolbar { align-items: stretch; flex-direction: column; }
          .productivity-date-controls, .productivity-date-controls.period { width: 100%; box-sizing: border-box; }
          .daily-log-actions { align-self: flex-end; }
          .time-total-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .manual-time-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .manual-time-form > button { align-self: end; }
          .time-record-head { display: none; }
          .time-record-row { grid-template-columns: minmax(120px, 1fr) minmax(180px, 1.2fr); }
          .time-record-row > strong { text-align: left; }
        }
        @media (max-width: 640px) {
          .productivity-log-header { align-items: stretch; flex-direction: column; }
          .productivity-view-tabs { width: 100%; box-sizing: border-box; }
          .productivity-date-controls { justify-content: stretch; }
          .productivity-date-controls input { flex: 1; }
          .productivity-date-controls.period { grid-template-columns: auto minmax(0, 1fr) auto; }
          .productivity-date-controls.period button:last-child { grid-column: 1 / -1; }
          .activity-section-list, .score-parts, .productivity-summary-strip { grid-template-columns: 1fr; }
          .period-overview, .category-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .chart-panel { min-height: 246px; }
          .chart-frame, .chart-frame.compact { height: 176px; min-height: 176px; }
          .period-chart-panel { min-height: 278px; }
          .period-chart-frame, .period-chart-frame.balance { height: 205px; }
          .productivity-modal-backdrop { padding: 8px; align-items: end; }
          .productivity-modal { width: 100%; max-height: 94vh; padding: 14px; }
          .manual-time-form { grid-template-columns: 1fr; }
          .time-record-row { grid-template-columns: 1fr; gap: 8px; }
          .linked-time-record { grid-template-columns: 1fr; gap: 6px; }
          .classification-row { grid-template-columns: 82px minmax(0, 1fr); gap: 8px; }
          .classification-row select { grid-column: 1 / -1; }
        }
        @media (max-width: 420px) {
          .period-overview, .category-summary-grid { grid-template-columns: 1fr; }
          .period-primary-metric, .period-overview-metric { min-height: 106px; }
          .daily-log-actions { width: 100%; }
          .daily-log-actions button { flex: 1; }
        }
      `}</style>
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
