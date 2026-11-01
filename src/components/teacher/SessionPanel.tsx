import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CalendarClock, Check, CheckCheck, X } from 'lucide-react'
import { Badge, sessionTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/input'
import { TextAreaField } from '@/components/ui/form-controls'
import { fmtTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { AttendanceStatus, SessionRow } from '@/lib/types'
import { useReschedule, useRoster, useSaveAttendance, useSetSession } from '@/features/attendance/api'

type Draft = Record<string, { status: AttendanceStatus | null; note: string }>

export function SessionPanel({ session }: { session: SessionRow }) {
  const { data, isLoading, error } = useRoster(session)
  const setSession = useSetSession()
  const save = useSaveAttendance()
  const [draft, setDraft] = useState<Draft>({})
  const [notes, setNotes] = useState(session.notes ?? '')
  const [moving, setMoving] = useState(false)
  const [mv, setMv] = useState({ date: session.session_date, start: fmtTime(session.start_time), end: fmtTime(session.end_time) })
  const reschedule = useReschedule(() => setMoving(false))
  const conducted = session.status === 'conducted'

  useEffect(() => {
    if (!data) return
    const d: Draft = {}
    data.roster.forEach((r) => { const rec = data.records.get(r.id); d[r.id] = { status: rec?.status ?? null, note: rec?.note ?? '' } })
    setDraft(d)
  }, [data])
  useEffect(() => setNotes(session.notes ?? ''), [session.id, session.notes])

  const mark = (id: string, status: AttendanceStatus) => setDraft((d) => ({ ...d, [id]: { ...d[id], status } }))
  const markAll = () => setDraft((d) => {
    const next: Draft = {}
    for (const k of Object.keys(d)) next[k] = { ...d[k], status: 'present' }
    return next
  })
  const saveAll = () => save.mutate({
    sessionId: session.id,
    records: Object.entries(draft).filter(([, v]) => v.status).map(([student_id, v]) => ({ student_id, status: v.status!, note: v.note.trim() || null })),
  })

  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{session.classes?.name ?? 'Class'}</h3>
          <p className="text-sm text-ink-muted">{fmtTime(session.start_time)} – {fmtTime(session.end_time)}</p>
        </div>
        <Badge tone={sessionTone[session.status]}>{session.status}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {session.status === 'scheduled' && (
          <>
            <Button size="sm" loading={setSession.isPending} onClick={() => setSession.mutate({ id: session.id, status: 'conducted' })}><Check className="h-4 w-4" />Mark conducted</Button>
            <Button size="sm" variant="secondary" onClick={() => setMoving(true)}><CalendarClock className="h-4 w-4" />Reschedule</Button>
          </>
        )}
        {(session.status === 'scheduled' || session.status === 'conducted') && (
          <Button size="sm" variant="secondary" onClick={() => setSession.mutate({ id: session.id, status: 'cancelled' })}><Ban className="h-4 w-4" />Cancel session</Button>
        )}
        {session.status === 'cancelled' && (
          <Button size="sm" variant="secondary" onClick={() => setSession.mutate({ id: session.id, status: 'scheduled' })}>Restore to scheduled</Button>
        )}
        <Link to={`/teacher/classes/${session.class_id}`} className="inline-flex h-8 items-center px-2 text-xs font-semibold text-brand hover:underline">Open class</Link>
      </div>

      <div className="space-y-2">
        <TextAreaField label="Session notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button size="sm" variant="secondary" loading={setSession.isPending} disabled={notes === (session.notes ?? '')}
          onClick={() => setSession.mutate({ id: session.id, notes })}>Save notes</Button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Attendance</h4>
          {conducted && <Button size="sm" variant="ghost" onClick={markAll}><CheckCheck className="h-4 w-4" />Mark all present</Button>}
        </div>
        {!conducted ? (
          <p className="rounded-control bg-brand-soft p-3 text-sm text-ink-muted">Mark the session as conducted to record attendance.</p>
        ) : isLoading ? <Skeleton className="h-24" /> : error ? (
          <p role="alert" className="text-sm text-red-600">Could not load the student list.</p>
        ) : data && data.roster.length === 0 ? (
          <p className="text-sm text-ink-muted">No students were enrolled on this date.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.roster.map((r) => {
              const row = draft[r.id]
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="min-w-[8rem] flex-1 text-sm font-medium">{r.name}</span>
                  <div className="flex gap-1" role="group" aria-label={`Attendance for ${r.name}`}>
                    <Button size="sm" variant="secondary" aria-pressed={row?.status === 'present'} onClick={() => mark(r.id, 'present')}
                      className={cn(row?.status === 'present' && 'border-emerald-500 bg-emerald-50 text-emerald-700')}><Check className="h-4 w-4" />Present</Button>
                    <Button size="sm" variant="secondary" aria-pressed={row?.status === 'absent'} onClick={() => mark(r.id, 'absent')}
                      className={cn(row?.status === 'absent' && 'border-red-500 bg-red-50 text-red-700')}><X className="h-4 w-4" />Absent</Button>
                  </div>
                  {!row?.status && <span className="text-xs text-ink-muted">Not marked</span>}
                  <input aria-label={`Note for ${r.name}`} placeholder="Note" value={row?.note ?? ''} maxLength={200}
                    onChange={(e) => setDraft((d) => ({ ...d, [r.id]: { ...d[r.id], note: e.target.value } }))}
                    className="h-8 w-full rounded-control border border-line px-2 text-xs sm:w-44" />
                </li>
              )
            })}
          </ul>
        )}
        {conducted && data && data.roster.length > 0 && (
          <div className="mt-3 flex items-center justify-end gap-3">
            <p className="text-xs text-ink-muted">Marked students are saved; unmarked ones stay "Not marked".</p>
            <Button loading={save.isPending} onClick={saveAll}>Save attendance</Button>
          </div>
        )}
      </div>

      <Dialog open={moving} onClose={() => setMoving(false)} title="Reschedule session">
        <div className="space-y-4">
          <Field label="New date" type="date" value={mv.date} onChange={(e) => setMv({ ...mv, date: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" type="time" value={mv.start} onChange={(e) => setMv({ ...mv, start: e.target.value })} />
            <Field label="End" type="time" value={mv.end} onChange={(e) => setMv({ ...mv, end: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMoving(false)}>Cancel</Button>
            <Button loading={reschedule.isPending} disabled={!mv.date || !mv.start || mv.end <= mv.start}
              onClick={() => reschedule.mutate({ id: session.id, date: mv.date, start: mv.start, end: mv.end })}>Reschedule</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  )
}
