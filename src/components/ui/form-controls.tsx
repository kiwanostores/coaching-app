import { forwardRef, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const base = 'w-full rounded-control border border-line bg-white px-3 text-sm focus:border-brand'

export const SelectField = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }>(
  ({ label, error, className, children, id, ...rest }, ref) => {
    const fid = id ?? `s-${label.replace(/\s+/g, '-').toLowerCase()}`
    return (
      <div className="space-y-1">
        <label htmlFor={fid} className="text-xs font-medium text-ink-muted">{label}</label>
        <select ref={ref} id={fid} className={cn(base, 'h-10', error && 'border-red-500', className)} {...rest}>{children}</select>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    )
  })
SelectField.displayName = 'SelectField'

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }>(
  ({ label, error, className, id, ...rest }, ref) => {
    const fid = id ?? `t-${label.replace(/\s+/g, '-').toLowerCase()}`
    return (
      <div className="space-y-1">
        <label htmlFor={fid} className="text-xs font-medium text-ink-muted">{label}</label>
        <textarea ref={ref} id={fid} rows={3} className={cn(base, 'py-2', error && 'border-red-500', className)} {...rest} />
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    )
  })
TextAreaField.displayName = 'TextAreaField'
