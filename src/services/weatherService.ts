const API_KEY = import.meta.env.VITE_WEATHER_API_KEY as string
const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'

export interface DayForecast {
  date: string       // YYYYMMDD
  high: number
  low: number
  sky: number        // 1:맑음 3:구름많음 4:흐림
  pty: number        // 0:없음 1:비 2:비/눈 3:눈 4:소나기
  pop: number        // 강수확률
}

/** 위도/경도 → 기상청 격자 좌표(nx, ny) 변환 */
export function latLonToGrid(lat: number, lon: number): { nx: number; ny: number } {
  const RE = 6371.00877
  const GRID = 5.0
  const SLAT1 = 30.0
  const SLAT2 = 60.0
  const OLON = 126.0
  const OLAT = 38.0
  const XO = 43
  const YO = 136
  const DEGRAD = Math.PI / 180.0

  const re = RE / GRID
  const slat1 = SLAT1 * DEGRAD
  const slat2 = SLAT2 * DEGRAD
  const olon = OLON * DEGRAD
  const olat = OLAT * DEGRAD

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = re * sf / Math.pow(ro, sn)

  const ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5)
  const r = re * sf / Math.pow(ra, sn)
  let theta = lon * DEGRAD - olon
  if (theta > Math.PI) theta -= 2.0 * Math.PI
  if (theta < -Math.PI) theta += 2.0 * Math.PI
  theta *= sn

  const nx = Math.floor(r * Math.sin(theta) + XO + 0.5)
  const ny = Math.floor(ro - r * Math.cos(theta) + YO + 0.5)
  return { nx, ny }
}

/** 기상청 격자 좌표(nx, ny) → 위도/경도 역변환 (지난 날짜 과거 날씨 조회용) */
export function gridToLatLon(nx: number, ny: number): { lat: number; lon: number } {
  const RE = 6371.00877
  const GRID = 5.0
  const SLAT1 = 30.0
  const SLAT2 = 60.0
  const OLON = 126.0
  const OLAT = 38.0
  const XO = 43
  const YO = 136
  const DEGRAD = Math.PI / 180.0
  const RADDEG = 180.0 / Math.PI

  const re = RE / GRID
  const slat1 = SLAT1 * DEGRAD
  const slat2 = SLAT2 * DEGRAD
  const olon = OLON * DEGRAD
  const olat = OLAT * DEGRAD

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = re * sf / Math.pow(ro, sn)

  const xn = nx - XO
  const yn = ro - (ny - YO)
  const ra = Math.sqrt(xn * xn + yn * yn)
  const raAdj = sn < 0 ? -ra : ra
  let alat = Math.pow((re * sf) / raAdj, 1.0 / sn)
  alat = 2.0 * Math.atan(alat) - Math.PI * 0.5

  let theta = 0
  if (Math.abs(xn) <= 0.0000001) {
    theta = 0
  } else if (Math.abs(yn) <= 0.0000001) {
    theta = Math.PI * 0.5
    if (xn < 0) theta = -theta
  } else {
    theta = Math.atan2(xn, yn)
  }
  const alon = theta / sn + olon

  return { lat: alat * RADDEG, lon: alon * RADDEG }
}

/** 가장 최근 발표 시각 계산 (0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300) */
function getBaseDateTime(): { base_date: string; base_time: string } {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const totalMin = hours * 60 + minutes

  // 발표 시각 기준 (발표 후 10분 뒤 데이터 가용)
  const BASE_TIMES = [2, 5, 8, 11, 14, 17, 20, 23]
  let baseHour = 23
  const prev = new Date(now)

  for (let i = BASE_TIMES.length - 1; i >= 0; i--) {
    const t = BASE_TIMES[i] * 60 + 10
    if (totalMin >= t) {
      baseHour = BASE_TIMES[i]
      break
    }
    if (i === 0) {
      // 자정 이후 02:10 이전이면 전날 23시 발표
      prev.setDate(prev.getDate() - 1)
      baseHour = 23
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const base_date = `${prev.getFullYear()}${pad(prev.getMonth() + 1)}${pad(prev.getDate())}`
  const base_time = `${pad(baseHour)}00`
  return { base_date, base_time }
}

export async function fetchForecast(nx: number, ny: number): Promise<DayForecast[]> {
  const cacheKey = `weather_${nx}_${ny}_${new Date().toISOString().slice(0, 13)}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) return JSON.parse(cached)

  const { base_date, base_time } = getBaseDateTime()

  const params = new URLSearchParams({
    ServiceKey: API_KEY,
    pageNo: '1',
    numOfRows: '1000',
    dataType: 'JSON',
    base_date,
    base_time,
    nx: String(nx),
    ny: String(ny),
  })

  const res = await fetch(`${BASE_URL}?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  const items = data?.response?.body?.items?.item
  if (!items) return []

  const list = Array.isArray(items) ? items : [items]

  // 날짜별로 분류
  const byDate: Record<string, Record<string, string[]>> = {}
  for (const item of list) {
    const { fcstDate, fcstTime, category, fcstValue } = item
    if (!byDate[fcstDate]) byDate[fcstDate] = {}
    if (!byDate[fcstDate][category]) byDate[fcstDate][category] = []
    byDate[fcstDate][category].push(fcstValue)
  }

  const now = new Date()
  const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

  const result: DayForecast[] = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([date]) => date >= todayStr)
    .slice(0, 7)
    .map(([date, cats]) => {
      const tmps = (cats['TMP'] ?? []).map(Number).filter(n => !isNaN(n))
      const tmx = cats['TMX']?.[0] ? Number(cats['TMX'][0]) : Math.max(...tmps)
      const tmn = cats['TMN']?.[0] ? Number(cats['TMN'][0]) : Math.min(...tmps)

      // 낮 12시 기준 대표 날씨
      const skyIdx = cats['SKY'] ? Math.floor(cats['SKY'].length / 2) : 0
      const ptyIdx = cats['PTY'] ? Math.floor(cats['PTY'].length / 2) : 0
      const sky = Number(cats['SKY']?.[skyIdx] ?? 1)
      const pty = Number(cats['PTY']?.[ptyIdx] ?? 0)
      const pop = Math.max(...(cats['POP'] ?? ['0']).map(Number))

      return { date, high: Math.round(tmx), low: Math.round(tmn), sky, pty, pop }
    })

  sessionStorage.setItem(cacheKey, JSON.stringify(result))
  return result
}

// WMO 날씨 코드(Open-Meteo) → 기상청 sky/pty 코드로 매핑
function wmoCodeToSkyPty(code: number): { sky: number; pty: number } {
  if ([95, 96, 99].includes(code)) return { sky: 4, pty: 4 } // 뇌우
  if ([80, 81, 82].includes(code)) return { sky: 3, pty: 4 } // 소나기
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { sky: 4, pty: 3 } // 눈
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67].includes(code)) return { sky: 4, pty: 1 } // 비
  if ([45, 48].includes(code)) return { sky: 4, pty: 0 } // 안개
  if (code === 0) return { sky: 1, pty: 0 } // 맑음
  if ([1, 2].includes(code)) return { sky: 3, pty: 0 } // 구름 조금/보통
  return { sky: 4, pty: 0 } // 3(overcast) 등 흐림
}

/**
 * 지난 날짜의 실제 관측 날씨 — Open-Meteo 과거 관측 API(무료, 키 불필요)
 * 기상청 단기예보 API는 과거 데이터를 주지 않으므로 별도 소스 사용
 */
export async function fetchHistoricalWeather(
  lat: number,
  lon: number,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
): Promise<DayForecast[]> {
  const cacheKey = `weather_history_${lat.toFixed(2)}_${lon.toFixed(2)}_${startDate}_${endDate}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) return JSON.parse(cached)

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: startDate,
    end_date: endDate,
    daily: 'weathercode,temperature_2m_max,temperature_2m_min',
    timezone: 'Asia/Seoul',
  })

  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  const dates: string[] = data?.daily?.time ?? []
  const codes: number[] = data?.daily?.weathercode ?? []
  const highs: number[] = data?.daily?.temperature_2m_max ?? []
  const lows: number[] = data?.daily?.temperature_2m_min ?? []

  const result: DayForecast[] = dates.map((isoDate, i) => {
    const { sky, pty } = wmoCodeToSkyPty(codes[i] ?? 3)
    return {
      date: isoDate.replace(/-/g, ''),
      high: Math.round(highs[i] ?? 0),
      low: Math.round(lows[i] ?? 0),
      sky, pty,
      pop: 0, // 과거 실제 관측치라 "확률" 개념이 없음 — 아이콘으로 강수 여부 표시
    }
  })

  sessionStorage.setItem(cacheKey, JSON.stringify(result))
  return result
}

export function weatherIcon(sky: number, pty: number): string {
  if (pty === 1) return '🌧'
  if (pty === 2) return '🌨'
  if (pty === 3) return '❄️'
  if (pty === 4) return '⛈'
  if (sky === 1) return '☀️'
  if (sky === 3) return '🌤'
  return '☁️'
}
