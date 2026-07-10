import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { classNames } from '../../utils/classNames'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'secondary' | 'ghost' | 'danger'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
  label,
  icon,
  size = 'md',
  variant = 'ghost',
  className,
  type = 'button',
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={classNames('ui-icon-button', `ui-icon-button-${size}`, `ui-icon-button-${variant}`, className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  )
})
