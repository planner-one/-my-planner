import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { RouterProvider, useRouter } from '../src/store/RouterContext'

function RouterProbe() {
  const { page, setPage } = useRouter()
  return (
    <div>
      <span data-testid="page">{page}</span>
      <button type="button" onClick={() => setPage('career')}>기회 일정 열기</button>
    </div>
  )
}

describe('RouterContext', () => {
  beforeEach(() => window.history.replaceState({}, '', '#/dashboard'))

  it('syncs navigation to the URL hash', async () => {
    const user = userEvent.setup()
    render(<RouterProvider><RouterProbe /></RouterProvider>)

    await user.click(screen.getByRole('button', { name: '기회 일정 열기' }))
    expect(screen.getByTestId('page')).toHaveTextContent('career')
    expect(window.location.hash).toBe('#/career')
  })

  it('reads page changes from browser history events', () => {
    render(<RouterProvider><RouterProbe /></RouterProvider>)
    window.history.replaceState({}, '', '#/calendar')
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(screen.getByTestId('page')).toHaveTextContent('calendar')
  })
})
