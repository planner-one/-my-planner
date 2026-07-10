import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { IconButton } from './IconButton'

type ToastTone = 'info' | 'success' | 'warning' | 'danger'

interface ToastInput {
  message: string
  tone?: ToastTone
  actionLabel?: string
  onAction?: () => void
  duration?: number
}

interface ToastItem extends ToastInput {
  id: number
  tone: ToastTone
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => number
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextIdRef = useRef(1)
  const timersRef = useRef(new Map<number, number>())

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) window.clearTimeout(timer)
    timersRef.current.delete(id)
    setToasts(items => items.filter(item => item.id !== id))
  }, [])

  const showToast = useCallback((input: ToastInput) => {
    const id = nextIdRef.current++
    const toast: ToastItem = { ...input, id, tone: input.tone ?? 'info' }
    setToasts(items => [...items, toast])
    const timer = window.setTimeout(() => dismissToast(id), input.duration ?? 4500)
    timersRef.current.set(id, timer)
    return id
  }, [dismissToast])

  useEffect(() => () => {
    timersRef.current.forEach(timer => window.clearTimeout(timer))
    timersRef.current.clear()
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="ui-toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => {
          const Icon = toast.tone === 'success'
            ? CheckCircle2
            : toast.tone === 'warning' || toast.tone === 'danger'
              ? TriangleAlert
              : Info
          return (
            <div key={toast.id} className={`ui-toast ui-toast-${toast.tone}`} role="status">
              <Icon size={17} aria-hidden="true" />
              <span>{toast.message}</span>
              {toast.actionLabel && toast.onAction && (
                <button type="button" onClick={() => {
                  toast.onAction?.()
                  dismissToast(toast.id)
                }}>{toast.actionLabel}</button>
              )}
              <IconButton
                label="알림 닫기"
                icon={<X size={15} />}
                size="sm"
                onClick={() => dismissToast(toast.id)}
              />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
