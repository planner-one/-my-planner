import type { PersonalApplication } from '../types'

export type OptionalApplicationDateField = 'deadline' | 'startDate' | 'endDate'

export const OPTIONAL_APPLICATION_DATE_FIELDS: OptionalApplicationDateField[] = [
  'deadline',
  'startDate',
  'endDate',
]

export const OPTIONAL_APPLICATION_DATE_LABELS: Record<OptionalApplicationDateField, string> = {
  deadline: '마감일',
  startDate: '시작일',
  endDate: '종료일',
}

export const getVisibleOptionalApplicationDateFields = (
  application: PersonalApplication,
  revealedFields: OptionalApplicationDateField[] = [],
) => OPTIONAL_APPLICATION_DATE_FIELDS.filter(field =>
  Boolean(application[field]) || revealedFields.includes(field),
)

export const getAvailableOptionalApplicationDateFields = (
  application: PersonalApplication,
  revealedFields: OptionalApplicationDateField[] = [],
) => {
  const visibleFields = getVisibleOptionalApplicationDateFields(application, revealedFields)
  return OPTIONAL_APPLICATION_DATE_FIELDS.filter(field => !visibleFields.includes(field))
}
