import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../store/AppContext'
import type { ProductivityCategory } from '../types'
import { getDateKeysInRange } from '../utils/productivity'
import {
  PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED,
  PRODUCTIVITY_CATEGORY_LABELS,
  normalizeProductivityCategory,
} from '../utils/productivityCategories'
import { toLocalDateKey } from '../utils/date'
import { getHabitCreatedDateKey, isHabitScheduled } from '../utils/habits'

interface ProductivityCategoryModalProps {
  open: boolean
  startDate: string
  endDate: string
  onClose: () => void
}

type ClassificationSource = 'todo' | 'todoHistory' | 'habit' | 'scheduled'

interface ClassificationRow {
  key: string
  source: ClassificationSource
  sourceLabel: string
  id: string
  date: string
  title: string
  category: ProductivityCategory
}

export default function ProductivityCategoryModal({
  open,
  startDate,
  endDate,
  onClose,
}: ProductivityCategoryModalProps) {
  const {
    todos,
    setTodos,
    todoHistory,
    setTodoHistory,
    habits,
    setHabits,
    habitHistory,
    scheduledTasks,
    setScheduledTasks,
  } = useApp()
  const [filter, setFilter] = useState<'all' | 'uncategorized'>('all')
  const today = toLocalDateKey()

  useEffect(() => {
    if (!open) return
    setFilter('all')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, open])

  const rows = useMemo(() => {
    const result: ClassificationRow[] = []
    const dateKeys = getDateKeysInRange(startDate, endDate)

    dateKeys.forEach(date => {
      const saved = date === today ? undefined : todoHistory.find(entry => entry.date === date)
      const items = saved?.items ?? todos.filter(todo => date === today
        ? !todo.date || todo.date === today
        : todo.date === date)
      items.forEach(todo => result.push({
        key: `${saved ? 'todoHistory' : 'todo'}-${date}-${todo.id}`,
        source: saved ? 'todoHistory' : 'todo',
        sourceLabel: 'Todo',
        id: todo.id,
        date,
        title: todo.text,
        category: normalizeProductivityCategory(todo.category),
      }))
    })

    habits
      .filter(habit => dateKeys.some(date => {
        const hasRecord = Object.prototype.hasOwnProperty.call(habitHistory[date] ?? {}, habit.id)
        const createdDate = getHabitCreatedDateKey(habit)
        return (!createdDate || createdDate <= date || hasRecord)
          && isHabitScheduled(habit, new Date(`${date}T12:00:00`))
      }))
      .forEach(habit => result.push({
        key: `habit-${habit.id}`,
        source: 'habit',
        sourceLabel: '루틴',
        id: habit.id,
        date: '전체 기록',
        title: habit.name,
        category: normalizeProductivityCategory(habit.category),
      }))

    scheduledTasks
      .filter(task => task.date >= startDate && task.date <= endDate)
      .forEach(task => result.push({
        key: `scheduled-${task.id}`,
        source: 'scheduled',
        sourceLabel: '예정 작업',
        id: task.id,
        date: task.date,
        title: task.title,
        category: normalizeProductivityCategory(task.category),
      }))

    return result.sort((left, right) => {
      const leftDate = left.date === '전체 기록' ? startDate : left.date
      const rightDate = right.date === '전체 기록' ? startDate : right.date
      return rightDate.localeCompare(leftDate)
        || left.sourceLabel.localeCompare(right.sourceLabel, 'ko')
        || left.title.localeCompare(right.title, 'ko')
    })
  }, [endDate, habitHistory, habits, scheduledTasks, startDate, todoHistory, todos, today])

  if (!open) return null

  const visibleRows = filter === 'uncategorized'
    ? rows.filter(row => row.category === 'uncategorized')
    : rows
  const uncategorizedCount = rows.filter(row => row.category === 'uncategorized').length

  const updateCategory = (row: ClassificationRow, category: ProductivityCategory) => {
    if (row.source === 'todoHistory') {
      setTodoHistory(current => current.map(entry => entry.date === row.date
        ? { ...entry, items: entry.items.map(todo => todo.id === row.id ? { ...todo, category } : todo) }
        : entry))
      return
    }
    if (row.source === 'todo') {
      setTodos(current => current.map(todo => todo.id === row.id ? { ...todo, category } : todo))
      return
    }
    if (row.source === 'habit') {
      setHabits(current => current.map(habit => habit.id === row.id ? { ...habit, category } : habit))
      return
    }
    setScheduledTasks(current => current.map(task => task.id === row.id ? { ...task, category } : task))
  }

  return createPortal(
    <div className="productivity-modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="productivity-modal category-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
        <header className="productivity-modal-header">
          <div>
            <h3 id="category-modal-title">분류 관리</h3>
            <span>{startDate} ~ {endDate}</span>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="분류 관리 닫기">×</button>
        </header>

        <div className="category-filter-tabs" role="tablist" aria-label="분류 항목 필터">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            전체 {rows.length}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'uncategorized'}
            className={filter === 'uncategorized' ? 'active' : ''}
            onClick={() => setFilter('uncategorized')}
          >
            미분류 {uncategorizedCount}
          </button>
        </div>

        <div className="classification-list">
          {visibleRows.length === 0 ? (
            <p className="empty-text">표시할 항목이 없습니다.</p>
          ) : visibleRows.map(row => (
            <div className="classification-row" key={row.key}>
              <div className="classification-source">
                <b>{row.sourceLabel}</b>
                <span>{row.date}</span>
              </div>
              <strong title={row.title}>{row.title}</strong>
              <select
                value={row.category}
                aria-label={`${row.title} 분야`}
                onChange={event => updateCategory(row, event.target.value as ProductivityCategory)}
              >
                {PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED.map(category => (
                  <option key={category} value={category}>{PRODUCTIVITY_CATEGORY_LABELS[category]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>,
    document.body,
  )
}
