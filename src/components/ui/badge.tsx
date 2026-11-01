import { cn } from '@/lib/utils'

const tones = {
  neutral: 'bg-line text-ink-muted', blue: 'bg-brand-soft text-brand', violet: 'bg-accent-soft text-accent',
  green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700',
} as const
export type Tone = keyof typeof tones

export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) => (
  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
)

export const sessionTone: Record<string, Tone> = { scheduled: 'blue', conducted: 'green', cancelled: 'red', rescheduled: 'amber' }
