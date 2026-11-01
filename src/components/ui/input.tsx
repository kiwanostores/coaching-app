import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string }

export const Field = forwardRef<HTMLInputElement, Props>(({ label, error, id, className, ...rest }, ref) => {
  const fieldId = id ?? `f-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="text-xs font-medium text-ink-muted">{label}</label>
      <input
        ref={ref} id={fieldId} aria-invalid={Boolean(error)}
        className={cn('h-10 w-full rounded-control border border-line bg-white px-3 text-sm placeholder:text-ink-muted/60 focus:border-brand', error && 'border-red-500', className)}
        {...rest}
      />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
})
Field.displayName = 'Field'
