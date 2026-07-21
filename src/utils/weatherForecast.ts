export interface DayForecast {
  date: string
  high: number
  low: number
  sky: number
  pty: number
  pop: number
}

interface OpenMeteoDailyForecast {
  time?: unknown
  weather_code?: unknown
  temperature_2m_max?: unknown
  temperature_2m_min?: unknown
  precipitation_probability_max?: unknown
}

const numberAt = (values: unknown, index: number): number | null => {
  if (!Array.isArray(values)) return null
  const value = values[index]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// WMO 날씨 코드(Open-Meteo)를 위젯이 사용하는 기상청 sky/pty 코드로 맞춘다.
export function wmoCodeToSkyPty(code: number): { sky: number; pty: number } {
  if ([95, 96, 99].includes(code)) return { sky: 4, pty: 4 }
  if ([80, 81, 82].includes(code)) return { sky: 3, pty: 4 }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { sky: 4, pty: 3 }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67].includes(code)) return { sky: 4, pty: 1 }
  if ([45, 48].includes(code)) return { sky: 4, pty: 0 }
  if (code === 0) return { sky: 1, pty: 0 }
  if ([1, 2].includes(code)) return { sky: 3, pty: 0 }
  return { sky: 4, pty: 0 }
}

export function parseOpenMeteoForecast(daily: OpenMeteoDailyForecast | null | undefined): DayForecast[] {
  const dates = Array.isArray(daily?.time) ? daily.time : []

  return dates.flatMap((date, index) => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return []

    const high = numberAt(daily?.temperature_2m_max, index)
    const low = numberAt(daily?.temperature_2m_min, index)
    if (high == null || low == null) return []

    const code = numberAt(daily?.weather_code, index) ?? 3
    const rawPop = numberAt(daily?.precipitation_probability_max, index) ?? 0
    const { sky, pty } = wmoCodeToSkyPty(code)

    return [{
      date: date.replace(/-/g, ''),
      high: Math.round(high),
      low: Math.round(low),
      sky,
      pty,
      pop: Math.max(0, Math.min(100, Math.round(rawPop))),
    }]
  })
}

export function mergeDayForecasts(
  primary: DayForecast[],
  fallback: DayForecast[],
  maxDays = 14,
): DayForecast[] {
  const byDate = new Map(fallback.map(day => [day.date, day]))
  primary.forEach(day => byDate.set(day.date, day))
  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, maxDays)
}
