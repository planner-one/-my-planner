import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Tabs } from '../src/components/ui/Tabs'

function TabsProbe() {
  const [value, setValue] = useState<'first' | 'second' | 'third'>('first')
  return (
    <Tabs
      value={value}
      onChange={setValue}
      label="보기 선택"
      options={[
        { value: 'first', label: '첫째' },
        { value: 'second', label: '둘째' },
        { value: 'third', label: '셋째' },
      ]}
    />
  )
}

describe('Tabs', () => {
  it('supports arrow, Home and End keyboard navigation', () => {
    render(<TabsProbe />)
    const first = screen.getByRole('tab', { name: '첫째' })
    const second = screen.getByRole('tab', { name: '둘째' })
    const third = screen.getByRole('tab', { name: '셋째' })

    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(second).toHaveAttribute('aria-selected', 'true')
    expect(second).toHaveFocus()

    fireEvent.keyDown(second, { key: 'End' })
    expect(third).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(third, { key: 'Home' })
    expect(first).toHaveAttribute('aria-selected', 'true')
  })
})
