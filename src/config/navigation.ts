import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckSquare2,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  Goal,
  House,
  MessageCircleQuestion,
  NotebookText,
  Printer,
  Repeat2,
  Rows3,
  UserRound,
} from 'lucide-react'

export const PAGE_IDS = [
  'dashboard', 'calendar', 'habits', 'tasks', 'todos', 'goals', 'projects',
  'weekly', 'daily', 'notes', 'journal', 'profile', 'inquiries', 'print', 'career',
  'personalApplications', 'jobPostings', 'productivity',
] as const

export type PageId = typeof PAGE_IDS[number]
export type NavGroupId = 'today' | 'work' | 'opportunity' | 'plan' | 'record' | 'system'

export interface NavItem {
  id: PageId
  label: string
  group: NavGroupId
  icon: LucideIcon
}

export const NAV_GROUPS: ReadonlyArray<{ id: NavGroupId; label: string }> = [
  { id: 'today', label: '오늘' },
  { id: 'work', label: '실행' },
  { id: 'opportunity', label: '기회' },
  { id: 'plan', label: '플래너' },
  { id: 'record', label: '기록' },
  { id: 'system', label: '설정' },
]

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { id: 'dashboard', label: '홈', group: 'today', icon: House },
  { id: 'todos', label: '오늘 할 일', group: 'today', icon: CheckSquare2 },
  { id: 'calendar', label: '캘린더', group: 'today', icon: CalendarDays },
  { id: 'tasks', label: '작업 관리', group: 'work', icon: ClipboardCheck },
  { id: 'projects', label: '프로젝트', group: 'work', icon: FolderKanban },
  { id: 'goals', label: '목표', group: 'work', icon: Goal },
  { id: 'habits', label: '습관', group: 'work', icon: Repeat2 },
  { id: 'career', label: '기회 일정', group: 'opportunity', icon: BriefcaseBusiness },
  { id: 'personalApplications', label: '내 신청', group: 'opportunity', icon: ClipboardList },
  { id: 'jobPostings', label: '지원 공고', group: 'opportunity', icon: Building2 },
  { id: 'daily', label: '일일 플래너', group: 'plan', icon: CalendarClock },
  { id: 'weekly', label: '주간 플래너', group: 'plan', icon: Rows3 },
  { id: 'notes', label: '노트', group: 'record', icon: NotebookText },
  { id: 'journal', label: '저널', group: 'record', icon: BookOpenText },
  { id: 'productivity', label: '생산성 기록', group: 'record', icon: BarChart3 },
  { id: 'print', label: '플래너 출력', group: 'record', icon: Printer },
  { id: 'profile', label: '프로필', group: 'system', icon: UserRound },
  { id: 'inquiries', label: '문의', group: 'system', icon: MessageCircleQuestion },
]

export const BOTTOM_TABS: ReadonlyArray<PageId> = [
  'dashboard', 'todos', 'calendar', 'career', 'weekly', 'profile',
]

const PAGE_ID_SET = new Set<string>(PAGE_IDS)

export function isPageId(value: string): value is PageId {
  return PAGE_ID_SET.has(value)
}

export function pageToHash(page: PageId) {
  return `#/${page}`
}

export function pageFromHash(hash: string): PageId {
  const candidate = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return isPageId(candidate) ? candidate : 'dashboard'
}

export function getNavItem(page: PageId) {
  return NAV_ITEMS.find(item => item.id === page) ?? NAV_ITEMS[0]
}
