import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from '../src/components/ui/Modal'

describe('Modal', () => {
  it('moves focus inside and closes with Escape', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="테스트 모달">
        <button type="button">내부 작업</button>
      </Modal>,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the active field focused when the close callback changes', async () => {
    const firstClose = vi.fn()
    const { rerender } = render(
      <Modal open onClose={firstClose} title="입력 모달">
        <input aria-label="제목" />
      </Modal>,
    )

    const input = screen.getByRole('textbox', { name: '제목' })
    input.focus()
    expect(input).toHaveFocus()

    rerender(
      <Modal open onClose={() => undefined} title="입력 모달">
        <input aria-label="제목" />
      </Modal>,
    )

    expect(screen.getByRole('textbox', { name: '제목' })).toHaveFocus()
  })
})
