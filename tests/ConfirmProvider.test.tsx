import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ConfirmProvider, useConfirm } from '../src/components/ui/ConfirmProvider'

function ConfirmProbe() {
  const confirm = useConfirm()
  const [result, setResult] = useState('대기')

  return (
    <>
      <button type="button" onClick={async () => {
        const accepted = await confirm({
          title: '항목 삭제',
          description: '선택한 항목을 삭제합니다.',
          confirmLabel: '삭제',
          danger: true,
        })
        setResult(accepted ? '확인' : '취소')
      }}>확인 열기</button>
      <output>{result}</output>
    </>
  )
}

describe('ConfirmProvider', () => {
  it('resolves an accessible shared confirmation flow', async () => {
    const user = userEvent.setup()
    render(<ConfirmProvider><ConfirmProbe /></ConfirmProvider>)

    await user.click(screen.getByRole('button', { name: '확인 열기' }))
    expect(screen.getByRole('dialog', { name: '항목 삭제' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.getByText('확인')).toBeInTheDocument()
  })
})
