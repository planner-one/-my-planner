import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from '../src/components/ui/ErrorState'
import { SaveIndicator } from '../src/components/SaveIndicator'

describe('shared feedback states', () => {
  it('announces save failures and exposes retry', () => {
    const onRetry = vi.fn()
    render(<SaveIndicator state="error" error="네트워크 오류" onRetry={onRetry} />)

    expect(screen.getByRole('status')).toHaveAttribute('title', '네트워크 오류')
    fireEvent.click(screen.getByRole('button', { name: '저장 다시 시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders a recoverable load error', () => {
    const onRetry = vi.fn()
    render(
      <ErrorState
        title="불러오기 실패"
        description="네트워크를 확인해 주세요."
        onRetry={onRetry}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
