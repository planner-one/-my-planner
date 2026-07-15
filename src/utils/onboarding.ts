import type { LayoutItem, OnboardingPurpose, OnboardingState, UserData } from '../types'

export const STARTER_DASHBOARD_COLUMNS = 48

export type StarterWidgetId =
  | 'todo'
  | 'calendar'
  | 'habit'
  | 'memo'
  | 'review'
  | 'workOverview'
  | 'scheduled'
  | 'pomodoro'
  | 'goal'
  | 'menu'

export interface StarterWidgetDefaults {
  id: StarterWidgetId
  name: string
  defaultW: number
  defaultH: number
  minW: number
  minH: number
}

export interface OnboardingPurposeConfig {
  purpose: OnboardingPurpose
  label: string
  description: string
  firstItemDescription: string
  widgetIds: readonly StarterWidgetId[]
}

export interface StarterDashboard {
  dashboardActive: string[]
  dashboardLayout: LayoutItem[]
}

/**
 * Pure copies of the widget dimensions used by the starter presets.
 * Keep these values aligned with the corresponding widget `meta` exports.
 */
export const STARTER_WIDGET_DEFAULTS: Record<StarterWidgetId, StarterWidgetDefaults> = {
  todo: {
    id: 'todo',
    name: '오늘 할 일',
    defaultW: 8,
    defaultH: 7,
    minW: 4,
    minH: 4,
  },
  calendar: {
    id: 'calendar',
    name: '캘린더',
    defaultW: 16,
    defaultH: 11,
    minW: 10,
    minH: 7,
  },
  habit: {
    id: 'habit',
    name: '일일 루틴',
    defaultW: 7,
    defaultH: 7,
    minW: 4,
    minH: 3,
  },
  memo: {
    id: 'memo',
    name: '빠른 메모',
    defaultW: 8,
    defaultH: 6,
    minW: 4,
    minH: 3,
  },
  review: {
    id: 'review',
    name: '하루 마무리',
    defaultW: 8,
    defaultH: 8,
    minW: 5,
    minH: 5,
  },
  workOverview: {
    id: 'workOverview',
    name: '작업 흐름',
    defaultW: 12,
    defaultH: 7,
    minW: 7,
    minH: 5,
  },
  scheduled: {
    id: 'scheduled',
    name: '예정된 작업',
    defaultW: 8,
    defaultH: 7,
    minW: 4,
    minH: 4,
  },
  pomodoro: {
    id: 'pomodoro',
    name: '집중 타이머',
    defaultW: 7,
    defaultH: 6,
    minW: 4,
    minH: 4,
  },
  goal: {
    id: 'goal',
    name: '목표',
    defaultW: 8,
    defaultH: 7,
    minW: 5,
    minH: 4,
  },
  menu: {
    id: 'menu',
    name: '메뉴',
    defaultW: 6,
    defaultH: 8,
    minW: 4,
    minH: 4,
  },
}

export const ONBOARDING_PURPOSE_CONFIGS: Record<OnboardingPurpose, OnboardingPurposeConfig> = {
  daily: {
    purpose: 'daily',
    label: '일상 관리',
    description: '오늘 할 일과 생활 루틴을 한눈에 정리해요.',
    firstItemDescription: '오늘 날짜의 첫 Todo를 작성해요.',
    widgetIds: ['todo', 'calendar', 'habit', 'memo', 'review'],
  },
  workStudy: {
    purpose: 'workStudy',
    label: '업무·학습',
    description: '업무와 공부를 작업 단위로 나누고 마감까지 관리해요.',
    firstItemDescription: '업무 또는 공부 유형의 첫 작업을 작성해요.',
    widgetIds: ['workOverview', 'todo', 'calendar', 'scheduled', 'pomodoro', 'goal'],
  },
  jobSearch: {
    purpose: 'jobSearch',
    label: '취업 준비',
    description: '관심 공고와 지원 일정을 놓치지 않도록 정리해요.',
    firstItemDescription: '회사, 포지션, 공고 URL로 첫 지원 공고를 작성해요.',
    widgetIds: ['calendar', 'todo', 'workOverview', 'menu', 'memo'],
  },
  opportunity: {
    purpose: 'opportunity',
    label: '기회·신청 관리',
    description: '대외활동과 지원사업의 관심·신청 일정을 관리해요.',
    firstItemDescription: '관심 기회 일정 또는 신청한 항목을 작성해요.',
    widgetIds: ['calendar', 'todo', 'menu', 'goal', 'memo'],
  },
}

export const ONBOARDING_PURPOSES: readonly OnboardingPurposeConfig[] = [
  ONBOARDING_PURPOSE_CONFIGS.daily,
  ONBOARDING_PURPOSE_CONFIGS.workStudy,
  ONBOARDING_PURPOSE_CONFIGS.jobSearch,
  ONBOARDING_PURPOSE_CONFIGS.opportunity,
]

export const GENERIC_STARTER_WIDGET_IDS: readonly StarterWidgetId[] = [
  'todo',
  'calendar',
  'memo',
  'habit',
  'menu',
]

export const getOnboardingPurposeConfig = (
  purpose: OnboardingPurpose,
): OnboardingPurposeConfig => ONBOARDING_PURPOSE_CONFIGS[purpose]

export const resolveInitialOnboardingState = (
  data: Pick<UserData, 'onboarding'> | null,
  now: string,
): OnboardingState | null => data?.onboarding ?? (data === null ? {
  version: 1,
  status: 'pending',
  startedAt: now,
  updatedAt: now,
} : null)

export const buildStarterDashboard = (purpose?: OnboardingPurpose): StarterDashboard => {
  const widgetIds = purpose
    ? ONBOARDING_PURPOSE_CONFIGS[purpose].widgetIds
    : GENERIC_STARTER_WIDGET_IDS
  const dashboardActive = widgetIds.map(widgetId => `${widgetId}-starter-v1`)

  let x = 0
  let y = 0
  let rowHeight = 0

  const dashboardLayout = widgetIds.map((widgetId, index): LayoutItem => {
    const meta = STARTER_WIDGET_DEFAULTS[widgetId]

    if (x > 0 && x + meta.defaultW > STARTER_DASHBOARD_COLUMNS) {
      x = 0
      y += rowHeight
      rowHeight = 0
    }

    const item: LayoutItem = {
      i: dashboardActive[index],
      x,
      y,
      w: meta.defaultW,
      h: meta.defaultH,
      minW: meta.minW,
      minH: meta.minH,
    }

    x += meta.defaultW
    rowHeight = Math.max(rowHeight, meta.defaultH)

    return item
  })

  return { dashboardActive, dashboardLayout }
}
