export interface Todo {
  id: string
  text: string
  done: boolean
  priority: 'high' | 'medium' | 'low'
  category?: 'work' | 'personal' | 'study'
  date?: string
  sourceUrl?: string
}

export interface TodoDailyResult {
  date: string
  total: number
  done: number
  completionRate: number
  savedAt: string
  source: 'auto' | 'manual'
  items: Todo[]
  correctionNote?: string
  correctedAt?: string
  correctionHistory?: TodoCorrection[]
}

export interface TodoCorrection {
  correctedAt: string
  note: string
  changes: {
    itemId: string
    text: string
    action?: 'toggle' | 'add' | 'remove'
    fromDone?: boolean
    toDone?: boolean
  }[]
}

export interface DeletedTodoDailyResult extends TodoDailyResult {
  deletedAt: string
  deletionReason: 'empty' | 'manual'
}

export interface Habit {
  id: string
  name: string
  createdAt: string
  icon?: string
  repeatDays?: number[]
}

export interface Task {
  id: string
  name: string
  due?: string
  type?: string
  priority?: string
  status?: string
  owner?: string
  sourceUrl?: string
  done: boolean
}

export interface GoalStep {
  text: string
  done: boolean
}

export interface Goal {
  id: string
  name: string
  area?: string
  pct: number
  status?: string
  due?: string
  steps: GoalStep[]
}

export interface Project {
  id: string
  name: string
  icon?: string
  description?: string
  pct: number
  due?: string
  status?: string
  steps?: GoalStep[]
}

export interface TopGoal {
  id: string
  text: string
  done: boolean
  date?: string
}

export type CounterPeriod = 'daily' | 'weekly' | 'total'

export interface CounterItem {
  id: string
  name: string
  unit: string
  period: CounterPeriod
  value: number
  dateKey?: string
  weekKey?: string
  autoKey?: 'pomodoro-focus'
}

export type Counters = CounterItem[]

export interface Review {
  r1: string
  r2: string
  r3: string
}

export interface ReviewDailyEntry {
  date: string
  r1: string
  r2: string
  r3: string
  updatedAt: string
}

export interface QuickMemoEntry {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
  sourceUrl?: string
  convertedTo?: 'todo' | 'note'
  convertedId?: string
}

export interface Note {
  id: string
  title: string
  nb?: string
  content: string
  fav: boolean
  review?: string
  date?: string
  keywords?: string[]
  referenceUrl?: string
  createdAt?: string
  updatedAt?: string
  sourceMemoId?: string
  sourceUrl?: string
}

export interface WeekTask {
  id: string
  text: string
  done: boolean
  cat?: string
}

export interface ScheduledTask {
  id: string
  title: string
  date: string
  time?: string
  endTime?: string
  mode?: 'offline' | 'online' | 'hybrid'
  location?: string
  address?: string
  note?: string
  sourceUrl?: string
  done: boolean
}

export type CareerEventCategory =
  | 'briefing' | 'interview' | 'camp' | 'program'
  | 'seminar' | 'contest' | 'support' | 'corp_support' | 'other'
export type CareerEventStatus =
  | 'interested' | 'planned' | 'applied' | 'pending'
  | 'confirmed' | 'completed' | 'rejected' | 'cancelled'

export type CareerMilestoneType =
  | 'main'
  | 'application_deadline'
  | 'result_announcement'
  | 'selection_announcement'
  | 'round'
  | 'final_round'
  | 'operation'
  | 'custom'

export interface CareerMilestone {
  id: string
  type: CareerMilestoneType
  label: string
  date: string
  endDate?: string
}

export interface CareerEvent {
  id: string
  title: string
  organization?: string
  category: CareerEventCategory
  status: CareerEventStatus
  date: string
  applicationDeadline?: string
  resultDate?: string
  operationStartDate?: string
  operationEndDate?: string
  time?: string
  endTime?: string
  mode?: 'offline' | 'online' | 'hybrid'
  location?: string
  address?: string
  url?: string
  sourceUrl?: string
  note?: string
  milestones?: CareerMilestone[]
}

export type PersonalApplicationType =
  | 'savings' | 'mentoring' | 'welfare' | 'youth_support'
  | 'education' | 'certificate' | 'housing' | 'other'
export type PersonalApplicationStatus =
  | 'interested' | 'preparing' | 'submitted' | 'reviewing'
  | 'selected' | 'rejected' | 'active' | 'finished' | 'cancelled'

export interface PersonalApplication {
  id: string
  title: string
  organization?: string
  type: PersonalApplicationType
  status: PersonalApplicationStatus
  appliedDate?: string
  deadline?: string
  resultDate?: string
  startDate?: string
  endDate?: string
  nextAction?: string
  documents?: string[]
  keywords?: string[]
  sourceUrl?: string
  note?: string
  createdAt?: string
  updatedAt?: string
}

export type JobPostingPlatform =
  | 'saramin' | 'jobplanet' | 'wanted' | 'jumpit' | 'groupby' | 'incruit' | 'company' | 'other'
export type JobPostingStatus =
  | 'saved' | 'preparing' | 'applied' | 'interview'
  | 'offer' | 'rejected' | 'closed'

export interface JobPosting {
  id: string
  company: string
  position: string
  platform: JobPostingPlatform
  status: JobPostingStatus
  deadline?: string
  appliedDate?: string
  resultDate?: string
  location?: string
  employmentType?: string
  sourceUrl?: string
  imageText?: string
  keywords?: string[]
  nextAction?: string
  note?: string
  createdAt?: string
  updatedAt?: string
}

export interface JournalEntry {
  date: string
  title?: string
  mood?: string
  content?: string
  gratitude?: string
  tomorrowFocus?: string
  habitPct?: number
  todoDone?: number
  todoTotal?: number
  energy?: number
  productivity?: number
  updatedAt?: string
}

export interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export type NotificationChannel = 'codex' | 'gmail' | 'slack' | 'discord'

export interface NotificationPreferences {
  dailyBriefingEnabled: boolean
  dailyBriefingTime: string
  dailyBriefingChannel: NotificationChannel
  dailyBriefingScope: 'ownAccount'
  timezone: string
}

export interface UserData {
  todos?: Todo[]
  todoHistory?: TodoDailyResult[]
  todoHistoryTrash?: DeletedTodoDailyResult[]
  todoHistoryDeletedDates?: string[]
  habits?: Habit[]
  habitHistory?: Record<string, Record<string, boolean>>
  habitSavedAt?: Record<string, string>
  habitsVersion?: number
  habitsInitialized?: boolean
  tasks?: Task[]
  goals?: Goal[]
  projects?: Project[]
  topGoals?: TopGoal[]
  energy?: number
  counters?: Counters
  quickMemo?: string
  quickMemos?: QuickMemoEntry[]
  review?: Review
  reviewHistory?: ReviewDailyEntry[]
  notes?: Note[]
  weekTasks?: Record<string, WeekTask[]>
  timeBlockData?: Record<string, Record<string, string>>
  scheduledTasks?: ScheduledTask[]
  careerEvents?: CareerEvent[]
  personalApplications?: PersonalApplication[]
  jobPostings?: JobPosting[]
  journal?: JournalEntry[]
  chartHistory?: number[]
  dashboardLayout?: LayoutItem[]
  dashboardActive?: string[]
  uiScale?: number
  nickname?: string
  notificationPreferences?: NotificationPreferences
  _lastSaved?: string
  _displayName?: string
  _email?: string
  _photoURL?: string
}
