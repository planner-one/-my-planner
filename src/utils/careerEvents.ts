import type {
  CareerEvent,
  CareerEventCategory,
  CareerEventStatus,
  CareerMilestone,
  CareerMilestoneType,
} from '../types'

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

export const CAREER_MILESTONE_TYPE_LABELS: Record<CareerMilestoneType, string> = {
  main: '대표 일정',
  application_deadline: '신청 마감',
  result_announcement: '결과 발표',
  selection_announcement: '선발 발표',
  round: '진행 단계',
  final_round: '본선/최종',
  operation: '운영 기간',
  custom: '직접 입력',
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

type CareerMilestoneTemplate = Pick<CareerMilestone, 'type' | 'label'>

export const CAREER_CATEGORY_MILESTONE_TEMPLATES: Record<CareerEventCategory, CareerMilestoneTemplate[]> = {
  briefing: [
    { type: 'application_deadline', label: '신청 마감' },
    { type: 'main', label: '설명회 일자' },
  ],
  interview: [
    { type: 'main', label: '면접 일자' },
    { type: 'result_announcement', label: '결과 발표' },
  ],
  camp: [
    { type: 'application_deadline', label: '신청 마감' },
    { type: 'result_announcement', label: '결과 발표' },
    { type: 'operation', label: '운영 기간' },
  ],
  program: [
    { type: 'application_deadline', label: '신청 마감' },
    { type: 'result_announcement', label: '결과 발표' },
    { type: 'operation', label: '운영 기간' },
  ],
  seminar: [
    { type: 'application_deadline', label: '신청 마감' },
    { type: 'main', label: '행사 일자' },
  ],
  contest: [
    { type: 'application_deadline', label: '신청 마감' },
    { type: 'selection_announcement', label: '선발 발표' },
    { type: 'final_round', label: '본선' },
    { type: 'result_announcement', label: '최종 결과' },
  ],
  support: [
    { type: 'application_deadline', label: '신청 마감' },
    { type: 'result_announcement', label: '결과 발표' },
    { type: 'operation', label: '운영 기간' },
  ],
  corp_support: [
    { type: 'application_deadline', label: '신청 마감' },
    { type: 'result_announcement', label: '결과 발표' },
    { type: 'operation', label: '운영 기간' },
  ],
  other: [
    { type: 'main', label: '대표 일정' },
    { type: 'application_deadline', label: '신청 마감' },
    { type: 'result_announcement', label: '결과 발표' },
  ],
}

const CATEGORY_VALUES = new Set<CareerEventCategory>(
  Object.keys(CAREER_CATEGORY_LABELS) as CareerEventCategory[],
)
const STATUS_VALUES = new Set<CareerEventStatus>(
  Object.keys(CAREER_STATUS_LABELS) as CareerEventStatus[],
)
const MILESTONE_TYPE_VALUES = new Set<CareerMilestoneType>(
  Object.keys(CAREER_MILESTONE_TYPE_LABELS) as CareerMilestoneType[],
)

const STATUS_MILESTONE_PRIORITY: Record<CareerEventStatus, CareerMilestoneType[]> = {
  interested: ['application_deadline', 'main', 'round', 'final_round', 'selection_announcement', 'result_announcement', 'operation', 'custom'],
  planned: ['application_deadline', 'main', 'round', 'final_round', 'selection_announcement', 'result_announcement', 'operation', 'custom'],
  applied: ['selection_announcement', 'result_announcement', 'round', 'final_round', 'operation', 'main', 'application_deadline', 'custom'],
  pending: ['selection_announcement', 'result_announcement', 'round', 'final_round', 'operation', 'main', 'application_deadline', 'custom'],
  confirmed: ['operation', 'final_round', 'round', 'main', 'result_announcement', 'selection_announcement', 'application_deadline', 'custom'],
  completed: ['main', 'operation', 'final_round', 'round', 'result_announcement', 'selection_announcement', 'application_deadline', 'custom'],
  rejected: ['result_announcement', 'selection_announcement', 'application_deadline', 'main', 'operation', 'round', 'final_round', 'custom'],
  cancelled: ['main', 'application_deadline', 'result_announcement', 'selection_announcement', 'operation', 'round', 'final_round', 'custom'],
}

const VALID_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const isCareerEventCategory = (value: unknown): value is CareerEventCategory =>
  typeof value === 'string' && CATEGORY_VALUES.has(value as CareerEventCategory)

export const isCareerEventStatus = (value: unknown): value is CareerEventStatus =>
  typeof value === 'string' && STATUS_VALUES.has(value as CareerEventStatus)

export const isCareerMilestoneType = (value: unknown): value is CareerMilestoneType =>
  typeof value === 'string' && MILESTONE_TYPE_VALUES.has(value as CareerMilestoneType)

const cleanText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && VALID_DATE_PATTERN.test(value)

export function isWeekdayInRange(dateStr: string, start?: string, end?: string) {
  if (!start || dateStr < start || dateStr > (end || start)) return false
  const day = new Date(`${dateStr}T12:00:00`).getDay()
  return day !== 0 && day !== 6
}

const makeDraftMilestoneId = (type: CareerMilestoneType, index: number) =>
  `career-milestone-${Date.now()}-${index}-${type}`

const makeLegacyMilestoneId = (event: Partial<CareerEvent>, key: string) =>
  `${event.id ?? 'career'}-legacy-${key}`

const milestoneSort = (a: CareerMilestone, b: CareerMilestone) =>
  a.date.localeCompare(b.date)
  || (a.endDate ?? '').localeCompare(b.endDate ?? '')
  || a.label.localeCompare(b.label)

const milestoneKey = (milestone: Pick<CareerMilestone, 'type' | 'label' | 'date' | 'endDate'>) =>
  [
    milestone.type,
    milestone.label.replace(/\s+/g, ''),
    milestone.date,
    milestone.endDate ?? '',
  ].join('|')

const sanitizeMilestone = (
  milestone: Partial<CareerMilestone>,
  index: number,
  fallbackId: string,
): CareerMilestone | null => {
  if (!isDateKey(milestone.date)) return null
  const type = isCareerMilestoneType(milestone.type) ? milestone.type : 'custom'
  const label = cleanText(milestone.label) || CAREER_MILESTONE_TYPE_LABELS[type]
  const endDate = isDateKey(milestone.endDate) && milestone.endDate >= milestone.date
    ? milestone.endDate
    : undefined
  return {
    id: cleanText(milestone.id) || `${fallbackId}-${index}`,
    type,
    label,
    date: milestone.date,
    endDate,
  }
}

const legacyMilestones = (event: Partial<CareerEvent>): CareerMilestone[] => {
  const entries: CareerMilestone[] = []
  if (isDateKey(event.date)) {
    entries.push({
      id: makeLegacyMilestoneId(event, 'main'),
      type: 'main',
      label: '일정',
      date: event.date,
    })
  }
  if (isDateKey(event.applicationDeadline)) {
    entries.push({
      id: makeLegacyMilestoneId(event, 'application'),
      type: 'application_deadline',
      label: '신청 마감',
      date: event.applicationDeadline,
    })
  }
  if (isDateKey(event.resultDate)) {
    entries.push({
      id: makeLegacyMilestoneId(event, 'result'),
      type: 'result_announcement',
      label: '결과 발표',
      date: event.resultDate,
    })
  }
  if (isDateKey(event.operationStartDate)) {
    entries.push({
      id: makeLegacyMilestoneId(event, 'operation'),
      type: 'operation',
      label: '운영 기간',
      date: event.operationStartDate,
      endDate: isDateKey(event.operationEndDate) && event.operationEndDate >= event.operationStartDate
        ? event.operationEndDate
        : undefined,
    })
  }
  return entries
}

export function normalizeCareerMilestones(event: Partial<CareerEvent>): CareerMilestone[] {
  const hasSuppliedMilestones = Array.isArray(event.milestones)
  const suppliedMilestones = Array.isArray(event.milestones) ? event.milestones : []
  const sanitizedSupplied = suppliedMilestones
    .map((milestone, index) => sanitizeMilestone(milestone, index, event.id ?? 'career-milestone'))
    .filter((milestone): milestone is CareerMilestone => Boolean(milestone))
  const legacyIdPrefix = `${event.id ?? 'career'}-legacy-`
  const legacyDateById: Record<string, string | undefined> = {
    [`${legacyIdPrefix}main`]: event.date,
    [`${legacyIdPrefix}application`]: event.applicationDeadline,
    [`${legacyIdPrefix}result`]: event.resultDate,
    [`${legacyIdPrefix}operation`]: event.operationStartDate,
  }
  const suppliedWithoutStaleDuplicates = sanitizedSupplied.filter((milestone, index, milestones) => {
    const legacyDate = legacyDateById[milestone.id]
    if (!legacyDate || milestone.date !== legacyDate) return true
    return !milestones.some((other, otherIndex) =>
      otherIndex !== index
      && other.id === milestone.id
      && other.date !== legacyDate,
    )
  })
  const editedMilestones = suppliedWithoutStaleDuplicates.filter(milestone => !milestone.id.startsWith(legacyIdPrefix))
  const supplied = suppliedWithoutStaleDuplicates.filter(milestone => {
    if (!milestone.id.startsWith(legacyIdPrefix)) return true
    if (milestone.id === `${legacyIdPrefix}main`) {
      return !editedMilestones.some(item => ['main', 'round', 'final_round', 'operation', 'custom'].includes(item.type))
    }
    if (milestone.id === `${legacyIdPrefix}application`) {
      return !editedMilestones.some(item => item.type === 'application_deadline')
    }
    if (milestone.id === `${legacyIdPrefix}result`) {
      return !editedMilestones.some(item => ['result_announcement', 'selection_announcement'].includes(item.type))
    }
    if (milestone.id === `${legacyIdPrefix}operation`) {
      return !editedMilestones.some(item => item.type === 'operation')
    }
    return true
  })
  const legacy = (hasSuppliedMilestones ? [] : legacyMilestones(event)).filter(milestone => {
    if (milestone.type === 'main') return !supplied.some(item => item.date === milestone.date)
    if (milestone.type === 'application_deadline') {
      return !supplied.some(item => item.type === 'application_deadline' && item.date === milestone.date)
    }
    if (milestone.type === 'result_announcement') {
      return !supplied.some(item =>
        (item.type === 'result_announcement' || item.type === 'selection_announcement')
        && item.date === milestone.date,
      )
    }
    if (milestone.type === 'operation') {
      return !supplied.some(item =>
        item.type === 'operation'
        && item.date === milestone.date
        && (item.endDate ?? '') === (milestone.endDate ?? ''),
      )
    }
    return true
  })
  const normalized = [...supplied, ...legacy]
  const unique = new Map<string, CareerMilestone>()

  normalized.forEach(milestone => {
    const key = milestoneKey(milestone)
    if (!unique.has(key)) unique.set(key, milestone)
  })

  return [...unique.values()].sort(milestoneSort)
}

export function createCareerCategoryMilestones(
  category: CareerEventCategory,
  values: Partial<CareerEvent> = {},
): CareerMilestone[] {
  const templates = CAREER_CATEGORY_MILESTONE_TEMPLATES[category] ?? CAREER_CATEGORY_MILESTONE_TEMPLATES.other
  return templates.map((template, index) => {
    const date = template.type === 'application_deadline'
      ? values.applicationDeadline ?? ''
      : template.type === 'result_announcement' || template.type === 'selection_announcement'
        ? values.resultDate ?? ''
        : template.type === 'operation'
          ? values.operationStartDate ?? ''
          : values.date ?? ''
    const endDate = template.type === 'operation' ? values.operationEndDate : undefined
    return {
      id: makeDraftMilestoneId(template.type, index),
      type: template.type,
      label: template.label,
      date,
      endDate,
    }
  })
}

export function createCareerInitialMilestones(
  category: CareerEventCategory,
  date: string,
): CareerMilestone[] {
  const templates = CAREER_CATEGORY_MILESTONE_TEMPLATES[category] ?? CAREER_CATEGORY_MILESTONE_TEMPLATES.other
  const template = templates.find(item => item.type === 'main') ?? {
    type: 'main' as CareerMilestoneType,
    label: CAREER_MILESTONE_TYPE_LABELS.main,
  }
  return [{
    id: makeDraftMilestoneId(template.type, 0),
    type: template.type,
    label: template.label,
    date: isDateKey(date) ? date : '',
  }]
}

export function mergeCareerDateFieldsIntoMilestones(
  milestones: CareerMilestone[] | undefined,
  fields: Pick<Partial<CareerEvent>, 'date' | 'applicationDeadline' | 'resultDate' | 'operationStartDate' | 'operationEndDate'>,
) {
  const merged = normalizeCareerMilestones({ milestones })
  const upsert = (
    type: CareerMilestoneType,
    label: string,
    date?: string,
    endDate?: string,
  ) => {
    if (date === undefined) return
    const index = merged.findIndex(milestone => milestone.type === type)
    if (!isDateKey(date)) {
      if (index >= 0 && ['main', 'application_deadline', 'result_announcement', 'operation'].includes(merged[index].type)) {
        merged.splice(index, 1)
      }
      return
    }
    const next: CareerMilestone = {
      id: index >= 0 ? merged[index].id : makeDraftMilestoneId(type, merged.length),
      type,
      label,
      date,
      endDate: isDateKey(endDate) && endDate >= date ? endDate : undefined,
    }
    if (index >= 0) merged[index] = next
    else merged.push(next)
  }

  upsert('main', '일정', fields.date)
  upsert('application_deadline', '신청 마감', fields.applicationDeadline)
  upsert('result_announcement', '결과 발표', fields.resultDate)
  upsert('operation', '운영 기간', fields.operationStartDate, fields.operationEndDate)

  return merged.sort(milestoneSort)
}

export function syncCareerEventDateFields<T extends Partial<CareerEvent>>(event: T) {
  const milestones = normalizeCareerMilestones(event)
  const firstByType = (types: CareerMilestoneType[]) =>
    milestones.find(milestone => types.includes(milestone.type))

  const main = firstByType(['main', 'round', 'final_round', 'operation', 'custom'])
  const application = firstByType(['application_deadline'])
  const result = firstByType(['result_announcement', 'selection_announcement'])
  const operation = firstByType(['operation'])
  const date = main?.date
    ?? application?.date
    ?? result?.date
    ?? operation?.date
    ?? (isDateKey(event.date) ? event.date : undefined)

  return {
    ...event,
    date: date ?? '',
    applicationDeadline: application?.date,
    resultDate: result?.date,
    operationStartDate: operation?.date,
    operationEndDate: operation?.endDate,
    milestones,
  }
}

export interface CareerMilestoneEntry {
  label: string
  date: string
  endDate?: string
  type: CareerMilestoneType
}

export function getCareerMilestoneEntries(event: CareerEvent): CareerMilestoneEntry[] {
  return normalizeCareerMilestones(event)
    .map(milestone => ({
      label: milestone.label,
      date: milestone.date,
      endDate: milestone.endDate,
      type: milestone.type,
    }))
    .sort((a, b) =>
      a.date.localeCompare(b.date)
      || (a.endDate ?? '').localeCompare(b.endDate ?? '')
      || a.label.localeCompare(b.label),
    )
}

const milestoneMatchesDate = (entry: CareerMilestoneEntry, dateStr: string) => {
  if (!entry.endDate) return entry.date === dateStr
  if (entry.type === 'operation') return isWeekdayInRange(dateStr, entry.date, entry.endDate)
  return entry.date <= dateStr && dateStr <= entry.endDate
}

export function getCareerMilestones(event: CareerEvent, dateStr: string) {
  const labels = getCareerMilestoneEntries(event)
    .filter(entry => milestoneMatchesDate(entry, dateStr))
    .map(entry => entry.type === 'operation' ? '운영' : entry.label)
  return [...new Set(labels)]
}

export function getCareerLastRelevantDate(event: CareerEvent) {
  const dates = getCareerMilestoneEntries(event).flatMap(entry => [entry.date, entry.endDate].filter(Boolean) as string[])

  if (dates.length === 0) return event.date
  const sorted = [...new Set(dates)].sort()
  return sorted[sorted.length - 1]
}

const milestonePriority = (status: CareerEventStatus, type: CareerMilestoneType) => {
  const priority = STATUS_MILESTONE_PRIORITY[status] ?? STATUS_MILESTONE_PRIORITY.interested
  const index = priority.indexOf(type)
  return index === -1 ? priority.length : index
}

export function getCareerNextMilestone(event: CareerEvent, today: string) {
  const entries = getCareerMilestoneEntries(event)
  const upcoming = entries
    .map(entry => {
      const endDate = entry.endDate ?? entry.date
      const activeRange = entry.date <= today && today <= endDate
      return {
        ...entry,
        date: activeRange ? today : entry.date,
        originalDate: entry.date,
        endDate: entry.endDate,
      }
    })
    .filter(entry => (entry.endDate ?? entry.originalDate) >= today)
    .sort((a, b) =>
      milestonePriority(event.status, a.type) - milestonePriority(event.status, b.type)
      || a.date.localeCompare(b.date)
      || a.label.localeCompare(b.label),
    )

  if (upcoming.length > 0) {
    const { originalDate: _originalDate, ...entry } = upcoming[0]
    return entry
  }

  return entries[entries.length - 1]
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
