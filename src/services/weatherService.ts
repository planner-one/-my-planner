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

export function weatherIcon(sky: number, pty: number): string {
  if (pty === 1) return '🌧'
  if (pty === 2) return '🌨'
  if (pty === 3) return '❄️'
  if (pty === 4) return '⛈'
  if (sky === 1) return '☀️'
  if (sky === 3) return '🌤'
  return '☁️'
}
