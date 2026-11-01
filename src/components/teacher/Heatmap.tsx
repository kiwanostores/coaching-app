import { MONTHS, WEEKDAYS, fmtDate, iso } from '@/lib/dates'
import { cn } from '@/lib/utils'

// 0 = no class conducted, 1 = one, 2 = two, 3 = three or more
export const levelOf = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3)
const FILL = ['bg-[#EDF0F7]', 'bg-[#CBD8FF]', 'bg-[#7F9CF8]', 'bg-accent']
const tip = (date: string, n: number) =>
  `${fmtDate(date)}: ${n === 0 ? 'no classes conducted' : `${n} ${n === 1 ? 'class' : 'classes'} conducted`}`

interface YearProps {
  year: number; counts: Map<string, number>; onSelect?: (date: string) => void; selected?: string | null; compact?: boolean
}

export function YearHeatmap({ year, counts, onSelect, selected, compact }: YearProps) {
  const first = new Date(year, 0, 1)
  const days = Math.round((new Date(year + 1, 0, 1).getTime() - first.getTime()) / 86_400_000)
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null)
  for (let i = 0; i < days; i++) cells.push(iso(new Date(year, 0, 1 + i)))
  while (cells.length % 7) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const size = compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="flex w-max gap-1">
          {weeks.map((week, wi) => {
            const firstOfMonth = week.find((d) => d && d.endsWith('-01'))
            return (
              <div key={wi} className="flex flex-col gap-1">
                <div className={cn('relative h-4', size.split(' ')[1])}>
                  {firstOfMonth && <span className="absolute left-0 text-[10px] text-ink-muted">{MONTHS[Number(firstOfMonth.slice(5, 7)) - 1]}</span>}
                </div>
                {week.map((d, di) => d === null ? <div key={di} className={size} /> : (
                  <button key={di} type="button" title={tip(d, counts.get(d) ?? 0)} aria-label={tip(d, counts.get(d) ?? 0)}
                    onClick={() => onSelect?.(d)} disabled={!onSelect}
                    className={cn(size, 'rounded-[3px] transition hover:ring-2 hover:ring-brand/40', FILL[levelOf(counts.get(d) ?? 0)], selected === d && 'ring-2 ring-ink')} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
      {!compact && (
        <div className="mt-2 flex items-center justify-end gap-1 text-xs text-ink-muted">
          Less {FILL.map((f) => <span key={f} className={cn('h-3 w-3 rounded-[3px]', f)} />)} More
        </div>
      )}
    </div>
  )
}

interface MonthProps { year: number; month: number; counts: Map<string, number>; onSelect: (date: string) => void; selected?: string | null }

export function MonthCalendar({ year, month, counts, onSelect, selected }: MonthProps) {
  const lead = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS.map((w) => <div key={w} className="pb-1 text-center text-xs font-medium text-ink-muted">{w.slice(0, 3)}</div>)}
      {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} />)}
      {Array.from({ length: total }, (_, i) => {
        const d = iso(new Date(year, month, i + 1)); const n = counts.get(d) ?? 0
        return (
          <button key={d} type="button" title={tip(d, n)} aria-label={tip(d, n)} onClick={() => onSelect(d)}
            className={cn('flex aspect-square flex-col items-center justify-center rounded-control text-sm transition hover:ring-2 hover:ring-brand/40',
              FILL[levelOf(n)], levelOf(n) >= 2 && 'text-white', selected === d && 'ring-2 ring-ink')}>
            <span className="font-medium">{i + 1}</span>
            {n > 0 && <span className="text-[10px] opacity-80">{n}</span>}
          </button>
        )
      })}
    </div>
  )
}
