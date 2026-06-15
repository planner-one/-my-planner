export interface Todo {
  id: string
  text: string
  done: boolean
  priority: 'high' | 'medium' | 'low'
  category?: 'work' | 'personal' | 'study'
  date?: string
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
  pct: number
  due?: string
  status?: string
}

export interface TopGoal {
  id: string
  text: string
  done: boolean
}

export interface Counters {
  f: number
  w: number
  fDate: string
}

export interface Review {
  r1: string
  r2: string
  r3: string
}

export interface QuickMemoEntry {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
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
  createdAt?: string
  updatedAt?: string
  sourceMemoId?: string
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
  done: boolean
}

export interface JournalEntry {
  date: string
  habitPct?: number
  todoDone?: number
  todoTotal?: number
  energy?: number
  productivity?: number
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
  notes?: Note[]
  weekTasks?: Record<string, WeekTask[]>
  timeBlockData?: Record<string, Record<string, string>>
  scheduledTasks?: ScheduledTask[]
  journal?: JournalEntry[]
  chartHistory?: number[]
  dashboardLayout?: LayoutItem[]
  dashboardActive?: string[]
  uiScale?: number
  nickname?: string
  _lastSaved?: string
  _displayName?: string
  _email?: string
  _photoURL?: string
}
