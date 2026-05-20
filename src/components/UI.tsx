import type { CSSProperties, ReactNode, KeyboardEvent, ChangeEvent } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
}

export function Card({ children, style }: CardProps) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, ...style
    }}>
      {children}
    </div>
  )
}

interface BtnProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger'
  style?: CSSProperties
  disabled?: boolean
}

export function Btn({ children, onClick, variant = 'default', style, disabled }: BtnProps) {
  const variants: Record<string, CSSProperties> = {
    default: { background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' },
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
    danger:  { background: 'var(--red)',    color: '#fff', border: 'none' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px', borderRadius: 8, fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 500,
        opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s',
        ...variants[variant], ...style
      }}
    >
      {children}
    </button>
  )
}

interface InputProps {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  style?: CSSProperties
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

export function Input({ value, onChange, placeholder, style, onKeyDown }: InputProps) {
  return (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 12px', fontSize: 14,
        color: 'var(--text)', outline: 'none', width: '100%', ...style
      }}
    />
  )
}

interface ProgressBarProps {
  value: number
  max?: number
  style?: CSSProperties
}

export function ProgressBar({ value, max = 100, style }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{
      background: 'var(--bg4)', borderRadius: 999, height: 8,
      overflow: 'hidden', ...style
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: 'var(--accent)', borderRadius: 999,
        transition: 'width 0.3s ease'
      }} />
    </div>
  )
}
