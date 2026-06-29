import type { CareerEvent, CareerEventCategory, CareerEventStatus } from '../types'

export const DEFAULT_CAREER_CATEGORY: CareerEventCategory = 'other'
export const DEFAULT_CAREER_STATUS: CareerEventStatus = 'interested'

export const CAREER_CATEGORY_LABELS: Record<CareerEventCategory, string> = {
  briefing: '채용설명회',
  interview: '면접',
  camp: '직무캠프',
  program: '교육/프로그램',
  seminar: '행사/세미나',
  contest: '공모전',
  support: '지원사업',
  corp_support: '기업 지원',
  other: '기타',
}

export const CAREER_STATUS_LABELS: Record<CareerEventStatus, string> = {
  interested: '관심',
  planned: '신청 예정',
  applied: '신청 완료',
  pending: '결과 대기',
  confirmed: '선정/확정',
  completed: '완료',
  rejected: '탈락',
  cancelled: '취소',
}

export const CAREER_CREATION_STATUSES: CareerEventStatus[] = [
  'interested', 'planned', 'applied', 'pending', 'confirmed', 'completed',
]

export const CAREER_OPEN_STATUSES: CareerEventStatus[] = [
  'interested', 'planned', 'applied', 'pending', 'confirmed',
]

export const CAREER_DONE_STATUSES: CareerEventStatus[] = [
  'completed', 'rejected', 'cancelled',
]

const CATEGORY_VALUES = new Set<CareerEventCategory>(
  Object.keys(CAREER_CATEGORY_LABELS) as CareerEventCategory[],
)
const STATUS_VALUES = new Set<CareerEventStatus>(
  Object.keys(CAREER_STATUS_LABELS) as CareerEventStatus[],
)

export const isCareerEventCategory = (value: unknown): value is CareerEventCategory =>
  typeof value === 'string' && CATEGORY_VALUES.has(value as CareerEventCategory)

export const isCareerEventStatus = (value: unknown): value is CareerEventStatus =>
  typeof value === 'string' && STATUS_VALUES.has(value as CareerEventStatus)

export function isWeekdayInRange(dateStr: string, start?: string, end?: string) {
  if (!start || dateStr < start || dateStr > (end || start)) return false
  const day = new Date(`${dateStr}T12:00:00`).getDay()
  return day !== 0 && day !== 6
}

export function getCareerMilestones(event: CareerEvent, dateStr: string) {
  const labels: string[] = []
  if (event.date === dateStr) labels.push('일정')
  if (event.applicationDeadline === dateStr) labels.push('신청 마감')
  if (event.resultDate === dateStr) labels.push('결과 발표')
  if (isWeekdayInRange(dateStr, event.operationStartDate, event.operationEndDate)) labels.push('운영')
  return labels
}

export interface CareerMilestoneEntry {
  label: string
  date: string
}

export function getCareerMilestoneEntries(event: CareerEvent): CareerMilestoneEntry[] {
  const entries: CareerMilestoneEntry[] = [
    { label: '일정', date: event.date },
  ]
  if (event.applicationDeadline) entries.push({ label: '신청 마감', date: event.applicationDeadline })
  if (event.resultDate) entries.push({ label: '결과 발표', date: event.resultDate })
  if (event.operationStartDate) entries.push({ label: '운영 시작', date: event.operationStartDate })
  if (event.operationEndDate && event.operationEndDate !== event.operationStartDate) {
    entries.push({ label: '운영 종료', date: event.operationEndDate })
  }

  return entries
    .filter(entry => Boolean(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getCareerLastRelevantDate(event: CareerEvent) {
  const dates = getCareerMilestoneEntries(event).map(entry => entry.date)

  if (dates.length === 0) return event.date
  const sorted = [...new Set(dates)].sort()
  return sorted[sorted.length - 1]
}

export function getCareerNextMilestone(event: CareerEvent, today: string) {
  const entries = getCareerMilestoneEntries(event)
  const upcoming = entries.find(entry => entry.date >= today)
  return upcoming ?? entries[entries.length - 1]
}

export function getCareerDaysUntil(date: string, today: string) {
  const target = new Date(`${date}T12:00:00`)
  const base = new Date(`${today}T12:00:00`)
  return Math.round((target.getTime() - base.getTime()) / 86400000)
}

export function formatCareerDday(date: string, today: string) {
  const days = getCareerDaysUntil(date, today)
  if (days === 0) return 'D-Day'
  if (days > 0) return `D-${days}`
  return `D+${Math.abs(days)}`
}

export function isCareerOpen(status: CareerEventStatus) {
  return CAREER_OPEN_STATUSES.includes(status)
}
