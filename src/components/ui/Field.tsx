import type { ReactNode } from 'react'
import { classNames } from '../../utils/classNames'

export interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={classNames('ui-field', error && 'ui-field-error', className)}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {(error || hint) && (
        <small className="ui-field-message" role={error ? 'alert' : undefined}>
          {error || hint}
        </small>
      )}
    </div>
  )
}
