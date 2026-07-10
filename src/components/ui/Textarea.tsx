import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { classNames } from '../../utils/classNames'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({
  className,
  ...props
}, ref) {
  return <textarea ref={ref} className={classNames('ui-control', 'ui-textarea', className)} {...props} />
})
