import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { toLocalDateKey } from '../utils/date'

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
  order: 7,
}

export default function ChartWidget() {
  const { todos, todoHistory, chartHistory } = useApp()
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

  const today = toLocalDateKey()
  const todayTodos = todos.filter(todo => !todo.date || todo.date === today)
  const todayDone = todayTodos.filter(todo => todo.done).length
  const todayRate = todayTodos.length === 0
    ? null
    : Math.round((todayDone / todayTodos.length) * 100)

  const datedRates = new Map(todoHistory.map(result => [result.date, result.completionRate]))
  if (todayRate !== null) datedRates.set(today, todayRate)

  const todoPoints = [...datedRates.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-30)

  const hasTodoData = todoPoints.length > 0
  const values = hasTodoData ? todoPoints.map(([, rate]) => rate) : chartHistory.slice(-30)
  const labels = hasTodoData
    ? todoPoints.map(([date]) => {
        const [, month, day] = date.split('-')
        return `${Number(month)}/${Number(day)}`
      })
    : values.map((_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (values.length - 1 - i))
        return `${date.getMonth() + 1}/${date.getDate()}`
      })

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
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.raw}%` } } },
    scales: {
      x: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--muted)', font: { size: 10 } } },
      y: { min: 0, max: 100, grid: { color: 'var(--border)' }, ticks: { color: 'var(--muted)', font: { size: 10 }, callback: (v: any) => `${v}%` } },
    },
  }

  return (
    <div ref={ref} style={{ height: '100%', padding: '8px 12px', boxSizing: 'border-box' }}>
      {values.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>
          데이터가 쌓이면 차트가 표시됩니다
        </div>
      ) : (
        <Line data={data} options={options as any} />
      )}
    </div>
  )
}
