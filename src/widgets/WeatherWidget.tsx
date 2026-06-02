import { useEffect, useState } from 'react'

export const meta = {
  id: 'weather',
  name: '날씨',
  icon: '⛅',
  defaultW: 10,
  defaultH: 5,
  minW: 6,
  minH: 4,
  order: 14,
}

interface DayWeather {
  date: string
  high: number
  low: number
  icon: string
  desc: string
}

const OW_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

const ICON_MAP: Record<string, string> = {
  '01': '☀️', '02': '🌤', '03': '☁️', '04': '☁️',
  '09': '🌧', '10': '🌦', '11': '⛈', '13': '❄️', '50': '🌫',
}

function owIcon(code: string) {
  return ICON_MAP[code.slice(0, 2)] ?? '🌡'
}

export default function WeatherWidget() {
  const [forecast, setForecast] = useState<DayWeather[]>([])
  const [city, setCity] = useState('Seoul')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = (c: string) => {
    if (!OW_KEY) { setError('VITE_OPENWEATHER_API_KEY 미설정'); return }
    setLoading(true)
    setError('')
    fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${c}&units=metric&lang=kr&cnt=40&appid=${OW_KEY}`)
      .then(r => r.json())
      .then(d => {
        if (d.cod !== '200') { setError(d.message ?? '도시를 찾을 수 없어요'); return }
        const byDay: Record<string, { highs: number[], lows: number[], icons: string[] }> = {}
        d.list.forEach((item: any) => {
          const day = item.dt_txt.slice(0, 10)
          if (!byDay[day]) byDay[day] = { highs: [], lows: [], icons: [] }
          byDay[day].highs.push(item.main.temp_max)
          byDay[day].lows.push(item.main.temp_min)
          byDay[day].icons.push(item.weather[0].icon)
        })
        const result: DayWeather[] = Object.entries(byDay).slice(0, 5).map(([date, v]) => ({
          date,
          high: Math.round(Math.max(...v.highs)),
          low: Math.round(Math.min(...v.lows)),
          icon: owIcon(v.icons[Math.floor(v.icons.length / 2)]),
          desc: '',
        }))
        setForecast(result)
      })
      .catch(() => setError('날씨 정보를 가져오지 못했어요'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(city) }, [])

  const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 14px', boxSizing: 'border-box', gap: 8 }}>
      {/* 도시 입력 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') load(city) }}
          placeholder="도시 이름 (영문)"
          style={{
            flex: 1, border: '1px solid var(--border)', borderRadius: 6,
            background: 'var(--bg3)', color: 'var(--text)', fontSize: 12,
            padding: '4px 8px', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button onClick={() => load(city)} style={{
          border: 'none', borderRadius: 6, background: 'var(--accent)',
          color: '#fff', fontSize: 12, padding: '4px 10px', cursor: 'pointer',
        }}>검색</button>
      </div>

      {/* 상태 */}
      {loading && <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>불러오는 중...</div>}
      {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}

      {/* 5일 예보 */}
      {!loading && forecast.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {forecast.map(day => {
            const d = new Date(day.date)
            const dayStr = DAY_KO[d.getDay()]
            const isToday = day.date === new Date().toISOString().slice(0, 10)
            return (
              <div key={day.date} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: isToday ? 'var(--accent)' : 'var(--bg3)',
                borderRadius: 10, padding: '8px 4px', gap: 4,
              }}>
                <div style={{ fontSize: 11, color: isToday ? '#fff' : 'var(--muted)', fontWeight: isToday ? 700 : 400 }}>
                  {isToday ? '오늘' : dayStr}
                </div>
                <div style={{ fontSize: 22 }}>{day.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#fff' : 'var(--text)' }}>{day.high}°</div>
                <div style={{ fontSize: 11, color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>{day.low}°</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
