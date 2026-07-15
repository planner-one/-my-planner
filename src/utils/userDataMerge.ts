import type {
  DeletedTodoDailyResult,
  Habit,
  JournalEntry,
  Note,
  OnboardingState,
  PersonalApplication,
  Project,
  QuickMemoEntry,
  ReviewDailyEntry,
  ScheduledTask,
  Task,
  Todo,
  TodoDailyResult,
  TopGoal,
  UserData,
} from '../types'
import { getTodoCarryKey } from './todos'

type Identified =
  | Habit
  | Task
  | Project
  | TopGoal
  | QuickMemoEntry
  | Note
  | ScheduledTask
  | PersonalApplication
  | { id: string }

const maxDate = (dates: Array<string | undefined>) =>
  dates.filter((date): date is string => Boolean(date)).sort((a, b) => b.localeCompare(a))[0]

const byLatestIso = <T>(left: T, right: T, getDate: (item: T) => string | undefined) => {
  const leftDate = getDate(left) ?? ''
  const rightDate = getDate(right) ?? ''
  return rightDate > leftDate ? right : left
}

const mergeByIdRemoteFirst = <T extends Identified>(
  remoteItems: T[] = [],
  incomingItems: T[] = [],
): T[] => {
  const remoteIds = new Set(remoteItems.map(item => item.id))
  return [
    ...remoteItems,
    ...incomingItems.filter(item => !remoteIds.has(item.id)),
  ]
}

const mergeStringUnion = (remoteItems: string[] = [], incomingItems: string[] = []) =>
  [...new Set([...remoteItems, ...incomingItems])]

const mergeRecordRemoteFirst = <T>(
  remoteValue: Record<string, T> = {},
  incomingValue: Record<string, T> = {},
): Record<string, T> => ({
  ...incomingValue,
  ...remoteValue,
})

const valuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right)

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const getStableArrayKey = (items: unknown[]): 'id' | 'date' | null => {
  const objectItems = items.filter(isObjectRecord)
  if (objectItems.length !== items.length || objectItems.length === 0) return null
  if (objectItems.every(item => typeof item.id === 'string')) return 'id'
  if (objectItems.every(item => typeof item.date === 'string')) return 'date'
  return null
}

const rebaseValueAfterSave = (
  sentValue: unknown,
  currentValue: unknown,
  savedValue: unknown,
): unknown => {
  if (valuesEqual(currentValue, sentValue)) return savedValue

  if (Array.isArray(sentValue) && Array.isArray(currentValue) && Array.isArray(savedValue)) {
    const key = getStableArrayKey([...sentValue, ...currentValue, ...savedValue])
    if (!key) return currentValue

    const sentByKey = new Map(sentValue.map(item => [String(item[key]), item]))
    const currentKeys = new Set(currentValue.map(item => String(item[key])))
    const savedByKey = new Map(savedValue.map(item => [String(item[key]), item]))
    const rebased = currentValue.map(item => {
      const itemKey = String(item[key])
      const sentItem = sentByKey.get(itemKey)
      if (!sentItem) return item
      return rebaseValueAfterSave(sentItem, item, savedByKey.get(itemKey) ?? sentItem)
    })

    savedValue.forEach(item => {
      const itemKey = String(item[key])
      if (!currentKeys.has(itemKey) && !sentByKey.has(itemKey)) {
        rebased.push(item)
      }
    })
    return rebased
  }

  if (isObjectRecord(sentValue) && isObjectRecord(currentValue) && isObjectRecord(savedValue)) {
    const rebased: Record<string, unknown> = { ...savedValue }
    const keys = new Set([...Object.keys(sentValue), ...Object.keys(currentValue)])

    keys.forEach(key => {
      const sentHasKey = Object.prototype.hasOwnProperty.call(sentValue, key)
      const currentHasKey = Object.prototype.hasOwnProperty.call(currentValue, key)
      if (!currentHasKey && sentHasKey) {
        delete rebased[key]
        return
      }
      if (currentHasKey) {
        rebased[key] = rebaseValueAfterSave(sentValue[key], currentValue[key], savedValue[key])
      }
    })
    return rebased
  }

  return currentValue
}

export const rebaseUserDataAfterSave = (
  sentData: UserData,
  currentData: UserData,
  savedData: UserData,
): UserData => {
  const rebased = rebaseValueAfterSave(sentData, currentData, savedData) as UserData
  rebased.onboarding = valuesEqual(currentData.onboarding, sentData.onboarding)
    ? savedData.onboarding
    : mergeOnboardingState(savedData.onboarding, currentData.onboarding)
  rebased._lastSaved = savedData._lastSaved
  return rebased
}

const ONBOARDING_STATUS_WEIGHT: Record<OnboardingState['status'], number> = {
  pending: 0,
  skipped: 1,
  completed: 2,
}

export const mergeOnboardingState = (
  remoteState?: OnboardingState,
  incomingState?: OnboardingState,
): OnboardingState | undefined => {
  if (!remoteState) return incomingState
  if (!incomingState) return remoteState

  const remoteVersion = Number(remoteState.version)
  const incomingVersion = Number(incomingState.version)
  if (remoteVersion !== incomingVersion) {
    return remoteVersion > incomingVersion ? remoteState : incomingState
  }

  const remoteWeight = ONBOARDING_STATUS_WEIGHT[remoteState.status]
  const incomingWeight = ONBOARDING_STATUS_WEIGHT[incomingState.status]
  if (remoteWeight !== incomingWeight) {
    return remoteWeight > incomingWeight ? remoteState : incomingState
  }

  return remoteState.updatedAt >= incomingState.updatedAt ? remoteState : incomingState
}

const mergeHabitHistory = (
  remoteValue: UserData['habitHistory'] = {},
  incomingValue: UserData['habitHistory'] = {},
) => {
  const dates = new Set([...Object.keys(incomingValue), ...Object.keys(remoteValue)])
  const merged: NonNullable<UserData['habitHistory']> = {}

  dates.forEach(date => {
    const remoteRecord = remoteValue[date] ?? {}
    const incomingRecord = incomingValue[date] ?? {}
    const habitIds = new Set([...Object.keys(incomingRecord), ...Object.keys(remoteRecord)])
    merged[date] = {}
    habitIds.forEach(id => {
      merged[date][id] = Boolean(remoteRecord[id] || incomingRecord[id])
    })
  })

  return merged
}

const mergeTodoHistory = (
  remoteItems: TodoDailyResult[] = [],
  incomingItems: TodoDailyResult[] = [],
): TodoDailyResult[] => {
  const byDate = new Map<string, TodoDailyResult>()

  incomingItems.forEach(item => byDate.set(item.date, item))
  remoteItems.forEach(item => {
    const incoming = byDate.get(item.date)
    byDate.set(
      item.date,
      incoming
        ? byLatestIso(item, incoming, value => value.correctedAt ?? value.savedAt)
        : item,
    )
  })

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}

const mergeTodoTrash = (
  remoteItems: DeletedTodoDailyResult[] = [],
  incomingItems: DeletedTodoDailyResult[] = [],
): DeletedTodoDailyResult[] => {
  const byDate = new Map<string, DeletedTodoDailyResult>()

  incomingItems.forEach(item => byDate.set(item.date, item))
  remoteItems.forEach(item => {
    const incoming = byDate.get(item.date)
    byDate.set(
      item.date,
      incoming
        ? byLatestIso(item, incoming, value => value.deletedAt)
        : item,
    )
  })

  return [...byDate.values()].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
}

const mergeReviewHistory = (
  remoteItems: ReviewDailyEntry[] = [],
  incomingItems: ReviewDailyEntry[] = [],
) => {
  const byDate = new Map<string, ReviewDailyEntry>()

  incomingItems.forEach(item => byDate.set(item.date, item))
  remoteItems.forEach(item => {
    const incoming = byDate.get(item.date)
    byDate.set(
      item.date,
      incoming ? byLatestIso(item, incoming, value => value.updatedAt) : item,
    )
  })

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}

const mergeJournal = (
  remoteItems: JournalEntry[] = [],
  incomingItems: JournalEntry[] = [],
) => {
  const byDate = new Map<string, JournalEntry>()

  incomingItems.forEach(item => byDate.set(item.date, item))
  remoteItems.forEach(item => {
    const incoming = byDate.get(item.date)
    byDate.set(
      item.date,
      incoming ? byLatestIso(item, incoming, value => value.updatedAt) : item,
    )
  })

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}

const getLatestTodoDate = (data: UserData) =>
  maxDate([
    ...(data.todos ?? []).map(todo => todo.date),
    ...(data.todoHistory ?? []).map(result => result.date),
  ])

const hasSameOrLaterRemoteTodo = (
  remoteTodos: Todo[],
  incomingTodo: Todo,
  latestRemoteDate: string | undefined,
) => {
  const incomingKey = getTodoCarryKey(incomingTodo)
  const incomingDate = incomingTodo.date ?? latestRemoteDate ?? ''

  return remoteTodos.some(remoteTodo => {
    const remoteDate = remoteTodo.date ?? latestRemoteDate ?? ''
    return getTodoCarryKey(remoteTodo) === incomingKey && remoteDate >= incomingDate
  })
}

const hasLaterRemoteHistoryItem = (
  remoteHistory: TodoDailyResult[],
  incomingTodo: Todo,
  latestRemoteDate: string | undefined,
) => {
  const incomingKey = getTodoCarryKey(incomingTodo)
  const incomingDate = incomingTodo.date ?? latestRemoteDate ?? ''

  return remoteHistory.some(result =>
    result.date >= incomingDate
    && result.items.some(item => getTodoCarryKey(item) === incomingKey)
  )
}

const mergeTodos = (
  remoteTodos: Todo[] = [],
  incomingTodos: Todo[] = [],
  remoteHistory: TodoDailyResult[] = [],
  latestRemoteDate: string | undefined,
) => {
  const incomingById = new Map(incomingTodos.map(todo => [todo.id, todo]))
  const remoteIds = new Set(remoteTodos.map(todo => todo.id))

  const mergedRemote = remoteTodos.map(remoteTodo => {
    const incomingTodo = incomingById.get(remoteTodo.id)
    if (!incomingTodo) return remoteTodo
    return {
      ...remoteTodo,
      done: remoteTodo.done || incomingTodo.done,
    }
  })

  const additions = incomingTodos.filter(todo => {
    if (remoteIds.has(todo.id)) return false
    if (todo.date && latestRemoteDate && todo.date < latestRemoteDate) return false
    if (hasSameOrLaterRemoteTodo(remoteTodos, todo, latestRemoteDate)) return false
    if (hasLaterRemoteHistoryItem(remoteHistory, todo, latestRemoteDate)) return false
    return true
  })

  return [...additions, ...mergedRemote]
}

export function mergeUserDataForStaleSave(
  remoteData: UserData | null | undefined,
  incomingData: UserData,
): UserData {
  if (!remoteData) return incomingData

  const latestRemoteTodoDate = getLatestTodoDate(remoteData)
  const merged: UserData = {
    ...incomingData,
    ...remoteData,
    _lastSaved: incomingData._lastSaved ?? new Date().toISOString(),
    _displayName: incomingData._displayName ?? remoteData._displayName,
    _email: incomingData._email ?? remoteData._email,
    _photoURL: incomingData._photoURL ?? remoteData._photoURL,
  }

  merged.todos = mergeTodos(
    remoteData.todos,
    incomingData.todos,
    remoteData.todoHistory ?? [],
    latestRemoteTodoDate,
  )
  merged.todoHistory = mergeTodoHistory(remoteData.todoHistory, incomingData.todoHistory)
  merged.todoHistoryTrash = mergeTodoTrash(remoteData.todoHistoryTrash, incomingData.todoHistoryTrash)
  merged.todoHistoryDeletedDates = mergeStringUnion(remoteData.todoHistoryDeletedDates, incomingData.todoHistoryDeletedDates)

  merged.habits = mergeByIdRemoteFirst(remoteData.habits, incomingData.habits)
  merged.habitHistory = mergeHabitHistory(remoteData.habitHistory, incomingData.habitHistory)
  merged.habitSavedAt = mergeRecordRemoteFirst(remoteData.habitSavedAt, incomingData.habitSavedAt)
  merged.tasks = mergeByIdRemoteFirst(remoteData.tasks, incomingData.tasks)
  merged.goals = mergeByIdRemoteFirst(remoteData.goals, incomingData.goals)
  merged.projects = mergeByIdRemoteFirst(remoteData.projects, incomingData.projects)
  merged.topGoals = mergeByIdRemoteFirst(remoteData.topGoals, incomingData.topGoals)
  merged.quickMemos = mergeByIdRemoteFirst(remoteData.quickMemos, incomingData.quickMemos)
  merged.reviewHistory = mergeReviewHistory(remoteData.reviewHistory, incomingData.reviewHistory)
  merged.notes = mergeByIdRemoteFirst(remoteData.notes, incomingData.notes)
  merged.weekTasks = mergeRecordRemoteFirst(remoteData.weekTasks, incomingData.weekTasks)
  merged.timeBlockData = mergeRecordRemoteFirst(remoteData.timeBlockData, incomingData.timeBlockData)
  merged.scheduledTasks = mergeByIdRemoteFirst(remoteData.scheduledTasks, incomingData.scheduledTasks)
  merged.careerEvents = mergeByIdRemoteFirst(remoteData.careerEvents, incomingData.careerEvents)
  merged.personalApplications = mergeByIdRemoteFirst(remoteData.personalApplications, incomingData.personalApplications)
  merged.jobPostings = mergeByIdRemoteFirst(remoteData.jobPostings, incomingData.jobPostings)
  merged.journal = mergeJournal(remoteData.journal, incomingData.journal)
  merged.onboarding = mergeOnboardingState(remoteData.onboarding, incomingData.onboarding)

  const incomingOnboardingVersion = Number(incomingData.onboarding?.version ?? 0)
  const remoteOnboardingVersion = Number(remoteData.onboarding?.version ?? 0)
  const incomingOnboardingAdvanced = incomingData.onboarding
    && (!remoteData.onboarding
      || incomingOnboardingVersion > remoteOnboardingVersion
      || (incomingOnboardingVersion === remoteOnboardingVersion
        && ONBOARDING_STATUS_WEIGHT[incomingData.onboarding.status]
          > ONBOARDING_STATUS_WEIGHT[remoteData.onboarding.status]))
  const remoteDashboardIsEmpty = (remoteData.dashboardActive?.length ?? 0) === 0
  if (incomingOnboardingAdvanced && remoteDashboardIsEmpty) {
    merged.dashboardActive = incomingData.dashboardActive ?? remoteData.dashboardActive
    merged.dashboardLayout = incomingData.dashboardLayout ?? remoteData.dashboardLayout
  }

  return merged
}
