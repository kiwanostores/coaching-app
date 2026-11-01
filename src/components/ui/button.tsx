import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const variants = cva(
  'inline-flex items-center justify-center gap-2 rounded-control text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand-gradient text-white shadow-card hover:brightness-110 active:brightness-95',
        secondary: 'bg-white text-ink border border-line hover:bg-brand-soft',
        ghost: 'text-ink-muted hover:bg-brand-soft hover:text-ink',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: { md: 'h-10 px-4', sm: 'h-8 px-3 text-xs', lg: 'h-12 px-6 text-base' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

interface Props extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant, size, loading, disabled, children, ...rest }, ref) => (
    <button ref={ref} className={cn(variants({ variant, size }), className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
