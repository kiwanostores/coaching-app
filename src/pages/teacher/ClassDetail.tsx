import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, Pencil, Trash2, UserMinus } from 'lucide-react'
import { Badge, sessionTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/input'
import { SelectField } from '@/components/ui/form-controls'
import { ClassForm } from '@/components/teacher/ClassForm'
import { WEEKDAYS, addDays, fmtDate, fmtTime, iso } from '@/lib/dates'
import {
  useAddSchedule, useClass, useClassEnrollments, useClassSessions, useClasses, useDeleteSchedule, useEnroll,
  useGenerateSessions, useLeaveClass, useSaveClass, useSchedules, useSetClassActive,
} from '@/features/classes/api'
import { useStudentsOverview } from '@/features/students/api'
import { toast } from 'sonner'

export default function ClassDetail() {
  const { id = '' } = useParams()
  const cls = useClass(id)
  const all = useClasses()
  const schedules = useSchedules(id)
  const enrollments = useClassEnrollments(id)
  const sessions = useClassSessions(id)
  const students = useStudentsOverview()
  const [editing, setEditing] = useState(false)
  const [sch, setSch] = useState({ weekday: 1, start_time: '16:00', end_time: '17:00', valid_from: iso(new Date()) })
  const [range, setRange] = useState({ from: iso(new Date()), to: iso(addDays(new Date(), 28)) })
  const [pick, setPick] = useState({ studentId: '', on: iso(new Date()) })
  const save = useSaveClass(id, () => setEditing(false))
  const setActive = useSetClassActive()
  const addSchedule = useAddSchedule(id, () => undefined)
  const delSchedule = useDeleteSchedule()
  const generate = useGenerateSessions(id)
  const enroll = useEnroll()
  const leave = useLeaveClass()

  const current = (enrollments.data ?? []).filter((e) => !e.left_on)
  const past = (enrollments.data ?? []).filter((e) => e.left_on)
  const candidates = useMemo(() => (students.data ?? []).filter((s) => s.status === 'active' && !current.some((e) => e.student_id === s.id)), [students.data, current])
  const subjects = [...new Set((all.data ?? []).map((c) => c.subjects?.name).filter((n): n is string => Boolean(n)))]

  if (cls.isLoading) return <Skeleton className="h-40" />
  if (cls.error || !cls.data) return <p role="alert">Class not found.</p>
  const c = cls.data

  return (
    <>
      <Link to="/teacher/classes" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Classes</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card bg-brand-gradient p-6 text-white shadow-card">
        <div>
          <h1 className="text-2xl font-semibold">{c.name}</h1>
          <p className="text-sm text-white/80">{c.subjects?.name ?? 'No subject'} · {c.class_type} · from {fmtDate(c.start_date)}{c.end_date ? ` to ${fmtDate(c.end_date)}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button>
          <Button size="sm" variant="secondary" loading={setActive.isPending} onClick={() => setActive.mutate({ id, active: c.status !== 'active' })}>{c.status === 'active' ? 'Mark inactive' : 'Reactivate'}</Button>
        </div>
      </div>
      {c.description && <p className="mb-4 text-sm text-ink-muted">{c.description}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Weekly schedule</h2>
          {schedules.data?.length ? (
            <ul className="space-y-2 text-sm">
              {schedules.data.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-control bg-app px-3 py-2">
                  <span>{WEEKDAYS[s.weekday]} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)} <span className="text-ink-muted">from {fmtDate(s.valid_from)}</span></span>
                  <button aria-label="Remove schedule" onClick={() => delSchedule.mutate(s.id)} className="text-ink-muted hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-muted">No recurring schedule yet.</p>}
          <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
            <SelectField label="Day" value={sch.weekday} onChange={(e) => setSch({ ...sch, weekday: Number(e.target.value) })}>
              {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
            </SelectField>
            <Field label="Effective from" type="date" value={sch.valid_from} onChange={(e) => setSch({ ...sch, valid_from: e.target.value })} />
            <Field label="Start" type="time" value={sch.start_time} onChange={(e) => setSch({ ...sch, start_time: e.target.value })} />
            <Field label="End" type="time" value={sch.end_time} onChange={(e) => setSch({ ...sch, end_time: e.target.value })} />
            <Button className="col-span-2" variant="secondary" loading={addSchedule.isPending} disabled={sch.end_time <= sch.start_time} onClick={() => addSchedule.mutate(sch)}>Add schedule</Button>
          </div>
          <p className="text-xs text-ink-muted">Changing the schedule never alters sessions that already exist.</p>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Create sessions from schedule</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            <Field label="To" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </div>
          <Button loading={generate.isPending} disabled={!schedules.data?.length}
            onClick={() => generate.mutate({ from: range.from, to: range.to }, { onSuccess: (n) => toast.success(`${Number(n ?? 0)} new session(s) created`) })}>
            <CalendarPlus className="h-4 w-4" />Generate sessions
          </Button>
          <p className="text-xs text-ink-muted">Generated sessions start as "scheduled" and only count as conducted once you mark them.</p>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Enrolled students ({current.length})</h2>
          {current.length ? (
            <ul className="space-y-2 text-sm">
              {current.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-control bg-app px-3 py-2">
                  <Link to={`/teacher/students/${e.student_id}`} className="font-medium hover:text-brand">{e.students?.full_name}</Link>
                  <Button size="sm" variant="ghost" onClick={() => leave.mutate({ classId: id, studentId: e.student_id })}><UserMinus className="h-4 w-4" />Remove</Button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-muted">No students enrolled.</p>}
          <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
            <SelectField label="Student" value={pick.studentId} onChange={(e) => setPick({ ...pick, studentId: e.target.value })}>
              <option value="">Select…</option>
              {candidates.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </SelectField>
            <Field label="Enrolled on" type="date" value={pick.on} onChange={(e) => setPick({ ...pick, on: e.target.value })} />
            <Button className="col-span-2" variant="secondary" loading={enroll.isPending} disabled={!pick.studentId}
              onClick={() => enroll.mutate({ classId: id, studentId: pick.studentId, on: pick.on }, { onSuccess: () => setPick({ ...pick, studentId: '' }) })}>Enroll student</Button>
          </div>
          {past.length > 0 && (
            <details className="text-sm text-ink-muted"><summary className="cursor-pointer">Past students ({past.length})</summary>
              <ul className="mt-2 space-y-1">{past.map((e) => <li key={e.id}>{e.students?.full_name}: {fmtDate(e.enrolled_on)} → {fmtDate(e.left_on!)}</li>)}</ul>
            </details>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Session history</h2>
          {sessions.data?.length ? (
            <ul className="max-h-80 divide-y divide-line overflow-auto text-sm">
              {sessions.data.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <Link to={`/teacher/attendance?date=${s.session_date}&session=${s.id}`} className="hover:text-brand">{fmtDate(s.session_date)} · {fmtTime(s.start_time)}</Link>
                  <Badge tone={sessionTone[s.status]}>{s.status}</Badge>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-muted">No sessions yet.</p>}
        </Card>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit class">
        <ClassForm subjects={subjects} busy={save.isPending} onSubmit={(v) => save.mutate(v)} onCancel={() => setEditing(false)}
          initial={{ name: c.name, subject: c.subjects?.name ?? '', description: c.description ?? '', class_type: c.class_type, start_date: c.start_date, end_date: c.end_date ?? '' }} />
      </Dialog>
    </>
  )
}
