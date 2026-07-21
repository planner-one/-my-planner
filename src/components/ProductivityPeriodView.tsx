import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import type { ProductivityCategory } from '../types'
import type { ProductivityPeriodSummary } from '../utils/productivity'
import {
  PRODUCTIVITY_CATEGORIES,
  PRODUCTIVITY_CATEGORY_COLORS,
  PRODUCTIVITY_CATEGORY_LABELS,
} from '../utils/productivityCategories'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface ProductivityPeriodViewProps {
  summary: ProductivityPeriodSummary
  referenceScore: number | null
  scoreDays: number
  onOpenTime: () => void
  onOpenCategories: () => void
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}분`
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}

export default function ProductivityPeriodView({
  summary,
  referenceScore,
  scoreDays,
  onOpenTime,
  onOpenCategories,
}: ProductivityPeriodViewProps) {
  const uncategorized = summary.categories.uncategorized
  const categories: ProductivityCategory[] = [
    ...PRODUCTIVITY_CATEGORIES,
    ...(uncategorized.total > 0 || uncategorized.totalMinutes > 0
      ? ['uncategorized' as const]
      : []),
  ]
  const completed = categories.reduce((sum, category) => sum + summary.categories[category].done, 0)
  const total = categories.reduce((sum, category) => sum + summary.categories[category].total, 0)
  const totalMinutes = categories.reduce((sum, category) => sum + summary.categories[category].totalMinutes, 0)
  const completionRate = total === 0 ? null : Math.round((completed / total) * 100)

  const balanceData = {
    labels: categories.map(category => PRODUCTIVITY_CATEGORY_LABELS[category]),
    datasets: [{
      data: categories.map(category => summary.categories[category].rate ?? 0),
      backgroundColor: categories.map(category => PRODUCTIVITY_CATEGORY_COLORS[category]),
      borderRadius: 5,
      barThickness: 20,
    }],
  }
  const balanceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const metric = summary.categories[categories[context.dataIndex]]
            return metric.total === 0 ? '기록 없음' : `${metric.rate}% · ${metric.done}/${metric.total}개`
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--muted)', callback: (value: any) => `${value}%` },
      },
      y: {
        grid: { display: false },
        ticks: { color: 'var(--text)', font: { weight: 700 } },
      },
    },
  }

  const flowCategories = categories.filter(category =>
    summary.groups.some(group => group.categories[category].done > 0),
  )
  const flowData = {
    labels: summary.groups.map(group => group.label),
    datasets: flowCategories.map(category => ({
      label: PRODUCTIVITY_CATEGORY_LABELS[category],
      data: summary.groups.map(group => group.categories[category].done),
      backgroundColor: PRODUCTIVITY_CATEGORY_COLORS[category],
      borderRadius: 4,
      borderSkipped: false as const,
      maxBarThickness: 34,
    })),
  }
  const flowOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: flowCategories.length > 0,
        position: 'bottom' as const,
        labels: { color: 'var(--muted)', boxWidth: 10, boxHeight: 10, padding: 14 },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: { label: (context: any) => `${context.dataset.label} ${context.raw ?? 0}개` },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: 'var(--muted)' },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--muted)', precision: 0 },
      },
    },
  }

  return (
    <div className="period-analysis">
      <section className="period-overview">
        <article className="period-primary-metric">
          <span>전체 완료율</span>
          <strong>{completionRate == null ? '-' : `${completionRate}%`}</strong>
          <small>{completed}/{total}개 완료</small>
        </article>
        <article className="period-overview-metric">
          <span>완료 개수</span>
          <strong>{completed}개</strong>
          <small>Todo · 루틴 · 예정 작업</small>
        </article>
        <article className="period-overview-metric">
          <span>참고 점수</span>
          <strong>{referenceScore == null ? '-' : `${referenceScore}%`}</strong>
          <small>{scoreDays ? `${scoreDays}일 평균` : '점수 기록 없음'}</small>
        </article>
        <article className="period-overview-metric">
          <span>기록 시간</span>
          <strong>{totalMinutes ? formatMinutes(totalMinutes) : '-'}</strong>
          <button type="button" onClick={onOpenTime}>시간 기록</button>
        </article>
      </section>

      <section className="category-summary-section">
        <div className="section-heading-row">
          <div>
            <h3>분야별 요약</h3>
            <span>{summary.startDate} ~ {summary.endDate}</span>
          </div>
          <button type="button" onClick={onOpenCategories}>분류 관리</button>
        </div>
        <div className="category-summary-grid">
          {categories.map(category => {
            const metric = summary.categories[category]
            return (
              <article key={category} className="category-summary-card">
                <div>
                  <i style={{ background: PRODUCTIVITY_CATEGORY_COLORS[category] }} />
                  <b>{PRODUCTIVITY_CATEGORY_LABELS[category]}</b>
                </div>
                <strong>{metric.rate == null ? '-' : `${metric.rate}%`}</strong>
                <span>{metric.done}/{metric.total}개 완료</span>
              </article>
            )
          })}
        </div>
      </section>

      <section className="period-chart-grid">
        <article className="period-chart-panel">
          <div className="section-heading-row">
            <div>
              <h3>분야 균형</h3>
              <span>분야별 완료율</span>
            </div>
          </div>
          <div className="period-chart-frame balance">
            <Bar data={balanceData} options={balanceOptions as any} />
          </div>
        </article>
        <article className="period-chart-panel">
          <div className="section-heading-row">
            <div>
              <h3>활동 흐름</h3>
              <span>{summary.mode === 'week' ? '일별 완료 개수' : '주차별 완료 개수'}</span>
            </div>
          </div>
          <div className="period-chart-frame">
            {flowCategories.length > 0 ? (
              <Bar data={flowData} options={flowOptions as any} />
            ) : (
              <p className="empty-text">이 기간의 완료 기록이 없습니다.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
