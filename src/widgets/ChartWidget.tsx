import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { calculateProductivityScore, getRecentDateKeys } from '../utils/productivity'
import { useRouter } from '../store/RouterContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const getThemeAccent = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3a7d50'

const withAlpha = (color: string, alpha: number) => {
  const hex = color.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return `rgba(58, 125, 80, ${alpha})`
  const value = Number.parseInt(hex, 16)
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

export const meta = {
  id: 'chart',
  name: '생산성 추이',
  icon: '📈',
  defaultW: 10,
  defaultH: 6,
  minW: 6,
  minH: 4,
  order: 8,
}

export function ChartActions() {
  const { setPage } = useRouter()
  return (
    <button
      type="button"
      onClick={() => setPage('productivity')}
      title="생산성 기록 보기"
      aria-label="생산성 기록 보기"
      style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        border: '1px solid var(--border)',
        background: 'var(--bg3)',
        color: 'var(--accent)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        fontSize: 14,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      ↗
    </button>
  )
}

export default function ChartWidget() {
  const {
    todos, todoHistory, chartHistory,
    habits, habitHistory, scheduledTasks, counters, productivityTimeHistory,
  } = useApp()
  const { ref } = useWidgetSize()
  const [accent, setAccent] = useState(getThemeAccent)

  useEffect(() => {
    const syncAccent = () => setAccent(getThemeAccent())
    const observer = new MutationObserver(syncAccent)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const productivityPoints = getRecentDateKeys(30)
    .map(date => calculateProductivityScore({
      date,
      todos,
      todoHistory,
      habits,
      habitHistory,
      scheduledTasks,
      counters,
      productivityTimeHistory,
    }))
    .filter((point): point is NonNullable<typeof point> => Boolean(point))

  const hasProductivityData = productivityPoints.length > 0
  const values = hasProductivityData
    ? productivityPoints.map(point => point.score)
    : chartHistory.slice(-30)
  const labels = hasProductivityData
    ? productivityPoints.map(point => {
        const [, month, day] = point.date.split('-')
        return `${Number(month)}/${Number(day)}`
      })
    : values.map((_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (values.length - 1 - i))
        return `${date.getMonth() + 1}/${date.getDate()}`
      })
  const latestScore = hasProductivityData ? productivityPoints[productivityPoints.length - 1] : null

  const data = {
    labels,
    datasets: [{
      data: values,
      fill: true,
      borderColor: accent,
      backgroundColor: withAlpha(accent, 0.12),
      tension: 0.45,
      cubicInterpolationMode: 'monotone' as const,
      borderWidth: 2.5,
      pointRadius: values.length > 14 ? 2 : 4,
      pointHoverRadius: values.length > 14 ? 4 : 6,
      pointBackgroundColor: accent,
      pointBorderColor: 'transparent',
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `하루 점수 ${ctx.raw}%`,
          afterLabel: (ctx: any) => {
            const point = productivityPoints[ctx.dataIndex]
            if (!point) return ''
            const parts = [
              point.parts.todo !== null ? `Todo ${point.parts.todo}%` : null,
              point.parts.habit !== null ? `루틴 ${point.parts.habit}%` : null,
              point.parts.scheduled !== null ? `예정 ${point.parts.scheduled}%` : null,
              point.parts.focus !== null ? `집중 ${point.parts.focus}%` : null,
            ].filter(Boolean)
            return parts.join(' · ')
          },
        },
      },
    },
    scales: {
      x: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--muted)', font: { size: 10 } } },
      y: { min: 0, max: 100, grid: { color: 'var(--border)' }, ticks: { color: 'var(--muted)', font: { size: 10 }, callback: (v: any) => `${v}%` } },
    },
  }

  return (
    <div ref={ref} style={{ height: '100%', padding: '8px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
        <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>하루 생산성 점수</span>
        {latestScore && (
          <span style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
            {latestScore.score}%
          </span>
        )}
      </div>
      {values.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>
          데이터가 쌓이면 차트가 표시됩니다
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <Line data={data} options={options as any} />
        </div>
      )}
    </div>
  )
}
