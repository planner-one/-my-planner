import type { CareerEventCategory, CareerEventStatus } from '../types'
import { toLocalDateKey } from '../utils/date'

export type LinkInsertTarget = 'career' | 'calendar' | 'task' | 'note'
export type LinkSourceKind = 'web-page' | 'image-poster'

export interface LinkAnalysisDraft {
  url: string
  hostname: string
  sourceKind: LinkSourceKind
  target: LinkInsertTarget
  title: string
  organization?: string
  summary: string
  notice?: string
  date: string
  deadline: string
  resultDate?: string
  time?: string
  endTime?: string
  location?: string
  conditions?: string
  benefits?: string
  category: CareerEventCategory
  status: CareerEventStatus
  mode: 'offline' | 'online' | 'hybrid'
}

interface LinkAnalysisInput {
  url: string
  memo?: string
  posterText?: string
  sourceKind?: LinkSourceKind
  target?: LinkInsertTarget
}

const CAREER_HINTS = [
  'recruit', 'career', 'job', 'apply', 'hire', 'program', 'camp', 'course',
  '채용', '모집', '지원', '공고', '교육', '프로그램', '캠프', '공모',
]

const CALENDAR_HINTS = [
  'event', 'seminar', 'conference', 'meetup', 'webinar',
  '행사', '세미나', '컨퍼런스', '웨비나',
]

const normalizeSpaces = (value: string) => value.replace(/\s+/g, ' ').trim()
const normalizeAnalysisText = (value = '') =>
  value.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

export function normalizeLinkUrl(raw: string) {
  const value = raw.trim()
  if (!value) throw new Error('EMPTY_URL')

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  const parsed = new URL(withScheme)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('INVALID_URL')
  parsed.hash = ''
  return parsed.toString()
}

const decodePart = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const titleFromUrl = (url: URL) => {
  const pathParts = url.pathname
    .split('/')
    .map(part => decodePart(part).replace(/\.[a-z0-9]+$/i, ''))
    .filter(Boolean)

  const picked = pathParts[pathParts.length - 1] ?? url.hostname.replace(/^www\./, '')
  const readable = normalizeSpaces(picked.replace(/[-_+|]+/g, ' '))
  return readable || url.hostname
}

const isGoogleForm = (url: URL) =>
  url.hostname === 'docs.google.com' && url.pathname.includes('/forms/')

const isImageLikeUrl = (url: URL) =>
  /\.(png|jpe?g|webp|gif|bmp)(\?.*)?$/i.test(url.pathname) ||
  /\/DownFile\/FileUrl/i.test(url.pathname) ||
  /file[_-]?no=/i.test(url.search)

const inferCategory = (haystack: string): CareerEventCategory => {
  if (/채용|recruit|career|job|hire|기업|corp/i.test(haystack)) return 'corp_support'
  if (/해커톤|hackathon|공모|contest|competition|상금|심사/i.test(haystack)) return 'contest'
  if (/camp|캠프/i.test(haystack)) return 'camp'
  if (/seminar|webinar|conference|event|세미나|행사|컨퍼런스/i.test(haystack)) return 'seminar'
  if (/교육|program|course|class|프로그램|강의/i.test(haystack)) return 'program'
  return 'other'
}

const inferTarget = (haystack: string): LinkInsertTarget => {
  if (haystack.includes('docs.google.com') && haystack.includes('/forms/')) return 'career'
  if (CAREER_HINTS.some(hint => haystack.includes(hint.toLowerCase()))) return 'career'
  if (CALENDAR_HINTS.some(hint => haystack.includes(hint.toLowerCase()))) return 'calendar'
  return 'note'
}

const toFourDigitYear = (value?: string) => {
  if (!value) return new Date().getFullYear()
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return new Date().getFullYear()
  if (parsed < 100) return 2000 + parsed
  return parsed
}

const toDateKey = (year: number, month: string | number, day: string | number) => {
  const normalizedMonth = Number(month)
  const normalizedDay = Number(day)
  if (normalizedMonth < 1 || normalizedMonth > 12 || normalizedDay < 1 || normalizedDay > 31) return ''
  return `${year}-${String(normalizedMonth).padStart(2, '0')}-${String(normalizedDay).padStart(2, '0')}`
}

const inferDate = (haystack: string) => {
  const match = haystack.match(/(20\d{2})[./_-]?(0?[1-9]|1[0-2])[./_-]?(0?[1-9]|[12]\d|3[01])/)
  if (!match) return ''
  const [, year, month, day] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const extractDates = (value: string) => {
  const results: string[] = []
  const add = (date: string) => {
    if (date && !results.includes(date)) results.push(date)
  }

  const fullDatePattern = /(20\d{2}|\d{2})\s*(?:년|[./_-])\s*(0?[1-9]|1[0-2])\s*(?:월|[./_-])\s*(0?[1-9]|[12]\d|3[01])\s*(?:일)?/g
  for (const match of value.matchAll(fullDatePattern)) {
    add(toDateKey(toFourDigitYear(match[1]), match[2], match[3]))
  }

  const monthDayPattern = /(^|[^\d])(0?[1-9]|1[0-2])\s*(?:월|[./_-])\s*(0?[1-9]|[12]\d|3[01])\s*(?:일)?/g
  for (const match of value.matchAll(monthDayPattern)) {
    add(toDateKey(new Date().getFullYear(), match[2], match[3]))
  }

  return results
}

const sliceAfterLabel = (text: string, labels: RegExp[]) => {
  for (const label of labels) {
    label.lastIndex = 0
    const match = label.exec(text)
    if (match?.index !== undefined) return text.slice(match.index, match.index + 180)
  }
  return ''
}

const extractDateNear = (text: string, labels: RegExp[], pick: 'first' | 'last' = 'first') => {
  const dates = extractDates(sliceAfterLabel(text, labels))
  if (!dates.length) return ''
  return pick === 'last' ? dates[dates.length - 1] : dates[0]
}

const extractTimeRange = (text: string) => {
  const eventSlice = sliceAfterLabel(text, [/응시일/, /행사일/, /일정/, /운영일/, /교육일/]) || text
  const match = eventSlice.match(/([01]?\d|2[0-3])\s*:\s*([0-5]\d)\s*(?:[-~]\s*([01]?\d|2[0-3])\s*:\s*([0-5]\d))?/)
  if (!match) return { time: '', endTime: '' }
  return {
    time: `${match[1].padStart(2, '0')}:${match[2]}`,
    endTime: match[3] && match[4] ? `${match[3].padStart(2, '0')}:${match[4]}` : '',
  }
}

const extractLabeledLine = (text: string, labelPattern: RegExp) => {
  const lines = text.split('\n').map(line => normalizeSpaces(line)).filter(Boolean)
  for (let index = 0; index < lines.length; index += 1) {
    labelPattern.lastIndex = 0
    if (!labelPattern.test(lines[index])) continue
    labelPattern.lastIndex = 0
    const sameLine = normalizeSpaces(lines[index].replace(labelPattern, '').replace(/^[:：\s-]+/, ''))
    if (sameLine) return sameLine
    return lines[index + 1] ?? ''
  }
  return ''
}

const extractInlineLabel = (text: string, label: RegExp, stopLabels: RegExp) => {
  const match = text.match(label)
  if (!match || match.index === undefined) return ''
  const rest = text.slice(match.index + match[0].length)
  const stop = rest.search(stopLabels)
  return normalizeSpaces((stop >= 0 ? rest.slice(0, stop) : rest).replace(/^\s*[:：-]\s*/, ''))
}

const inferMode = (text: string): LinkAnalysisDraft['mode'] => {
  const hasOnline = /온라인|zoom|줌|webinar|웨비나|비대면/i.test(text)
  const hasOffline = /오프라인|장소|주소|역\b|센터|라운지|강의실|회의실|층\b/i.test(text)
  if (hasOnline && hasOffline) return 'hybrid'
  if (hasOffline) return 'offline'
  return 'online'
}

const inferStatus = (deadline: string): CareerEventStatus => {
  if (!deadline) return 'interested'
  return deadline < toLocalDateKey() ? 'pending' : 'planned'
}

const titleFromPosterText = (text: string, fallback: string) => {
  if (/잡코리아/i.test(text) && /(바이브톤|vibeathon)/i.test(text)) return '잡코리아 바이브톤'
  const lines = text.split('\n').map(line => normalizeSpaces(line)).filter(Boolean)
  const skipped = /모집\s*기간|응시\s*대상|응시\s*내용|상세\s*일정|자주\s*묻는\s*질문|심사위원|후원사|문의|주의|혜택/
  const picked = lines.find(line =>
    line.length >= 4 &&
    line.length <= 60 &&
    !skipped.test(line) &&
    /(해커톤|바이브톤|공모전|프로그램|모집|교육|행사|캠프|채용)/i.test(line),
  )
  return picked || fallback
}

const titleFromPageText = (text: string, fallback: string) => {
  const lines = text.split('\n').map(line => normalizeSpaces(line)).filter(Boolean)
  const noise = /^(INNOBIZ|공지사항|입찰\/채용|지원정보|로그인|회원가입|사이트맵|전체보기|사업안내|COPYRIGHT|목록|이전글|다음글)/i
  const picked = lines.find(line =>
    line.length >= 8 && line.length <= 100 &&
    !noise.test(line) &&
    /(모집|채용|공고|지원|교육|캠프|프로그램|행사|세미나|사업|공모|취업)/i.test(line),
  )
  return picked || fallback
}

const extractPosterFields = (text: string) => {
  const deadline = extractDateNear(text, [/모집\s*기간/, /접수\s*기간/, /신청\s*기간/, /신청\s*마감/, /접수\s*마감/], 'last')
  const eventDate =
    extractDateNear(text, [/응시일/, /행사일/, /운영일/, /교육일/, /일시/, /일정/], 'first') ||
    extractDates(text).find(date => date !== deadline) ||
    ''
  const resultDate = extractDateNear(text, [/선발\s*발표/, /결과\s*발표/, /발표/], 'first')
  const { time, endTime } = extractTimeRange(text)
  const location = extractLabeledLine(text, /^(장소|위치|주소)\s*/) || extractInlineLabel(text, /(?:장소|위치|주소)\s*[:：]?\s*/i, /(?:모집\s*대상|참가\s*대상|신청|문의|혜택|주요\s*프로그램|일시|운영)/i)
  const organization = extractLabeledLine(text, /^(기관|기관명|주최|주관|회사|회사명)\s*:/) || extractInlineLabel(text, /(?:기관|기관명|주최|주관|회사|회사명)\s*[:：]\s*/i, /(?:행사명|공고명|일시|모집|신청|문의)/i)
  const conditions = extractLabeledLine(text, /^(모집\s*대상|참가\s*대상|신청\s*조건|지원\s*자격)\s*:/) || extractInlineLabel(text, /(?:모집\s*대상|참가\s*대상|신청\s*조건|지원\s*자격)\s*[:：]\s*/i, /(?:모집\s*인원|혜택|주요\s*프로그램|신청|문의|일시)/i)
  const benefits = extractLabeledLine(text, /^(참가\s*혜택|혜택|지원\s*내용|비용|참가비)\s*:/) || extractInlineLabel(text, /(?:참가\s*혜택|혜택|지원\s*내용|비용|참가비)\s*[:：]\s*/i, /(?:주요\s*프로그램|신청|문의|모집|일시)/i)
  return {
    deadline,
    eventDate,
    resultDate,
    time,
    endTime,
    location,
    organization,
    conditions,
    benefits,
    mode: inferMode(text),
  }
}

export function createLinkAnalysisDraft(input: LinkAnalysisInput): LinkAnalysisDraft {
  const normalized = normalizeLinkUrl(input.url)
  const parsed = new URL(normalized)
  const googleForm = isGoogleForm(parsed)
  const memo = input.memo?.trim()
  const posterText = normalizeAnalysisText(input.posterText)
  const sourceKind = input.sourceKind ?? (posterText || isImageLikeUrl(parsed) ? 'image-poster' : 'web-page')
  const fallbackTitle = googleForm ? 'Google Form 신청 링크' : titleFromUrl(parsed)
  const sourceText = `${posterText}\n${memo ?? ''}`
  const title = sourceKind === 'image-poster' ? titleFromPosterText(posterText, fallbackTitle) : titleFromPageText(sourceText, fallbackTitle)
  const haystack = `${parsed.hostname} ${parsed.pathname} ${parsed.search} ${title} ${sourceText}`.toLowerCase()
  const posterFields = sourceText.trim() ? extractPosterFields(sourceText) : undefined
  const date = posterFields?.eventDate || inferDate(haystack) || toLocalDateKey()
  const target = input.target ?? inferTarget(haystack)
  const hostname = parsed.hostname.replace(/^www\./, '')
  const notices = [
    googleForm
      ? '이 Google Form은 로그인 또는 쿠키 허용이 필요할 수 있어 폼 제목, 질문, 마감일을 자동으로 읽지 못했습니다. 원본 링크를 보존하고 사용자가 직접 확인해 보정해야 합니다.'
      : '',
    sourceKind === 'image-poster'
      ? posterText
        ? '이미지 포스터에서 읽은 텍스트 기반 초안입니다. OCR/이미지 글자 인식은 오인식이 있을 수 있으므로 날짜, 시간, 장소를 저장 전 확인해야 합니다.'
        : '이미지 포스터 링크로 분류했지만 포스터 텍스트가 없어 세부 일정은 자동 추출하지 못했습니다. 포스터에서 읽은 내용을 붙여넣으면 더 정확한 초안을 만들 수 있습니다.'
      : '',
  ].filter(Boolean)
  const notice = notices.join('\n')
  const summary = [
    notice,
    memo || '',
    posterText ? `포스터 내용:\n${posterText}` : '',
    `원본 링크: ${normalized}`,
    `출처: ${hostname}`,
    posterFields?.conditions ? `신청 조건: ${posterFields.conditions}` : '',
    posterFields?.benefits ? `혜택/비용: ${posterFields.benefits}` : '',
    sourceKind === 'image-poster'
      ? '현재는 포스터 텍스트와 URL 기반의 초안입니다. 이미지 OCR 자동 실행은 추후 백엔드/API 연결 후 제공됩니다.'
      : '현재는 링크 제목과 URL 기반의 임시 초안입니다. 실제 페이지 본문 분석은 추후 백엔드/API 연결 후 제공됩니다.',
  ].filter(Boolean).join('\n')
  const deadline = posterFields?.deadline || ''

  return {
    url: normalized,
    hostname,
    sourceKind,
    target,
    title,
    organization: posterFields?.organization || undefined,
    summary,
    notice,
    date,
    deadline,
    resultDate: posterFields?.resultDate || undefined,
    time: posterFields?.time || undefined,
    endTime: posterFields?.endTime || undefined,
    location: posterFields?.location || undefined,
    conditions: posterFields?.conditions || undefined,
    benefits: posterFields?.benefits || undefined,
    category: inferCategory(haystack),
    status: target === 'career' ? inferStatus(deadline) : 'interested',
    mode: posterFields?.mode || 'online',
  }
}
