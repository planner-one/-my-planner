export const DEFAULT_MOBILE_BOTTOM_TABS = ['calendar', 'tasks', 'career', 'profile'] as const
export const MOBILE_BOTTOM_TAB_LIMIT = 4

export const MOBILE_BOTTOM_TAB_IDS = [
  'calendar',
  'habits',
  'tasks',
  'todos',
  'goals',
  'projects',
  'weekly',
  'daily',
  'notes',
  'journal',
  'profile',
  'inquiries',
  'print',
  'career',
  'personalApplications',
  'jobPostings',
  'productivity',
] as const

export type MobileBottomTabId = typeof MOBILE_BOTTOM_TAB_IDS[number]
export type DensityMode = 'auto' | 'manual'
export type ViewportKind = 'phone' | 'tablet' | 'desktop'

const isMobileBottomTabId = (value: unknown): value is MobileBottomTabId =>
  typeof value === 'string' && MOBILE_BOTTOM_TAB_IDS.includes(value as MobileBottomTabId)

export const normalizeMobileBottomTabs = (value: unknown): MobileBottomTabId[] => {
  const next: MobileBottomTabId[] = []

  if (Array.isArray(value)) {
    value.forEach(item => {
      if (isMobileBottomTabId(item) && !next.includes(item) && next.length < MOBILE_BOTTOM_TAB_LIMIT) {
        next.push(item)
      }
    })
  }

  DEFAULT_MOBILE_BOTTOM_TABS.forEach(item => {
    if (!next.includes(item) && next.length < MOBILE_BOTTOM_TAB_LIMIT) {
      next.push(item)
    }
  })

  return next
}

export const moveMobileBottomTab = (
  items: MobileBottomTabId[],
  id: MobileBottomTabId,
  direction: 'up' | 'down',
): MobileBottomTabId[] => {
  const current = items.indexOf(id)
  const target = direction === 'up' ? current - 1 : current + 1

  if (current < 0 || target < 0 || target >= items.length) {
    return items
  }

  const next = [...items]
  ;[next[current], next[target]] = [next[target], next[current]]
  return next
}

export const getViewportKind = (width: number): ViewportKind =>
  width <= 767 ? 'phone' : width <= 1199 ? 'tablet' : 'desktop'

const clampManualScale = (value: unknown): number => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 90
  return Math.min(110, Math.max(80, Math.round(number / 5) * 5))
}

export const resolveDisplayScale = ({
  viewportWidth,
  densityMode,
  manualScale,
}: {
  viewportWidth: number
  densityMode: DensityMode
  manualScale: unknown
}): number => viewportWidth < 1200
  ? 100
  : densityMode === 'manual' ? clampManualScale(manualScale) : 90

export const normalizeNavigationPreferences = (value: unknown) => {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    mobileBottomTabs: normalizeMobileBottomTabs(record.mobileBottomTabs),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
  }
}

export const normalizeDisplayPreferences = (value: unknown) => {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    densityMode: record.densityMode === 'manual' ? 'manual' as const : 'auto' as const,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
  }
}
