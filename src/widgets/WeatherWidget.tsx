import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { KOREA_LOCATIONS } from '../data/koreaLocations'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { fetchForecast, latLonToGrid, weatherIcon, type DayForecast } from '../services/weatherService'
import { addLocalDays, toLocalDateKey } from '../utils/date'

const FORECAST_DAYS = 7
const toApiDate = (key: string) => key.replace(/-/g, '')

interface WeekDay {
  date: Date
  forecast: DayForecast | null
  isToday: boolean
}

function buildWeekForecast(forecast: DayForecast[]): WeekDay[] {
  const byDate = new Map(forecast.map(day => [day.date, day]))
  const today = new Date()
  const todayKey = toLocalDateKey(today)
  const startOfWeek = addLocalDays(today, -today.getDay())

  return Array.from({ length: FORECAST_DAYS }, (_, i) => {
    const date = addLocalDays(startOfWeek, i)
    const apiDate = toApiDate(toLocalDateKey(date))
    return {
      date,
      forecast: byDate.get(apiDate) ?? null,
      isToday: toLocalDateKey(date) === todayKey,
    }
  })
}

export const meta = {
  id: 'weather',
  name: '날씨',
  icon: '⛅',
  defaultW: 14,
  defaultH: 6,
  minW: 10,
  minH: 4,
  order: 14,
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']
const LS_KEY = 'weather_location'

interface SavedLocation {
  sidoName: string
  sigunguName: string
  nx: number
  ny: number
  source?: 'auto' | 'manual'
  latitude?: number
  longitude?: number
}

function weatherLabel(sky: number, pty: number) {
  if (pty === 1) return '비'
  if (pty === 2) return '비 또는 눈'
  if (pty === 3) return '눈'
  if (pty === 4) return '소나기'
  if (sky === 1) return '맑음'
  if (sky === 3) return '구름 많음'
  return '흐림'
}

export default function WeatherWidget() {
  const { ref, h } = useWidgetSize()
  const [forecast, setForecast] = useState<DayForecast[]>([])
  const [selectedForecast, setSelectedForecast] = useState<DayForecast | null>(null)
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

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 위치 조회를 지원하지 않아요')
      return
    }

    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        const { nx, ny } = latLonToGrid(latitude, longitude)
        const saved: SavedLocation = {
          sidoName: '',
          sigunguName: '',
          nx,
          ny,
          source: 'auto',
          latitude,
          longitude,
        }
        localStorage.setItem(LS_KEY, JSON.stringify(saved))
        setLocation(saved)
        setSelectedSido('')
        setSelectedSigungu('')
        setShowPicker(false)
        load(nx, ny)
      },
      () => {
        setLoading(false)
        setError('위치 권한을 허용하거나 지역을 선택해 주세요')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  // 저장된 위치로 로드
  useEffect(() => {
    if (location?.source === 'manual') {
      load(location.nx, location.ny)
    } else {
      detectCurrentLocation()
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
      source: 'manual',
    }
    localStorage.setItem(LS_KEY, JSON.stringify(saved))
    setLocation(saved)
    load(sg.nx, sg.ny)
    setShowPicker(false)
  }

  const locationLabel = location
    ? location.source === 'auto'
      ? '현재 위치 자동 적용'
      : `${location.sidoName} ${location.sigunguName}`
    : '위치 미설정'
  const detailWeatherUrl = location?.source === 'auto' && location.latitude != null && location.longitude != null
    ? `https://weather.com/ko-KR/weather/today/l/${location.latitude},${location.longitude}`
    : `https://search.naver.com/search.naver?query=${encodeURIComponent(`${locationLabel} 날씨`)}`
  const compact = h > 0 && h < 210
  const cardGap = compact ? 2 : 4

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: compact ? '6px 10px' : '10px 14px',
      boxSizing: 'border-box', gap: compact ? 5 : 8,
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{
          minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: compact ? 11 : 12, color: 'var(--muted)', fontWeight: 600,
        }}>
          📍 {locationLabel}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={detectCurrentLocation}
            title="현재 위치 다시 조회"
            aria-label="현재 위치 다시 조회"
            style={{
              width: compact ? 24 : 28, padding: 0,
              borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg3)', color: 'var(--muted)',
              fontSize: compact ? 13 : 15, cursor: 'pointer',
            }}
          >
            ⌖
          </button>
          <button
            onClick={() => setShowPicker(p => !p)}
            style={{
              fontSize: compact ? 10 : 11,
              padding: compact ? '2px 6px' : '3px 8px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg3)',
              color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            지역 변경
          </button>
        </div>
      </div>

      {/* 지역 선택 */}
      {showPicker && (
        <div style={{ display: 'flex', gap: compact ? 4 : 6, flexShrink: 0 }}>
          <select
            value={selectedSido}
            onChange={e => { setSelectedSido(e.target.value); setSelectedSigungu('') }}
            style={{
              minWidth: 0, flex: 1, padding: compact ? '3px 4px' : '5px 6px',
              borderRadius: 6, fontSize: compact ? 11 : 12,
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
              minWidth: 0, flex: 1, padding: compact ? '3px 4px' : '5px 6px',
              borderRadius: 6, fontSize: compact ? 11 : 12,
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
              flexShrink: 0, padding: compact ? '3px 8px' : '5px 12px',
              borderRadius: 6, border: 'none',
              background: selectedSigungu ? 'var(--accent)' : 'var(--bg4)',
              color: selectedSigungu ? '#fff' : 'var(--muted)',
              fontSize: compact ? 11 : 12, cursor: selectedSigungu ? 'pointer' : 'default',
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
        <div style={{ minHeight: 0, flex: 1, display: 'flex', gap: compact ? 3 : 5 }}>
          {buildWeekForecast(forecast).map(({ date, forecast: day, isToday }, i) => {
            const dayLabel = DAY_KO[date.getDay()]
            const icon = day ? weatherIcon(day.sky, day.pty) : '－'

            return (
              <button
                key={i}
                type="button"
                onClick={() => day && setSelectedForecast(day)}
                disabled={!day}
                aria-label={`${dayLabel}요일${isToday ? ' (오늘)' : ''} 날씨 ${day ? '자세히 보기' : '정보 없음'}`}
                style={{
                flex: '1 1 0%',
                minWidth: 0, minHeight: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: cardGap, borderRadius: compact ? 8 : 10,
                padding: compact ? '4px 1px' : '8px 3px',
                background: isToday ? 'var(--accent)' : 'var(--bg3)',
                border: 'none', color: 'inherit', fontFamily: 'inherit',
                cursor: day ? 'pointer' : 'default',
                opacity: day ? 1 : 0.5,
              }}>
                <div style={{ fontSize: compact ? 10 : 11, fontWeight: 600, color: isToday ? '#fff' : 'var(--muted)' }}>
                  {dayLabel}{isToday && <span style={{ marginLeft: 2 }}>(오늘)</span>}
                </div>
                <div style={{ fontSize: compact ? 17 : 22, lineHeight: 1 }}>{icon}</div>
                <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: isToday ? '#fff' : 'var(--text)' }}>
                  {day ? `${day.high}°` : '-'}
                </div>
                <div style={{ fontSize: compact ? 9 : 10, color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>
                  {day ? `${day.low}°` : ''}
                </div>
                {day && day.pop > 0 && (
                  <div style={{
                    fontSize: compact ? 8 : 9,
                    color: isToday ? 'rgba(255,255,255,0.8)' : '#3b82f6',
                    whiteSpace: 'nowrap',
                  }}>
                    💧{day.pop}%
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selectedForecast && createPortal(
        <div
          role="presentation"
          onClick={() => setSelectedForecast(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, background: 'rgba(0,0,0,0.35)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="날씨 상세"
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(340px, 100%)', padding: 20,
              borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--bg2)', color: 'var(--text)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{locationLabel}</div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                  {`${selectedForecast.date.slice(4, 6)}월 ${selectedForecast.date.slice(6, 8)}일`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForecast(null)}
                aria-label="닫기"
                style={{
                  border: 'none', background: 'transparent', color: 'var(--muted)',
                  fontSize: 22, lineHeight: 1, padding: 2, cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0' }}>
              <div style={{ fontSize: 42, lineHeight: 1 }}>
                {weatherIcon(selectedForecast.sky, selectedForecast.pty)}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 5 }}>
                  {weatherLabel(selectedForecast.sky, selectedForecast.pty)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  최고 {selectedForecast.high}° · 최저 {selectedForecast.low}°
                </div>
                <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 3 }}>
                  강수확률 {selectedForecast.pop}%
                </div>
              </div>
            </div>

            <a
              href={detailWeatherUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', minHeight: 40, boxSizing: 'border-box',
                borderRadius: 8, background: 'var(--accent)', color: '#fff',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}
            >
              상세 실시간 날씨 보기 ↗
            </a>
            <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>
              보기 쉬운 지역 날씨 화면이 새 탭에서 열립니다.
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
