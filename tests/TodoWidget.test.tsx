import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toLocalDateKey } from '../src/utils/date'

const appState = vi.hoisted(() => ({
  todos: [] as Array<{
    id: string
    text: string
    done: boolean
    priority: 'high' | 'medium' | 'low'
    category?: 'work' | 'personal' | 'study'
    date?: string
  }>,
  setTodos: vi.fn(),
}))

vi.mock('../src/store/AppContext', () => ({
  useApp: () => appState,
}))

import TodoWidget from '../src/widgets/TodoWidget'

describe('TodoWidget', () => {
  beforeEach(() => {
    appState.todos = []
    appState.setTodos.mockReset()
  })

  it('shows only today and legacy undated todos without date tabs', () => {
    const today = toLocalDateKey()
    const tomorrow = new Date(`${today}T12:00:00`)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowKey = toLocalDateKey(tomorrow)

    appState.todos = [
      { id: 'today', text: '오늘 항목', done: false, priority: 'medium', category: 'work', date: today },
      { id: 'legacy', text: '날짜 없는 기존 항목', done: false, priority: 'medium', category: 'personal' },
      { id: 'tomorrow', text: '내일 항목', done: false, priority: 'medium', category: 'study', date: tomorrowKey },
    ]

    render(<TodoWidget />)

    expect(screen.getByText('오늘 항목')).toBeInTheDocument()
    expect(screen.getByText('날짜 없는 기존 항목')).toBeInTheDocument()
    expect(screen.queryByText('내일 항목')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '오늘' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '내일' })).not.toBeInTheDocument()
    expect(screen.getByText('0/2 · 0%')).toBeInTheDocument()
  })
})
