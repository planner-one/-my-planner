import { useEffect, useState } from 'react'
import { useWidgetSize } from '../hooks/useWidgetSize'

export const meta = {
  id: 'clock',
  name: '현재 시각',
  icon: '🕐',
  defaultW: 8,
  defaultH: 5,
  minW: 4,
  minH: 3,
  order: 1,
}

export default function ClockWidget() {
  const { ref, w, h } = useWidgetSize()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const pad = (n: number) => n.toString().padStart(2, '0')
  const hours = pad(time.getHours())
  const minutes = pad(time.getMinutes())
  const seconds = pad(time.getSeconds())
  const dateStr = time.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  const fontSize = Math.min(w / 5.5, h / 2.5, 52)

  return (
    <div ref={ref} style={{
      width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: 'monospace', fontWeight: 700, fontSize,
        color: 'var(--text)', letterSpacing: '0.05em', lineHeight: 1,
      }}>
        {hours}:{minutes}:{seconds}
      </div>
      {h > 80 && (
        <div style={{ fontSize: Math.max(fontSize * 0.32, 11), color: 'var(--muted)', marginTop: 8 }}>
          {dateStr}
        </div>
      )}
    </div>
  )
}
