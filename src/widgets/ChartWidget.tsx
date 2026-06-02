import { useApp } from '../store/AppContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

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
  const { chartHistory } = useApp()
  const { ref } = useWidgetSize()

  const last30 = chartHistory.slice(-30)
  const labels = last30.map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (last30.length - 1 - i))
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  const data = {
    labels,
    datasets: [{
      data: last30,
      fill: true,
      borderColor: 'var(--accent)',
      backgroundColor: 'rgba(74,140,92,0.12)',
      tension: 0.4,
      pointRadius: last30.length > 14 ? 2 : 4,
      pointBackgroundColor: 'var(--accent)',
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
      {last30.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>
          데이터가 쌓이면 차트가 표시됩니다
        </div>
      ) : (
        <Line data={data} options={options as any} />
      )}
    </div>
  )
}
