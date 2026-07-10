import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export interface ErrorStateProps {
  title: string
  description: string
  actionLabel?: string
  onRetry?: () => void
  fullScreen?: boolean
}

export function ErrorState({
  title,
  description,
  actionLabel = '다시 시도',
  onRetry,
  fullScreen = false,
}: ErrorStateProps) {
  return (
    <main className={`ui-error-state${fullScreen ? ' full-screen' : ''}`} role="alert">
      <AlertTriangle size={24} aria-hidden="true" />
      <h1>{title}</h1>
      <p>{description}</p>
      {onRetry && (
        <Button icon={<RefreshCw size={16} />} onClick={onRetry}>{actionLabel}</Button>
      )}
    </main>
  )
}
