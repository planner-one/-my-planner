import type {
  ProductivityCategory,
  ProductivityLinkedTimeEntry,
  ProductivityTimeBucket,
  ProductivityTimeHistory,
  ProductivityTimeSourceType,
} from '../types'

export const PRODUCTIVITY_CATEGORIES: ProductivityCategory[] = [
  'work',
  'study',
  'exercise',
  'personal',
]

export const PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED: ProductivityCategory[] = [
  ...PRODUCTIVITY_CATEGORIES,
  'uncategorized',
]

export const PRODUCTIVITY_CATEGORY_LABELS: Record<ProductivityCategory, string> = {
  work: '업무',
  study: '공부',
  exercise: '운동',
  personal: '개인',
  uncategorized: '미분류',
}

export const PRODUCTIVITY_CATEGORY_COLORS: Record<ProductivityCategory, string> = {
  work: '#2f6fb3',
  study: '#7655a6',
  exercise: '#2f855a',
  personal: '#c47a22',
  uncategorized: '#7b8491',
}

const DEFAULT_HABIT_CATEGORIES: Record<string, ProductivityCategory> = {
  'default-habit-1': 'personal',
  'default-habit-2': 'exercise',
  'default-habit-3': 'exercise',
  'default-habit-4': 'study',
  'default-habit-5': 'personal',
}

export const isProductivityCategory = (value: unknown): value is ProductivityCategory =>
  typeof value === 'string'
  && PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED.includes(value as ProductivityCategory)

export const normalizeProductivityCategory = (value: unknown): ProductivityCategory =>
  isProductivityCategory(value) ? value : 'uncategorized'

export const getDefaultHabitCategory = (habitId: string): ProductivityCategory =>
  DEFAULT_HABIT_CATEGORIES[habitId] ?? 'uncategorized'

const clampInteger = (value: unknown, max = Number.MAX_SAFE_INTEGER) => {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(max, Math.round(number)))
}

export const getProductivityLinkedTimeKey = (
  sourceType: ProductivityTimeSourceType,
  sourceId: string,
) => `${sourceType}:${sourceId}`

const normalizeLinkedTimeEntries = (
  value: unknown,
  fallbackUpdatedAt: string,
): Record<string, ProductivityLinkedTimeEntry> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const entries: Record<string, ProductivityLinkedTimeEntry> = {}
  Object.values(value as Record<string, unknown>).forEach(rawEntry => {
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) return
    const entry = rawEntry as Partial<ProductivityLinkedTimeEntry>
    if (entry.sourceType !== 'scheduled' || typeof entry.sourceId !== 'string' || !entry.sourceId.trim()) return
    const key = getProductivityLinkedTimeKey(entry.sourceType, entry.sourceId)
    entries[key] = {
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      title: typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : '제목 없는 일정',
      minutes: clampInteger(entry.minutes, 1440),
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : fallbackUpdatedAt,
    }
  })
  return entries
}

export const normalizeProductivityTimeBucket = (
  value: Partial<ProductivityTimeBucket> | null | undefined,
): ProductivityTimeBucket => {
  const updatedAt = typeof value?.updatedAt === 'string' ? value.updatedAt : ''
  const linkedEntries = normalizeLinkedTimeEntries(value?.linkedEntries, updatedAt)
  return {
    manualMinutes: clampInteger(value?.manualMinutes, 1440),
    focusSessions: clampInteger(value?.focusSessions, 96),
    ...(Object.keys(linkedEntries).length > 0 ? { linkedEntries } : {}),
    updatedAt,
  }
}

export const normalizeProductivityTimeHistory = (value: unknown): ProductivityTimeHistory => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const history: ProductivityTimeHistory = {}
  Object.entries(value as Record<string, unknown>).forEach(([date, rawDay]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !rawDay || typeof rawDay !== 'object' || Array.isArray(rawDay)) return
    const day: Partial<Record<ProductivityCategory, ProductivityTimeBucket>> = {}
    Object.entries(rawDay as Record<string, unknown>).forEach(([category, rawBucket]) => {
      if (!isProductivityCategory(category) || !rawBucket || typeof rawBucket !== 'object' || Array.isArray(rawBucket)) return
      day[category] = normalizeProductivityTimeBucket(rawBucket as Partial<ProductivityTimeBucket>)
    })
    if (Object.keys(day).length > 0) history[date] = day
  })
  return history
}

export const updateProductivityTimeBucket = (
  history: ProductivityTimeHistory,
  date: string,
  category: ProductivityCategory,
  update: (current: ProductivityTimeBucket) => Partial<ProductivityTimeBucket>,
  updatedAt = new Date().toISOString(),
): ProductivityTimeHistory => {
  const current = normalizeProductivityTimeBucket(history[date]?.[category])
  const patch = update(current)
  const next = normalizeProductivityTimeBucket({ ...current, ...patch, updatedAt })
  return {
    ...history,
    [date]: {
      ...(history[date] ?? {}),
      [category]: next,
    },
  }
}

export const updateProductivityLinkedTimeEntry = (
  history: ProductivityTimeHistory,
  date: string,
  category: ProductivityCategory,
  source: Pick<ProductivityLinkedTimeEntry, 'sourceType' | 'sourceId' | 'title'>,
  update: (currentMinutes: number) => number,
  updatedAt = new Date().toISOString(),
): ProductivityTimeHistory => updateProductivityTimeBucket(
  history,
  date,
  category,
  bucket => {
    const key = getProductivityLinkedTimeKey(source.sourceType, source.sourceId)
    const currentMinutes = bucket.linkedEntries?.[key]?.minutes ?? 0
    return {
      linkedEntries: {
        ...(bucket.linkedEntries ?? {}),
        [key]: {
          ...source,
          title: source.title.trim() || '제목 없는 일정',
          minutes: clampInteger(update(currentMinutes), 1440),
          updatedAt,
        },
      },
    }
  },
  updatedAt,
)

export const getProductivityLinkedTimeMinutes = (
  bucket: ProductivityTimeBucket | undefined,
  sourceType: ProductivityTimeSourceType,
  sourceId: string,
): number => bucket?.linkedEntries?.[getProductivityLinkedTimeKey(sourceType, sourceId)]?.minutes ?? 0

export const getProductivityTimeMinutes = (bucket?: ProductivityTimeBucket): number =>
  bucket
    ? bucket.manualMinutes
      + bucket.focusSessions * 25
      + Object.values(bucket.linkedEntries ?? {}).reduce((sum, entry) => sum + entry.minutes, 0)
    : 0

export const getScheduledTaskSuggestedMinutes = (
  task: { time?: string; endTime?: string },
): number | null => {
  const parseTime = (value: string | undefined) => {
    if (!/^\d{2}:\d{2}$/.test(value ?? '')) return null
    const [hour, minute] = value!.split(':').map(Number)
    if (hour > 23 || minute > 59) return null
    return hour * 60 + minute
  }
  const start = parseTime(task.time)
  const end = parseTime(task.endTime)
  if (start === null || end === null) return null
  return end > start ? end - start : null
}

export const getProductivityFocusSessions = (
  history: ProductivityTimeHistory | undefined,
  date: string,
): number => Object.values(history?.[date] ?? {})
  .reduce((sum, bucket) => sum + (bucket?.focusSessions ?? 0), 0)

export const mergeProductivityTimeHistory = (
  remoteValue: ProductivityTimeHistory | undefined,
  incomingValue: ProductivityTimeHistory | undefined,
): ProductivityTimeHistory => {
  const remote = normalizeProductivityTimeHistory(remoteValue)
  const incoming = normalizeProductivityTimeHistory(incomingValue)
  const dates = new Set([...Object.keys(incoming), ...Object.keys(remote)])
  const merged: ProductivityTimeHistory = {}

  dates.forEach(date => {
    const categories = new Set([
      ...Object.keys(incoming[date] ?? {}),
      ...Object.keys(remote[date] ?? {}),
    ].filter(isProductivityCategory)) as Set<ProductivityCategory>
    const day: Partial<Record<ProductivityCategory, ProductivityTimeBucket>> = {}

    categories.forEach(category => {
      const remoteBucket = remote[date]?.[category]
      const incomingBucket = incoming[date]?.[category]
      if (!remoteBucket) day[category] = incomingBucket
      else if (!incomingBucket) day[category] = remoteBucket
      else {
        const scalarBucket = incomingBucket.updatedAt > remoteBucket.updatedAt
          ? incomingBucket
          : remoteBucket
        const linkedKeys = new Set([
          ...Object.keys(remoteBucket.linkedEntries ?? {}),
          ...Object.keys(incomingBucket.linkedEntries ?? {}),
        ])
        const linkedEntries: Record<string, ProductivityLinkedTimeEntry> = {}
        linkedKeys.forEach(key => {
          const remoteEntry = remoteBucket.linkedEntries?.[key]
          const incomingEntry = incomingBucket.linkedEntries?.[key]
          if (!remoteEntry) linkedEntries[key] = incomingEntry!
          else if (!incomingEntry) linkedEntries[key] = remoteEntry
          else {
            linkedEntries[key] = incomingEntry.updatedAt > remoteEntry.updatedAt
              ? incomingEntry
              : remoteEntry
          }
        })
        day[category] = {
          manualMinutes: scalarBucket.manualMinutes,
          focusSessions: scalarBucket.focusSessions,
          ...(Object.keys(linkedEntries).length > 0 ? { linkedEntries } : {}),
          updatedAt: incomingBucket.updatedAt > remoteBucket.updatedAt
            ? incomingBucket.updatedAt
            : remoteBucket.updatedAt,
        }
      }
    })
    if (Object.keys(day).length > 0) merged[date] = day
  })

  return merged
}
