import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '../src/components/ui/Button'

describe('Button', () => {
  it('disables interaction and exposes busy state while loading', () => {
    render(<Button loading>저장</Button>)

    const button = screen.getByRole('button', { name: '저장' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
