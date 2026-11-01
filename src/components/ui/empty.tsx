import type { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent"><Icon className="h-6 w-6" /></span>
      <h3 className="text-base font-semibold">{title}</h3>
      {body && <p className="max-w-sm text-sm text-ink-muted">{body}</p>}
    </div>
  )
}
