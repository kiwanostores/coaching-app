import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Card = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-card border border-line bg-white shadow-card', className)} {...rest} />
)

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-control bg-line/70', className)} aria-hidden />
)
