import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ConfirmDialog } from './ConfirmDialog'

export interface ConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (accepted: boolean) => void
}

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const requestRef = useRef<ConfirmRequest | null>(null)

  const settle = useCallback((accepted: boolean) => {
    const current = requestRef.current
    if (!current) return
    requestRef.current = null
    current.resolve(accepted)
    setRequest(null)
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => {
    requestRef.current?.resolve(false)
    const next = { ...options, resolve }
    requestRef.current = next
    setRequest(next)
  }), [])

  useEffect(() => () => {
    requestRef.current?.resolve(false)
    requestRef.current = null
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={Boolean(request)}
        onClose={() => settle(false)}
        onConfirm={() => settle(true)}
        title={request?.title ?? ''}
        description={request?.description ?? ''}
        confirmLabel={request?.confirmLabel}
        cancelLabel={request?.cancelLabel}
        danger={request?.danger}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider')
  return context
}
