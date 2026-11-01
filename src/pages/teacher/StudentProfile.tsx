import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { TextAreaField } from '@/components/ui/form-controls'
import { StudentForm } from '@/components/teacher/StudentForm'
import { fmtDate } from '@/lib/dates'
import {
  useAddNote, useDeleteNote, useStudent, useStudentAttendance, useStudentEnrollments, useStudentSummary,
  useTeacherNotes, useUpdateStudent,
} from '@/features/students/api'

export default function StudentProfile() {
  const { id = '' } = useParams()
  const student = useStudent(id)
  const enrollments = useStudentEnrollments(id)
  const attendance = useStudentAttendance(id)
  const summary = useStudentSummary(id)
  const notes = useTeacherNotes(id)
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState('')
  const update = useUpdateStudent(id, () => setEditing(false))
  const addNote = useAddNote(id)
  const delNote = useDeleteNote()

  if (student.isLoading) return <Skeleton className="h-40" />
  if (student.error || !student.data) return <p role="alert">Student not found.</p>
  const s = student.data
  const rows = summary.data ?? []
  const present = rows.reduce((a, r) => a + r.present, 0)
  const marked = present + rows.reduce((a, r) => a + r.absent, 0)

  return (
    <>
      <Link to="/teacher/students" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Students</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card bg-brand-gradient p-6 text-white shadow-card">
        <div>
          <h1 className="text-2xl font-semibold">{s.full_name}</h1>
          <p className="text-sm text-white/80">{s.email}{s.phone ? ` · ${s.phone}` : ''} · joined {fmtDate(s.joined_on)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={s.status === 'active' ? 'green' : 'neutral'}>{s.status}</Badge>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-3xl font-semibold">{marked ? `${Math.round((1000 * present) / marked) / 10}%` : '—'}</p>
          <p className="text-sm text-ink-muted">Attendance ({present} present of {marked} marked)</p>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Enrolled classes</h2>
          {enrollments.data?.length ? (
            <ul className="space-y-1 text-sm">
              {enrollments.data.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2">
                  <Link className="font-medium hover:text-brand" to={`/teacher/classes/${e.class_id}`}>{e.classes?.name ?? 'Class'}</Link>
                  <span className="text-ink-muted">{fmtDate(e.enrolled_on)} → {e.left_on ? fmtDate(e.left_on) : 'present'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-muted">Not enrolled in any class.</p>}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Attendance history</h2>
          {attendance.data?.length ? (
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-line">
                  {attendance.data.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-3">{fmtDate(r.class_sessions.session_date)}</td>
                      <td className="py-2 pr-3">{r.class_sessions.classes?.name}</td>
                      <td className="py-2 pr-3"><Badge tone={r.status === 'present' ? 'green' : 'red'}>{r.status}</Badge></td>
                      <td className="py-2 text-ink-muted">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-ink-muted">No attendance recorded yet.</p>}
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-1 text-sm font-semibold"><Lock className="h-3.5 w-3.5" />Private notes</h2>
          <p className="mb-3 text-xs text-ink-muted">Only you can see these. Students never can.</p>
          <TextAreaField label="New note" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" className="mt-2" loading={addNote.isPending} disabled={!note.trim()}
            onClick={() => addNote.mutate(note.trim(), { onSuccess: () => setNote('') })}>Save note</Button>
          <ul className="mt-4 space-y-3">
            {notes.data?.map((n) => (
              <li key={n.id} className="rounded-control bg-app p-3 text-sm">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-ink-muted">
                  {new Date(n.created_at).toLocaleDateString()}
                  <button aria-label="Delete note" onClick={() => delNote.mutate(n.id)} className="hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 lg:col-span-3"><p className="text-sm text-ink-muted">Assignment history, submitted files, feedback and learning progress appear here after Phase 3.</p></Card>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit student">
        <StudentForm initial={{ full_name: s.full_name, email: s.email, phone: s.phone ?? '' }} busy={update.isPending}
          onSubmit={(v) => update.mutate(v)} onCancel={() => setEditing(false)} />
      </Dialog>
    </>
  )
}
