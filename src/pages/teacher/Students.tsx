import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Plus, Search, UserCheck, UserX, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty'
import { StudentForm } from '@/components/teacher/StudentForm'
import { useCreateStudent, useInviteStudent, useSetStudentActive, useStudentsOverview, type StudentOverview } from '@/features/students/api'

export default function Students() {
  const { data, isLoading, error, refetch } = useStudentsOverview()
  const [q, setQ] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deactivating, setDeactivating] = useState<StudentOverview | null>(null)
  const create = useCreateStudent(() => setAdding(false))
  const setActive = useSetStudentActive()
  const invite = useInviteStudent()

  const rows = useMemo(() => (data ?? []).filter((s) =>
    (showInactive || s.status === 'active') &&
    `${s.full_name} ${s.email}`.toLowerCase().includes(q.trim().toLowerCase())), [data, q, showInactive])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Students</h1>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add student</Button>
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
            <input aria-label="Search students" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-control border border-line pl-9 pr-3 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />Show deactivated
          </label>
        </div>
        {isLoading ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          : error ? <p role="alert" className="p-6 text-sm">Could not load students. <button className="text-brand underline" onClick={() => void refetch()}>Retry</button></p>
          : rows.length === 0 ? <EmptyState icon={Users} title={data?.length ? 'No matching students' : 'No students yet'} body={data?.length ? 'Try a different search.' : 'Add your first student to get started.'} />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-app text-xs text-ink-muted">
                  <tr>{['Student', 'Classes', 'Attendance', 'Pending', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((s) => (
                    <tr key={s.id} className="hover:bg-app/60">
                      <td className="px-4 py-3">
                        <Link to={`/teacher/students/${s.id}`} className="font-medium text-ink hover:text-brand">{s.full_name}</Link>
                        <p className="text-xs text-ink-muted">{s.email}</p>
                      </td>
                      <td className="px-4 py-3">{s.classes.length ? s.classes.map((c) => c.name).join(', ') : <span className="text-ink-muted">—</span>}</td>
                      <td className="px-4 py-3">{s.attendancePct == null ? '—' : `${s.attendancePct}%`}</td>
                      <td className="px-4 py-3">{s.pending}</td>
                      <td className="px-4 py-3">
                        <Badge tone={s.status === 'active' ? 'green' : 'neutral'}>{s.status === 'active' ? (s.user_id ? 'Active' : 'Not invited') : 'Deactivated'}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {s.status === 'active' && !s.user_id && (
                          <Button size="sm" variant="ghost" loading={invite.isPending && invite.variables === s.id} onClick={() => invite.mutate(s.id)}><Mail className="h-4 w-4" />Invite</Button>
                        )}
                        {s.status === 'active'
                          ? <Button size="sm" variant="ghost" onClick={() => setDeactivating(s)}><UserX className="h-4 w-4" />Deactivate</Button>
                          : <Button size="sm" variant="ghost" onClick={() => setActive.mutate({ id: s.id, active: true })}><UserCheck className="h-4 w-4" />Reactivate</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <p className="mt-3 text-xs text-ink-muted">Attendance % = present ÷ marked sessions, across the periods each student was enrolled.</p>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add student">
        <StudentForm busy={create.isPending} onSubmit={(v) => create.mutate(v)} onCancel={() => setAdding(false)} />
      </Dialog>
      <ConfirmDialog open={Boolean(deactivating)} onClose={() => setDeactivating(null)} busy={setActive.isPending}
        title="Deactivate student?" confirmLabel="Deactivate"
        body={`${deactivating?.full_name ?? 'This student'} will lose portal access and be removed from their current classes. All attendance, assignments and submissions are kept.`}
        onConfirm={() => { if (deactivating) setActive.mutate({ id: deactivating.id, active: false }, { onSuccess: () => setDeactivating(null) }) }} />
    </>
  )
}
