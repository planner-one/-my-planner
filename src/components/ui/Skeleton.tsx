import { classNames } from '../../utils/classNames'

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
}

export function Skeleton({ width = '100%', height = 16, className }: SkeletonProps) {
  return (
    <span
      className={classNames('ui-skeleton', className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}
