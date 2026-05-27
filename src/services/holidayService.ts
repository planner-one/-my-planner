const API_KEY = import.meta.env.VITE_HOLIDAY_API_KEY as string
const BASE_URL = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo'

interface HolidayItem {
  dateName: string
  isHoliday: string
  locdate: number
}

/** 연/월 기준 공휴일 목록을 반환. 키: 'MM-DD', 값: 공휴일 이름 */
export async function fetchHolidays(
  year: number,
  month: number,
): Promise<Record<string, string>> {
  const cacheKey = `holidays_${year}_${String(month).padStart(2, '0')}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) return JSON.parse(cached) as Record<string, string>

  try {
    const params = new URLSearchParams({
      ServiceKey: API_KEY,
      solYear:    String(year),
      solMonth:   String(month).padStart(2, '0'),
      numOfRows:  '50',
      _type:      'json',
    })

    const res = await fetch(`${BASE_URL}?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const raw = data?.response?.body?.items?.item

    // 항목이 없을 때
    if (!raw) {
      sessionStorage.setItem(cacheKey, '{}')
      return {}
    }

    // 단일 항목이면 배열로 감싸기
    const list: HolidayItem[] = Array.isArray(raw) ? raw : [raw]

    const result: Record<string, string> = {}
    for (const item of list) {
      // isHoliday='Y' = 실제 쉬는 날 (대체공휴일 포함)
      if (item.isHoliday === 'Y') {
        const s = String(item.locdate)           // e.g. "20260101"
        const mmdd = `${s.slice(4, 6)}-${s.slice(6, 8)}`  // "01-01"
        result[mmdd] = item.dateName
      }
    }

    sessionStorage.setItem(cacheKey, JSON.stringify(result))
    return result
  } catch (err) {
    console.warn('[holidayService] API 실패, 폴백 사용:', err)
    return {}
  }
}
