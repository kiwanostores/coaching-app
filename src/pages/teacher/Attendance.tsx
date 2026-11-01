import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Badge, sessionTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/input'
import { SelectField } from '@/components/ui/form-controls'
import { MonthCalendar, YearHeatmap } from '@/components/teacher/Heatmap'
import { SessionPanel } from '@/components/teacher/SessionPanel'
import { MONTHS, fmtDate, fmtTime, iso } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useClasses } from '@/features/classes/api'
import { useCreateSession, useHeatmap, useSessionsOn } from '@/features/attendance/api'

export default function Attendance() {
  const [params, setParams] = useSearchParams()
  const today = new Date()
  const date = params.get('date')
  const sessionId = params.get('session')
  const [year, setYear] = useState(date ? Number(date.slice(0, 4)) : today.getFullYear())
  const [month, setMonth] = useState(date ? Number(date.slice(5, 7)) - 1 : today.getMonth())
  const [view, setView] = useState<'year' | 'month'>('year')
  const [classId, setClassId] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ class_id: '', session_date: iso(today), start_time: '16:00', end_time: '17:00' })

  const classes = useClasses()
  const heat = useHeatmap(year, classId || null)
  const sessions = useSessionsOn(date)
  const create = useCreateSession(() => setAdding(false))
  const select = (d: string) => setParams({ date: d })
  const total = [...(heat.data?.values() ?? [])].reduce((a, b) => a + b, 0)
  const active = sessions.data?.find((s) => s.id === sessionId) ?? null

  const shiftMonth = (n: number) => {
    const d = new Date(year, month + n, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <Button onClick={() => { setForm({ ...form, class_id: form.class_id || classes.data?.[0]?.id || '' }); setAdding(true) }}><Plus className="h-4 w-4" />Add session</Button>
      </div>

      <Card className="mb-6 space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" aria-label={view === 'year' ? 'Previous year' : 'Previous month'} onClick={() => view === 'year' ? setYear(year - 1) : shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="min-w-[8rem] text-center text-base font-semibold">{view === 'year' ? year : `${MONTHS[month]} ${year}`}</h2>
            <Button size="sm" variant="secondary" aria-label={view === 'year' ? 'Next year' : 'Next month'} onClick={() => view === 'year' ? setYear(year + 1) : shiftMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Filter by class" value={classId} onChange={(e) => setClassId(e.target.value)} className="h-8 rounded-control border border-line bg-white px-2 text-xs">
              <option value="">All classes</option>
              {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex rounded-control border border-line p-0.5" role="group" aria-label="View">
              {(['year', 'month'] as const).map((v) => (
                <button key={v} aria-pressed={view === v} onClick={() => setView(v)}
                  className={cn('rounded-[10px] px-3 py-1 text-xs font-medium capitalize', view === v ? 'bg-brand-gradient text-white' : 'text-ink-muted')}>{v}</button>
              ))}
            </div>
          </div>
        </div>
        {heat.isLoading ? <Skeleton className="h-32" /> : heat.error ? <p role="alert" className="text-sm text-red-600">Could not load the calendar.</p> : (
          <>
            {view === 'year'
              ? <YearHeatmap year={year} counts={heat.data!} selected={date} onSelect={select} />
              : <MonthCalendar year={year} month={month} counts={heat.data!} selected={date} onSelect={select} />}
            <p className="text-xs text-ink-muted">{total} {total === 1 ? 'class' : 'classes'} conducted in {year}. Cancelled and scheduled sessions are not counted.</p>
          </>
        )}
      </Card>

      {date ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{fmtDate(date)}</h2>
          {sessions.isLoading ? <Skeleton className="h-20" /> : !sessions.data?.length ? (
            <Card className="p-5 text-sm text-ink-muted">No sessions on this day. Use "Add session" or generate sessions from a class schedule.</Card>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sessions.data.map((s) => (
                <button key={s.id} onClick={() => setParams({ date, session: s.id })} aria-pressed={s.id === sessionId}
                  className={cn('rounded-card border bg-white p-3 text-left text-sm shadow-card transition hover:border-brand/40', s.id === sessionId ? 'border-brand' : 'border-line')}>
                  <p className="font-medium">{s.classes?.name}</p>
                  <p className="mb-1 text-xs text-ink-muted">{fmtTime(s.start_time)}–{fmtTime(s.end_time)}</p>
                  <Badge tone={sessionTone[s.status]}>{s.status}</Badge>
                </button>
              ))}
            </div>
          )}
          {active && <SessionPanel key={active.id} session={active} />}
        </div>
      ) : <p className="text-sm text-ink-muted">Select a day on the calendar to see its sessions.</p>}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add session">
        <div className="space-y-4">
          <SelectField label="Class" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
            {classes.data?.filter((c) => c.status === 'active').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <Field label="Date" type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <Field label="End" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button loading={create.isPending} disabled={!form.class_id || form.end_time <= form.start_time}
              onClick={() => create.mutate(form, { onSuccess: () => select(form.session_date) })}>Create</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
