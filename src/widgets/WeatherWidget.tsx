import { useEffect, useState } from 'react'
import { KOREA_LOCATIONS } from '../data/koreaLocations'
import { fetchForecast, latLonToGrid, weatherIcon, type DayForecast } from '../services/weatherService'

export const meta = {
  id: 'weather',
  name: '날씨',
  icon: '⛅',
  defaultW: 14,
  defaultH: 6,
  minW: 10,
  minH: 5,
  order: 14,
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']
const LS_KEY = 'weather_location'

interface SavedLocation {
  sidoName: string
  sigunguName: string
  nx: number
  ny: number
}

export default function WeatherWidget() {
  const [forecast, setForecast] = useState<DayForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const [location, setLocation] = useState<SavedLocation | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') }
    catch { return null }
  })

  const [selectedSido, setSelectedSido] = useState(location?.sidoName ?? '')
  const [selectedSigungu, setSelectedSigungu] = useState(location?.sigunguName ?? '')

  const sigunguList = KOREA_LOCATIONS.find(s => s.name === selectedSido)?.sigungu ?? []

  const load = async (nx: number, ny: number) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchForecast(nx, ny)
      setForecast(data)
    } catch {
      setError('날씨 정보를 가져오지 못했어요')
    } finally {
      setLoading(false)
    }
  }

  // 저장된 위치로 로드
  useEffect(() => {
    if (location) {
      load(location.nx, location.ny)
    } else {
      // 브라우저 자동 감지
      if (!navigator.geolocation) return
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { nx, ny } = latLonToGrid(pos.coords.latitude, pos.coords.longitude)
          load(nx, ny)
        },
        () => {
          // 위치 거부 시 서울 기본값
          load(60, 127)
          setLoading(false)
        }
      )
    }
  }, [])

  const applyLocation = () => {
    const sg = sigunguList.find(s => s.name === selectedSigungu)
    if (!sg) return
    const saved: SavedLocation = {
      sidoName: selectedSido,
      sigunguName: selectedSigungu,
      nx: sg.nx,
      ny: sg.ny,
    }
    localStorage.setItem(LS_KEY, JSON.stringify(saved))
    setLocation(saved)
    load(sg.nx, sg.ny)
    setShowPicker(false)
  }

  const locationLabel = location
    ? `${location.sidoName} ${location.sigunguName}`
    : '현재 위치'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 14px', boxSizing: 'border-box', gap: 8 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
          📍 {locationLabel}
        </span>
        <button
          onClick={() => setShowPicker(p => !p)}
          style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 6,
            border: '1px solid var(--border)', background: 'var(--bg3)',
            color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          지역 변경
        </button>
      </div>

      {/* 지역 선택 */}
      {showPicker && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <select
            value={selectedSido}
            onChange={e => { setSelectedSido(e.target.value); setSelectedSigungu('') }}
            style={{
              flex: 1, padding: '5px 6px', borderRadius: 6, fontSize: 12,
              border: '1px solid var(--border)', background: 'var(--bg3)',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            <option value=''>시/도 선택</option>
            {KOREA_LOCATIONS.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
          <select
            value={selectedSigungu}
            onChange={e => setSelectedSigungu(e.target.value)}
            disabled={!selectedSido}
            style={{
              flex: 1, padding: '5px 6px', borderRadius: 6, fontSize: 12,
              border: '1px solid var(--border)', background: 'var(--bg3)',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            <option value=''>시/군/구 선택</option>
            {sigunguList.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={applyLocation}
            disabled={!selectedSigungu}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none',
              background: selectedSigungu ? 'var(--accent)' : 'var(--bg4)',
              color: selectedSigungu ? '#fff' : 'var(--muted)',
              fontSize: 12, cursor: selectedSigungu ? 'pointer' : 'default',
            }}
          >
            적용
          </button>
        </div>
      )}

      {/* 날씨 카드 */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>
          불러오는 중...
        </div>
      )}
      {error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', fontSize: 12 }}>
          {error}
        </div>
      )}
      {!loading && !error && forecast.length > 0 && (
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          {forecast.map((day, i) => {
            const d = new Date(
              Number(day.date.slice(0, 4)),
              Number(day.date.slice(4, 6)) - 1,
              Number(day.date.slice(6, 8))
            )
            const isToday = i === 0
            const dayLabel = isToday ? '오늘' : DAY_KO[d.getDay()]
            const icon = weatherIcon(day.sky, day.pty)

            return (
              <div key={day.date} style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, borderRadius: 10, padding: '8px 4px',
                background: isToday ? 'var(--accent)' : 'var(--bg3)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? '#fff' : 'var(--muted)' }}>
                  {dayLabel}
                </div>
                <div style={{ fontSize: 24 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? '#fff' : 'var(--text)' }}>
                  {day.high}°
                </div>
                <div style={{ fontSize: 11, color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>
                  {day.low}°
                </div>
                {day.pop > 0 && (
                  <div style={{ fontSize: 10, color: isToday ? 'rgba(255,255,255,0.8)' : '#3b82f6' }}>
                    💧{day.pop}%
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
