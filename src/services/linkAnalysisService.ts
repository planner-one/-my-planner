import type {
  CareerEventCategory,
  CareerEventStatus,
  CareerMilestoneType,
} from '../types'

export type LinkInsertTarget = 'career' | 'calendar' | 'task' | 'note'
export type LinkSourceKind = 'web-page' | 'image-poster'
export type LinkAnalysisConfidence = 'high' | 'medium' | 'low'

export interface LinkMilestoneDraft {
  type: CareerMilestoneType
  label: string
  date: string
  endDate?: string
}

export interface LinkAnalysisDraft {
  url: string
  hostname: string
  finalUrl?: string
  sourceKind: LinkSourceKind
  target: LinkInsertTarget
  title: string
  organization?: string
  summary: string
  notice?: string
  date: string
  deadline: string
  resultDate?: string
  selectionDate?: string
  roundDate?: string
  finalRoundDate?: string
  finalResultDate?: string
  operationStartDate?: string
  operationEndDate?: string
  time?: string
  endTime?: string
  location?: string
  conditions?: string
  documents?: string
  benefits?: string
  category: CareerEventCategory
  status: CareerEventStatus
  mode?: 'offline' | 'online' | 'hybrid'
  milestones: LinkMilestoneDraft[]
  confidence: LinkAnalysisConfidence
  missingFields: string[]
  warnings: string[]
  evidence: Partial<Record<'title' | 'organization' | 'date' | 'deadline' | 'location' | 'conditions' | 'documents' | 'benefits', string>>
  imageUrls: string[]
  readerStatus?: string
  readerSource?: 'direct' | 'reader' | 'none'
}

interface LinkAnalysisInput {
  url: string
  memo?: string
  pageText?: string
  posterText?: string
  sourceKind?: LinkSourceKind
  target?: LinkInsertTarget
  finalUrl?: string
  imageUrls?: string[]
  readerStatus?: string
  readerMessage?: string
  readerSource?: 'direct' | 'reader' | 'none'
}

const CAREER_HINTS = [
  'recruit', 'career', 'job', 'apply', 'hire', 'program', 'camp', 'course',
  '채용', '모집', '지원', '공고', '교육', '프로그램', '캠프', '공모',
]

const CALENDAR_HINTS = [
  'event', 'seminar', 'conference', 'meetup', 'webinar',
  '행사', '세미나', '컨퍼런스', '웨비나',
]

const GENERIC_URL_TITLES = /^(view|detail|read|notice|notice\s*view|viewhire|hire|recruit|career|job|jobs|index|main|home|board|bbs|article|post|content|page|default|list|[0-9]+)$/i
const TITLE_HINTS = /(모집|채용|공고|지원|교육|캠프|프로그램|행사|세미나|사업|공모|취업|설명회|면접|해커톤|컨퍼런스)/i
const PAGE_NOISE = /^(INNOBIZ|공지사항|입찰\/채용|지원정보|로그인|회원가입|사이트맵|전체보기|사업안내|COPYRIGHT|목록|이전글|다음글|메뉴|홈|채용정보)$/i

const normalizeSpaces = (value: string) => value.replace(/\s+/g, ' ').trim()
const normalizeAnalysisText = (value = '') =>
  value.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

const unique = <T,>(values: T[]) => Array.from(new Set(values))

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

  const picked = pathParts[pathParts.length - 1] ?? ''
  const readable = normalizeSpaces(picked.replace(/[-_+|]+/g, ' '))
  return !readable || GENERIC_URL_TITLES.test(readable) ? '' : readable
}

const isGoogleForm = (url: URL) =>
  url.hostname === 'docs.google.com' && url.pathname.includes('/forms/')

const isImageLikeUrl = (url: URL) =>
  /\.(png|jpe?g|webp|gif|bmp)$/i.test(url.pathname) ||
  /\/DownFile\/FileUrl/i.test(url.pathname) ||
  /file[_-]?no=/i.test(url.search)

const inferCategory = (haystack: string): CareerEventCategory => {
  if (/해커톤|hackathon|공모|contest|competition|상금|심사|본선|수상/i.test(haystack)) return 'contest'
  if (/camp|캠프|부트캠프/i.test(haystack)) return 'camp'
  if (/면접|interview/i.test(haystack)) return 'interview'
  if (/채용\s*설명회|기업\s*설명회|job\s*fair|recruiting\s*event/i.test(haystack)) return 'briefing'
  if (/seminar|webinar|conference|세미나|컨퍼런스|포럼|박람회|설명회|행사/i.test(haystack)) return 'seminar'
  if (/지원사업|지원금|바우처|보조금|창업\s*지원|청년\s*지원|복지|수당/i.test(haystack)) return 'support'
  if (/교육|program|course|class|프로그램|강의|아카데미|취업\s*캠프/i.test(haystack)) return 'program'
  if (/채용|recruit|career|job|hire|기업\s*지원/i.test(haystack)) return 'corp_support'
  return 'other'
}

const inferTarget = (haystack: string): LinkInsertTarget => {
  const lower = haystack.toLowerCase()
  if (lower.includes('docs.google.com') && lower.includes('/forms/')) return 'career'
  if (CAREER_HINTS.some(hint => lower.includes(hint.toLowerCase()))) return 'career'
  if (CALENDAR_HINTS.some(hint => lower.includes(hint.toLowerCase()))) return 'calendar'
  return 'note'
}

const isValidDate = (year: number, month: number, day: number) => {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

const toFourDigitYear = (value: string | undefined, fallbackYear: number) => {
  if (!value) return fallbackYear
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallbackYear
  return parsed < 100 ? 2000 + parsed : parsed
}

const toDateKey = (year: number, month: string | number, day: string | number) => {
  const normalizedMonth = Number(month)
  const normalizedDay = Number(day)
  if (!isValidDate(year, normalizedMonth, normalizedDay)) return ''
  return `${year}-${String(normalizedMonth).padStart(2, '0')}-${String(normalizedDay).padStart(2, '0')}`
}

const extractDates = (value: string) => {
  const results: string[] = []
  let activeYear = Number(value.match(/20\d{2}/)?.[0] ?? new Date().getFullYear())
  const pattern = /(?:(20\d{2}|\d{2})\s*(?:년|[./_-])\s*)?(1[0-2]|0?[1-9])\s*(?:월|[./_-])\s*(3[01]|[12]\d|0?[1-9])\s*(?:일)?/g
  for (const match of value.matchAll(pattern)) {
    activeYear = toFourDigitYear(match[1], activeYear)
    const date = toDateKey(activeYear, match[2], match[3])
    if (date && !results.includes(date)) results.push(date)
  }
  return results
}

const sliceAfterLabel = (text: string, labels: RegExp[], maxLength = 360) => {
  for (const label of labels) {
    label.lastIndex = 0
    const match = label.exec(text)
    if (match?.index !== undefined) return text.slice(match.index, match.index + maxLength)
  }
  return ''
}

const DATE_SECTION_STOP = /(?:선발|선정|합격자?|결과|예선|본선|최종|운영|교육|프로그램|캠프|사업|행사|면접|장소|위치|주소|모집\s*대상|참가\s*대상|신청\s*조건|지원\s*자격|혜택|지원\s*내용|문의)\s*(?:일자|일정|일시|기간|발표|시작|종료)?\s*[:：]/i

const dateEvidenceNear = (text: string, labels: RegExp[]) => {
  const raw = sliceAfterLabel(text, labels)
  if (!raw) return ''
  const matchedLabel = labels.map(label => {
    label.lastIndex = 0
    return label.exec(raw)?.[0] ?? ''
  }).find(Boolean) ?? ''
  const afterLabel = raw.slice(matchedLabel.length)
  const firstLineBreak = afterLabel.indexOf('\n')
  const firstLine = firstLineBreak >= 0 ? afterLabel.slice(0, firstLineBreak) : afterLabel
  const firstLineHasDate = extractDates(firstLine).length > 0
  let section = firstLineHasDate || firstLineBreak < 0
    ? afterLabel
    : afterLabel.slice(0, afterLabel.indexOf('\n', firstLineBreak + 1) >= 0 ? afterLabel.indexOf('\n', firstLineBreak + 1) : afterLabel.length)
  if (firstLineBreak >= 0 && firstLineHasDate) section = afterLabel.slice(0, firstLineBreak)
  const stopIndex = section.search(DATE_SECTION_STOP)
  if (stopIndex >= 0) section = section.slice(0, stopIndex)
  return `${matchedLabel}${section}`
}

const extractDateRangeNear = (text: string, labels: RegExp[]) => {
  const evidence = dateEvidenceNear(text, labels)
  const dates = extractDates(evidence)
  return {
    start: dates[0] ?? '',
    end: dates.length > 1 ? dates[dates.length - 1] : '',
    evidence: normalizeSpaces(evidence).slice(0, 180),
  }
}

const extractDateNear = (text: string, labels: RegExp[], pick: 'first' | 'last' = 'first') => {
  const range = extractDateRangeNear(text, labels)
  return pick === 'last' ? range.end || range.start : range.start
}

const extractTimeRange = (text: string) => {
  const eventSlice = sliceAfterLabel(text, [/행사\s*일시/, /교육\s*일시/, /운영\s*일시/, /면접\s*일시/, /일시\s*[:：]/, /행사일/, /교육일/])
  if (!eventSlice) return { time: '', endTime: '' }
  const match = eventSlice.match(/([01]?\d|2[0-3])\s*:\s*([0-5]\d)\s*(?:[-~∼]\s*([01]?\d|2[0-3])\s*:\s*([0-5]\d))?/)
  if (!match) return { time: '', endTime: '' }
  return {
    time: `${match[1].padStart(2, '0')}:${match[2]}`,
    endTime: match[3] && match[4] ? `${match[3].padStart(2, '0')}:${match[4]}` : '',
  }
}

const isUsefulExtractedValue = (value: string) =>
  value.length >= 2 && !/^(안내|정보|내용|상세|보기|바로가기|없음|해당\s*없음|-+)$/i.test(value)

const extractLabeledLine = (text: string, labelPattern: RegExp) => {
  const lines = text.split('\n').map(line => normalizeSpaces(line)).filter(Boolean)
  for (let index = 0; index < lines.length; index += 1) {
    labelPattern.lastIndex = 0
    if (!labelPattern.test(lines[index])) continue
    labelPattern.lastIndex = 0
    const sameLine = normalizeSpaces(lines[index].replace(labelPattern, '').replace(/^[:：\s-]+/, ''))
    if (sameLine && sameLine.length <= 240) {
      if (isUsefulExtractedValue(sameLine)) return sameLine
      continue
    }
    const next = lines[index + 1] ?? ''
    if (next.length <= 240 && isUsefulExtractedValue(next)) return next
  }
  return ''
}

const extractInlineLabel = (text: string, label: RegExp, stopLabels: RegExp, maxLength = 240) => {
  const flags = label.flags.includes('g') ? label.flags : `${label.flags}g`
  const matcher = new RegExp(label.source, flags)
  for (const match of text.matchAll(matcher)) {
    if (match.index === undefined) continue
    const rest = text.slice(match.index + match[0].length)
    const stop = rest.search(stopLabels)
    const rawValue = normalizeSpaces((stop >= 0 ? rest.slice(0, stop) : rest).replace(/^\s*[:：-]\s*/, ''))
    const value = rawValue.length > maxLength ? rawValue.slice(0, maxLength).trim() : rawValue
    if (isUsefulExtractedValue(value)) return value
  }
  return ''
}

const extractField = (text: string, lineLabel: RegExp, inlineLabel: RegExp, stopLabels: RegExp, maxLength = 240) =>
  extractLabeledLine(text, lineLabel) || extractInlineLabel(text, inlineLabel, stopLabels, maxLength)

const inferMode = (text: string, location: string): LinkAnalysisDraft['mode'] => {
  const hasOnline = /온라인|zoom|줌|webex|youtube|유튜브\s*라이브|웨비나|비대면|메타버스/i.test(text)
  const hasOffline = Boolean(location) || /오프라인|대면\s*진행/i.test(text)
  if (hasOnline && hasOffline) return 'hybrid'
  if (hasOffline) return 'offline'
  if (hasOnline) return 'online'
  return undefined
}

const titleFromPosterText = (text: string, fallback: string) => {
  const lines = text.split('\n').map(line => normalizeSpaces(line)).filter(Boolean)
  const skipped = /모집\s*기간|응시\s*대상|응시\s*내용|상세\s*일정|자주\s*묻는\s*질문|심사위원|후원사|문의|주의|혜택/
  const picked = lines.find(line => line.length >= 4 && line.length <= 100 && !skipped.test(line) && TITLE_HINTS.test(line))
  return picked || fallback
}

const cleanPageTitle = (value: string) => normalizeSpaces(value)
  .replace(/^Title\s*:\s*/i, '')
  .replace(/\s*[|｜-]\s*(사람인|원티드|잡플래닛|점핏|인크루트|INNOBIZ).*$/i, '')
  .trim()

const titleFromPageText = (text: string, fallback: string) => {
  const explicit = extractField(
    text,
    /^(행사명|프로그램명|교육명|과정명|공고명|사업명|대회명|채용명|제목)\s*[:：]?/i,
    /(?:행사명|프로그램명|교육명|과정명|공고명|사업명|대회명|채용명|제목)\s*[:：]\s*/i,
    /(?:일시|기간|장소|모집\s*대상|지원\s*대상|신청|접수|작성자|작성일|조회수)\s*[:：]?/i,
    120,
  )
  if (explicit && TITLE_HINTS.test(explicit)) return cleanPageTitle(explicit)

  const flattened = normalizeSpaces(text)
  const noticeHeading = flattened.match(/(?:공지사항|지원정보|채용공고)\s+(.{6,120}?(?:모집|채용|공고|지원|교육|캠프|프로그램|행사|세미나|사업|공모|취업)[^]{0,35}?)\s+(?:종류|작성자|작성일|조회수)/i)?.[1]
  if (noticeHeading) return cleanPageTitle(noticeHeading)

  const lines = text.split('\n').map(line => normalizeSpaces(line)).filter(Boolean)
  const titleLine = lines.find(line => /^Title\s*:/i.test(line))
  if (titleLine) {
    const cleaned = cleanPageTitle(titleLine)
    if (cleaned.length >= 5 && cleaned.length <= 120 && !GENERIC_URL_TITLES.test(cleaned)) return cleaned
  }
  const picked = lines.find(line => line.length >= 6 && line.length <= 120 && !PAGE_NOISE.test(line) && TITLE_HINTS.test(line))
  return picked ? cleanPageTitle(picked) : fallback
}

const inferOrganization = (text: string) => {
  const labeled = extractField(
    text,
    /^(기관|기관명|주최|주관|운영|회사|회사명)\s*[:：]?/i,
    /(?:기관|기관명|주최|주관|운영\s*기관|회사|회사명)\s*[:：]\s*/i,
    /(?:행사명|공고명|일시|기간|장소|모집|신청|접수|문의)\s*[:：]?/i,
    120,
  )
  if (labeled) return labeled

  const flattened = normalizeSpaces(text)
  const organizationName = '[가-힣A-Za-z0-9㈜()·& ]{1,35}(?:특별시|광역시|도|시|군|구|청|부|처|원|공사|공단|재단|협회|대학교|대학|센터|회사)'
  const pairPattern = new RegExp(`(${organizationName})(?:와|과)\\s*(${organizationName})(?:가|이)\\s+[^.]{0,100}?(?:개최|모집|운영|지원)`, 'i')
  const pair = text.split('\n').map(line => normalizeSpaces(line)).map(line => line.match(pairPattern)).find(Boolean) ?? flattened.match(pairPattern)
  const cleanInferredName = (value: string) => normalizeSpaces(value)
    .replace(/^.*(?:작성일|조회수)\s*[\d./-]+\s*/i, '')
    .replace(/^\d+[\d./-]*\s+/, '')
  if (pair) return `${cleanInferredName(pair[1])} · ${cleanInferredName(pair[2])}`
  const singlePattern = new RegExp(`(${organizationName})(?:가|이)\\s+[^.]{0,100}?(?:개최|모집|운영)`, 'i')
  const single = text.split('\n').map(line => normalizeSpaces(line)).map(line => line.match(singlePattern)).find(Boolean) ?? flattened.match(singlePattern)
  return single ? cleanInferredName(single[1]) : ''
}

const extractOverview = (text: string, title: string) => {
  const flattened = normalizeSpaces(text)
  const purpose = flattened.match(/([가-힣A-Za-z0-9㈜()·,&'"\s]{2,100}(?:지원하기 위해|위한|대상으로)[^.]{5,180}(?:개최|모집|운영|진행)[^.]*\.)/i)?.[1]
  if (purpose) return normalizeSpaces(purpose)
  const lines = text.split('\n').map(line => normalizeSpaces(line)).filter(Boolean)
  return lines.find(line => line !== title && line.length >= 20 && line.length <= 220 && !PAGE_NOISE.test(line) && !/^(Title|URL Source|Markdown Content)/i.test(line)) ?? ''
}

const buildMilestones = (fields: {
  deadline: string
  eventStart: string
  eventEnd: string
  selectionDate: string
  resultDate: string
  roundDate: string
  finalRoundDate: string
  finalResultDate: string
  operationStartDate: string
  operationEndDate: string
}) => {
  const milestones: LinkMilestoneDraft[] = []
  const add = (type: CareerMilestoneType, label: string, date: string, endDate = '') => {
    if (!date) return
    if (milestones.some(item => item.type === type && item.label === label && item.date === date && (item.endDate ?? '') === endDate)) return
    milestones.push({ type, label, date, endDate: endDate || undefined })
  }
  add('application_deadline', '신청 마감', fields.deadline)
  add('selection_announcement', '선발 발표', fields.selectionDate)
  add('round', '예선/심사', fields.roundDate)
  add('final_round', '본선', fields.finalRoundDate)
  add('result_announcement', fields.finalResultDate ? '최종 결과' : '결과 발표', fields.finalResultDate || fields.resultDate)
  add('operation', '운영 기간', fields.operationStartDate, fields.operationEndDate)
  add('main', '대표 일정', fields.eventStart, fields.eventEnd)
  return milestones
}

export function createLinkAnalysisDraft(input: LinkAnalysisInput): LinkAnalysisDraft {
  const normalized = normalizeLinkUrl(input.url)
  const parsed = new URL(normalized)
  const googleForm = isGoogleForm(parsed)
  const userMemo = normalizeAnalysisText(input.memo)
  const pageText = normalizeAnalysisText(input.pageText)
  const posterText = normalizeAnalysisText(input.posterText)
  const sourceKind = input.sourceKind ?? (posterText || isImageLikeUrl(parsed) ? 'image-poster' : 'web-page')
  const analysisText = [pageText, posterText, userMemo].filter(Boolean).join('\n\n')
  const fallbackTitle = googleForm ? 'Google Form 신청 링크' : titleFromUrl(parsed)
  const title = sourceKind === 'image-poster'
    ? titleFromPosterText(posterText || userMemo, fallbackTitle)
    : titleFromPageText(pageText || userMemo, fallbackTitle)
  const haystack = `${parsed.hostname} ${parsed.pathname} ${parsed.search} ${title} ${analysisText}`
  const target = input.target ?? inferTarget(haystack)
  const category = inferCategory(`${title}\n${analysisText}`)

  const deadlineRange = extractDateRangeNear(analysisText, [/모집\s*기간/, /접수\s*기간/, /신청\s*기간/, /지원\s*기간/, /신청\s*마감/, /접수\s*마감/, /모집\s*마감/])
  const deadline = deadlineRange.end || deadlineRange.start
  const eventRange = extractDateRangeNear(analysisText, [/행사\s*일시/, /교육\s*일시/, /운영\s*일시/, /면접\s*일시/, /일시\s*[:：]/, /행사일/, /교육일/, /본선\s*일정/])
  const operationRange = extractDateRangeNear(analysisText, [/운영\s*기간/, /교육\s*기간/, /프로그램\s*기간/, /캠프\s*기간/, /사업\s*기간/])
  const selectionDate = extractDateNear(analysisText, [/선발\s*(?:결과\s*)?발표/, /선정\s*발표/, /합격자?\s*발표/, /1차\s*발표/])
  const finalResultDate = extractDateNear(analysisText, [/최종\s*(?:결과|합격자?)\s*발표/, /수상자?\s*발표/, /시상\s*일정/])
  const resultDate = finalResultDate || extractDateNear(analysisText, [/결과\s*발표/, /합격자?\s*발표/, /발표\s*예정/])
  const roundDate = extractDateNear(analysisText, [/예선\s*(?:일자|일정)?/, /1차\s*심사/, /서류\s*심사/])
  const finalRoundDate = extractDateNear(analysisText, [/본선\s*(?:일자|일정)?/, /최종\s*(?:심사|라운드)/])
  const inferredOperationStart = operationRange.start || (['camp', 'program', 'support'].includes(category) ? eventRange.start : '')
  const inferredOperationEnd = operationRange.end || (inferredOperationStart ? eventRange.end : '')
  const date = eventRange.start || inferredOperationStart || deadline || selectionDate || resultDate || roundDate || finalRoundDate
  const { time, endTime } = extractTimeRange(analysisText)
  const location = extractField(
    analysisText,
    /^(장소|위치|주소|교육장|행사장|면접장)\s*[:：]?/i,
    /(?:장소|위치|주소|교육장|행사장|면접장)\s*[:：]\s*/i,
    /(?:모집\s*대상|참가\s*대상|신청|접수|문의|혜택|주요\s*프로그램|일시|운영|기간)\s*[:：]?/i,
    160,
  )
  const organization = inferOrganization(analysisText)
  const conditions = extractField(
    analysisText,
    /^(모집\s*대상|참가\s*대상|신청\s*조건|지원\s*자격|참여\s*대상|신청\s*자격)\s*[:：]?/i,
    /(?:모집\s*대상|참가\s*대상|신청\s*조건|지원\s*자격|참여\s*대상|신청\s*자격)\s*[:：]\s*/i,
    /(?:모집\s*인원|혜택|지원\s*내용|주요\s*프로그램|신청|접수|문의|일시|기간)\s*[:：]?/i,
    280,
  )
  const documents = extractField(
    analysisText,
    /^(제출\s*서류|필요\s*서류|준비물|구비\s*서류|신청\s*서류)\s*[:：]?/i,
    /(?:제출\s*서류|필요\s*서류|준비물|구비\s*서류|신청\s*서류)\s*[:：]\s*/i,
    /(?:접수|신청|문의|혜택|지원\s*내용|유의사항|선정|결과)\s*[:：]?/i,
    320,
  )
  const benefits = extractField(
    analysisText,
    /^(참가\s*혜택|혜택|지원\s*내용|비용|참가비|교육비)\s*[:：]?/i,
    /(?:참가\s*혜택|혜택|지원\s*내용|비용|참가비|교육비)\s*[:：]\s*/i,
    /(?:주요\s*프로그램|신청|접수|문의|모집|일시|기간|유의사항)\s*[:：]?/i,
    320,
  )
  const mode = inferMode(analysisText, location)
  const milestones = buildMilestones({
    deadline,
    eventStart: eventRange.start,
    eventEnd: eventRange.end,
    selectionDate,
    resultDate,
    roundDate,
    finalRoundDate,
    finalResultDate,
    operationStartDate: inferredOperationStart,
    operationEndDate: inferredOperationEnd,
  })
  if (date && !milestones.some(milestone => milestone.type === 'main')) {
    milestones.push({ type: 'main', label: '대표 일정', date })
  }

  const missingFields = unique([
    !title ? '제목' : '',
    target === 'career' && !organization ? '기관/회사' : '',
    ['career', 'calendar'].includes(target) && !date ? '대표 일정일' : '',
    target === 'task' && !deadline && !date ? '마감일' : '',
  ].filter(Boolean))
  const warnings = unique([
    googleForm ? 'Google Form은 폼 내용과 마감일을 자동으로 읽지 못할 수 있습니다. 원 공고 링크를 함께 확인해 주세요.' : '',
    sourceKind === 'image-poster' && !posterText ? '이미지 글자가 아직 없습니다. 페이지 이미지 OCR 또는 이미지 파일 OCR이 필요합니다.' : '',
    input.readerStatus && input.readerStatus !== 'success' ? input.readerMessage || '페이지 일부를 읽지 못했습니다.' : '',
    !pageText && sourceKind === 'web-page' ? '페이지 본문을 확보하지 못했습니다. 원문 붙여넣기 또는 이미지 OCR로 보완해 주세요.' : '',
    missingFields.length ? `자동 확인이 필요한 항목: ${missingFields.join(', ')}` : '',
  ].filter(Boolean))
  const recognizedCount = [title, organization, date, deadline, location, conditions, documents, benefits].filter(Boolean).length
  const confidence: LinkAnalysisConfidence = missingFields.length === 0 && recognizedCount >= 4
    ? 'high'
    : title && recognizedCount >= 2 ? 'medium' : 'low'
  const overview = extractOverview(analysisText, title)
  const summary = [
    overview ? `요약: ${overview}` : '',
    conditions ? `신청 조건: ${conditions}` : '',
    documents ? `준비물/제출서류: ${documents}` : '',
    benefits ? `혜택/비용: ${benefits}` : '',
    userMemo ? `사용자 메모: ${userMemo}` : '',
    warnings.length ? `확인 필요: ${warnings.join(' / ')}` : '',
    `원본 링크: ${normalized}`,
  ].filter(Boolean).join('\n')
  const hostname = parsed.hostname.replace(/^www\./, '')

  return {
    url: normalized,
    hostname,
    finalUrl: input.finalUrl,
    sourceKind,
    target,
    title,
    organization: organization || undefined,
    summary,
    notice: warnings.join('\n'),
    date,
    deadline,
    resultDate: resultDate || undefined,
    selectionDate: selectionDate || undefined,
    roundDate: roundDate || undefined,
    finalRoundDate: finalRoundDate || undefined,
    finalResultDate: finalResultDate || undefined,
    operationStartDate: inferredOperationStart || undefined,
    operationEndDate: inferredOperationEnd || undefined,
    time: time || undefined,
    endTime: endTime || undefined,
    location: location || undefined,
    conditions: conditions || undefined,
    documents: documents || undefined,
    benefits: benefits || undefined,
    category,
    status: 'interested',
    mode,
    milestones,
    confidence,
    missingFields,
    warnings,
    evidence: {
      title: title || undefined,
      organization: organization || undefined,
      date: eventRange.evidence || operationRange.evidence || undefined,
      deadline: deadlineRange.evidence || undefined,
      location: location || undefined,
      conditions: conditions || undefined,
      documents: documents || undefined,
      benefits: benefits || undefined,
    },
    imageUrls: unique(input.imageUrls ?? []),
    readerStatus: input.readerStatus,
    readerSource: input.readerSource,
  }
}
