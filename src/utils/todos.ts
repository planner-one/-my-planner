import type { DeletedTodoDailyResult, Todo, TodoDailyResult } from '../types'

export type TodoCategory = NonNullable<Todo['category']>

export const TODO_DEFAULT_CATEGORY: TodoCategory = 'work'

export const getTodoCategory = (todo: Pick<Todo, 'category'>): TodoCategory =>
  todo.category ?? TODO_DEFAULT_CATEGORY

export const getTodoCarryKey = (todo: Pick<Todo, 'text' | 'category'>): string =>
  `${todo.text.trim().toLowerCase()}::${getTodoCategory(todo)}`

export const getIncompleteTodos = (items: Todo[]): Todo[] =>
  items.filter(item => !item.done)

export function buildTodoDailyResult(
  date: string,
  items: Todo[],
  source: TodoDailyResult['source'],
  savedAt = new Date().toISOString(),
): TodoDailyResult {
  const normalizedItems = items.map(item => ({ ...item, date }))
  const done = normalizedItems.filter(item => item.done).length
  return {
    date,
    total: normalizedItems.length,
    done,
    completionRate: normalizedItems.length === 0
      ? 0
      : Math.round((done / normalizedItems.length) * 100),
    savedAt,
    source,
    items: normalizedItems,
  }
}

const todoSnapshot = (todo: Todo) => ({
  id: todo.id,
  text: todo.text,
  done: todo.done,
  priority: todo.priority,
  category: getTodoCategory(todo),
  date: todo.date,
  sourceUrl: todo.sourceUrl ?? '',
})

const todoItemsMatch = (left: Todo[], right: Todo[]): boolean =>
  JSON.stringify(left.map(todoSnapshot)) === JSON.stringify(right.map(todoSnapshot))

export const isTodoDailyResultCurrent = (
  result: TodoDailyResult,
  date: string,
  items: Todo[],
): boolean => {
  const snapshot = buildTodoDailyResult(date, items, result.source, result.savedAt)
  return result.total === snapshot.total
    && result.done === snapshot.done
    && result.completionRate === snapshot.completionRate
    && todoItemsMatch(result.items, snapshot.items)
}

export function syncPastTodoHistory({
  currentDate,
  todos,
  todoHistory,
  todoHistoryTrash = [],
  todoHistoryDeletedDates = [],
  savedAt = new Date().toISOString(),
}: {
  currentDate: string
  todos: Todo[]
  todoHistory: TodoDailyResult[]
  todoHistoryTrash?: DeletedTodoDailyResult[]
  todoHistoryDeletedDates?: string[]
  savedAt?: string
}): TodoDailyResult[] {
  const pastDates = [...new Set(
    todos
      .map(todo => todo.date)
      .filter((date): date is string => Boolean(date && date < currentDate))
  )]

  if (pastDates.length === 0) return todoHistory

  const trashedDates = new Set(todoHistoryTrash.map(result => result.date))
  const permanentlyDeletedDates = new Set(todoHistoryDeletedDates)
  const resultsByDate = new Map(todoHistory.map(result => [result.date, result]))
  let changed = false

  pastDates.forEach(date => {
    if (trashedDates.has(date) || permanentlyDeletedDates.has(date)) return

    const existing = resultsByDate.get(date)
    if (existing?.correctedAt || (existing?.correctionHistory?.length ?? 0) > 0) return

    const items = todos.filter(todo => todo.date === date)
    if (existing && isTodoDailyResultCurrent(existing, date, items)) return

    resultsByDate.set(
      date,
      buildTodoDailyResult(date, items, existing?.source ?? 'auto', savedAt),
    )
    changed = true
  })

  if (!changed) return todoHistory

  return [...resultsByDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export function hasLaterTodoOccurrence({
  sourceDate,
  todo,
  today,
  todoHistory,
  todos,
  includeToday = true,
}: {
  sourceDate: string
  todo: Todo
  today: string
  todoHistory: TodoDailyResult[]
  todos: Todo[]
  includeToday?: boolean
}): boolean {
  const key = getTodoCarryKey(todo)
  const isLaterDate = (date: string) =>
    date > sourceDate && (includeToday ? date <= today : date < today)

  return todoHistory.some(result =>
    isLaterDate(result.date)
    && result.items.some(item => getTodoCarryKey(item) === key)
  ) || todos.some(item => {
    const itemDate = item.date ?? today
    return isLaterDate(itemDate) && getTodoCarryKey(item) === key
  })
}

export function getUnresolvedIncompleteTodos({
  sourceDate,
  items,
  today,
  todoHistory,
  todos,
}: {
  sourceDate: string
  items: Todo[]
  today: string
  todoHistory: TodoDailyResult[]
  todos: Todo[]
}): Todo[] {
  return getIncompleteTodos(items)
    .filter(item => !hasLaterTodoOccurrence({ sourceDate, todo: item, today, todoHistory, todos }))
}

export function carryIncompleteTodosToDate({
  currentDate,
  todos,
  todoHistory = [],
}: {
  currentDate: string
  todos: Todo[]
  todoHistory?: TodoDailyResult[]
}): Todo[] {
  const getTodoDate = (todo: Todo) => todo.date ?? currentDate
  const isResolvedByCorrectedHistory = (todo: Todo) => {
    if (!todo.date) return false
    const sourceHistory = todoHistory.find(result => result.date === todo.date)
    if (!sourceHistory) return false
    if (!sourceHistory.correctedAt && (sourceHistory.correctionHistory?.length ?? 0) === 0) return false

    const key = getTodoCarryKey(todo)
    const matchingHistoryItem = sourceHistory.items.find(item =>
      item.id === todo.id || getTodoCarryKey(item) === key
    )

    return !matchingHistoryItem || matchingHistoryItem.done
  }
  const hasLaterOccurrence = (source: Todo, sourceDate: string) => {
    const key = getTodoCarryKey(source)
    return todos.some(todo =>
      todo.id !== source.id
      && getTodoCarryKey(todo) === key
      && getTodoDate(todo) > sourceDate
    )
  }

  const carried: Todo[] = []
  const retained: Todo[] = []
  let changed = false

  todos.forEach(todo => {
    if (!todo.date || todo.date >= currentDate || todo.done) {
      retained.push(todo)
      return
    }

    if (isResolvedByCorrectedHistory(todo)) {
      changed = true
      return
    }

    if (hasLaterOccurrence(todo, todo.date)) {
      changed = true
      return
    }

    carried.push({
      ...todo,
      done: false,
      date: currentDate,
    })
    changed = true
  })

  return changed ? [...carried, ...retained] : todos
}
