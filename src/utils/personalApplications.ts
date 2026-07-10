import type { PersonalApplication, PersonalApplicationStatus, PersonalApplicationType } from '../types'

export const PERSONAL_APPLICATION_TYPES: PersonalApplicationType[] = [
  'savings',
  'mentoring',
  'welfare',
  'youth_support',
  'education',
  'certificate',
  'housing',
  'other',
]

export const PERSONAL_APPLICATION_STATUSES: PersonalApplicationStatus[] = [
  'interested',
  'preparing',
  'submitted',
  'reviewing',
  'selected',
  'rejected',
  'active',
  'finished',
  'cancelled',
]

export const PERSONAL_APPLICATION_TYPE_LABELS: Record<PersonalApplicationType, string> = {
  savings: '저축/통장',
  mentoring: '멘토링',
  welfare: '복지',
  youth_support: '청년지원',
  education: '교육/훈련',
  certificate: '자격/증명',
  housing: '주거',
  other: '기타',
}

export const PERSONAL_APPLICATION_STATUS_LABELS: Record<PersonalApplicationStatus, string> = {
  interested: '관심',
  preparing: '준비 중',
  submitted: '신청 완료',
  reviewing: '심사 중',
  selected: '선정',
  rejected: '탈락',
  active: '진행 중',
  finished: '종료',
  cancelled: '취소',
}

const DEFAULT_APPLICATION_TYPE: PersonalApplicationType = 'other'
const DEFAULT_APPLICATION_STATUS: PersonalApplicationStatus = 'interested'
const CLOSED_APPLICATION_STATUSES: PersonalApplicationStatus[] = ['rejected', 'finished', 'cancelled']

const applicationTypeSet = new Set<string>(PERSONAL_APPLICATION_TYPES)
const applicationStatusSet = new Set<string>(PERSONAL_APPLICATION_STATUSES)

export const isPersonalApplicationType = (value: unknown): value is PersonalApplicationType =>
  typeof value === 'string' && applicationTypeSet.has(value)

export const isPersonalApplicationStatus = (value: unknown): value is PersonalApplicationStatus =>
  typeof value === 'string' && applicationStatusSet.has(value)

export const normalizePersonalApplicationType = (value: unknown): PersonalApplicationType =>
  isPersonalApplicationType(value) ? value : DEFAULT_APPLICATION_TYPE

export const normalizePersonalApplicationStatus = (value: unknown): PersonalApplicationStatus =>
  isPersonalApplicationStatus(value) ? value : DEFAULT_APPLICATION_STATUS

export const getPersonalApplicationTypeLabel = (value: unknown) =>
  PERSONAL_APPLICATION_TYPE_LABELS[normalizePersonalApplicationType(value)]

export const getPersonalApplicationStatusLabel = (value: unknown) =>
  PERSONAL_APPLICATION_STATUS_LABELS[normalizePersonalApplicationStatus(value)]

export const isPersonalApplicationOpen = (status: unknown) =>
  !CLOSED_APPLICATION_STATUSES.includes(normalizePersonalApplicationStatus(status))

const normalizeRequiredText = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const normalizeOptionalText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

const normalizeTokenList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string' ? item.trim() : String(item).trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

const normalizeSourceItems = (items: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(items)) {
    return items.filter((item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object',
    )
  }
  if (items && typeof items === 'object') {
    return Object.values(items as Record<string, unknown>).filter((item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object',
    )
  }
  return []
}

export function migratePersonalApplications(items: unknown = []): PersonalApplication[] {
  const timestamp = Date.now()

  return normalizeSourceItems(items).map((item, index) => ({
    ...item,
    id: normalizeRequiredText(item.id, `personal-application-${timestamp}-${index}`),
    title: normalizeRequiredText(item.title, '이름 없는 신청'),
    organization: normalizeOptionalText(item.organization),
    type: normalizePersonalApplicationType(item.type),
    status: normalizePersonalApplicationStatus(item.status),
    appliedDate: normalizeOptionalText(item.appliedDate),
    deadline: normalizeOptionalText(item.deadline),
    resultDate: normalizeOptionalText(item.resultDate),
    startDate: normalizeOptionalText(item.startDate),
    endDate: normalizeOptionalText(item.endDate),
    nextAction: normalizeOptionalText(item.nextAction),
    documents: normalizeTokenList(item.documents),
    keywords: normalizeTokenList(item.keywords),
    sourceUrl: normalizeOptionalText(item.sourceUrl),
    note: normalizeOptionalText(item.note),
    createdAt: normalizeOptionalText(item.createdAt),
    updatedAt: normalizeOptionalText(item.updatedAt) ?? normalizeOptionalText(item.createdAt),
  })) as PersonalApplication[]
}
