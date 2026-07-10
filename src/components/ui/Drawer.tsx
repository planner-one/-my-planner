import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useDialogA11y } from '../../hooks/useDialogA11y'
import { IconButton } from './IconButton'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  side?: 'right' | 'bottom'
  width?: 'sm' | 'md' | 'lg'
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  width = 'md',
}: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useDialogA11y(open, onClose, panelRef)
  if (!open) return null

  return createPortal(
    <div className="ui-overlay ui-overlay-drawer" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section
        ref={panelRef}
        className={`ui-drawer ui-drawer-${side} ui-drawer-${width}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="ui-dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <IconButton label="닫기" icon={<X size={18} />} onClick={onClose} />
        </header>
        <div className="ui-dialog-body">{children}</div>
        {footer && <footer className="ui-dialog-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
