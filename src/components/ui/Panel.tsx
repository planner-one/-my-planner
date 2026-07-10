import type { HTMLAttributes, ReactNode } from 'react'
import { classNames } from '../../utils/classNames'

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  muted?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Panel({ children, muted = false, padding = 'md', className, ...props }: PanelProps) {
  return (
    <section
      className={classNames('ui-panel', muted && 'ui-panel-muted', `ui-panel-${padding}`, className)}
      {...props}
    >
      {children}
    </section>
  )
}
