import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface QuickAddModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function QuickAddModal({ title, onClose, children }: QuickAddModalProps) {
  return createPortal(
    <div
      role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, background: 'rgba(0,0,0,0.35)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={event => event.stopPropagation()}
        style={{
          width: 'min(360px, 100%)', padding: 18,
          borderRadius: 12, border: '1px solid var(--border)',
          background: 'var(--bg2)', color: 'var(--text)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              border: 'none', background: 'transparent', color: 'var(--muted)',
              fontSize: 20, lineHeight: 1, padding: 2, cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
