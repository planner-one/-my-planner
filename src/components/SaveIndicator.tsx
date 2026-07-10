import { Check, Cloud, CloudOff, LoaderCircle, RefreshCw } from 'lucide-react'
import type { SaveState } from '../store/AppContext'

const LABELS: Record<SaveState, string> = {
  idle: '동기화됨',
  dirty: '변경 대기',
  saving: '저장 중',
  saved: '저장 완료',
  error: '저장 실패',
}

export interface SaveIndicatorProps {
  state: SaveState
  error?: string
  onRetry: () => void
  compact?: boolean
}

export function SaveIndicator({ state, error, onRetry, compact = false }: SaveIndicatorProps) {
  const Icon = state === 'saving'
    ? LoaderCircle
    : state === 'saved'
      ? Check
      : state === 'error'
        ? CloudOff
        : Cloud

  return (
    <div
      className={`save-indicator save-indicator-${state}${compact ? ' compact' : ''}`}
      role="status"
      aria-live="polite"
      title={error || LABELS[state]}
    >
      <Icon size={14} className={state === 'saving' ? 'ui-spin' : undefined} aria-hidden="true" />
      <span className={compact ? 'sr-only' : undefined}>{LABELS[state]}</span>
      {state === 'error' && (
        <button type="button" onClick={onRetry} aria-label="저장 다시 시도" title="저장 다시 시도">
          <RefreshCw size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
