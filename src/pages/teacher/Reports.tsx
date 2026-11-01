import { useState } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Field } from '@/components/ui/input'
import { SelectField } from '@/components/ui/form-controls'
import { downloadCsv } from '@/lib/csv'
import { iso } from '@/lib/dates'
import { useClasses } from '@/features/classes/api'
import { useReport } from '@/features/reports/api'
import { useStudentsOverview } from '@/features/students/api'

const pct = (v: number | null) => (v == null ? '—' : `${v}%`)

function Stat({ label, value }: { label: string; value: string | number }) {
  return <Card className="p-5"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-ink-muted">{label}</p></Card>
}

function Table({ title, rows }: { title: string; rows: { id: string; name: string; present: number; absent: number; unmarked: number; pct: number | null }[] }) {
  return (
    <Card className="overflow-hidden">
      <h2 className="border-b border-line p-4 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="p-4 text-sm text-ink-muted">No data for these filters.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-app text-xs text-ink-muted"><tr>{['Name', 'Present', 'Absent', 'Not marked', 'Attendance'].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{rows.map((r) => (
            <tr key={r.id}><td className="px-4 py-2 font-medium">{r.name}</td><td className="px-4 py-2">{r.present}</td><td className="px-4 py-2">{r.absent}</td><td className="px-4 py-2">{r.unmarked}</td><td className="px-4 py-2">{pct(r.pct)}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </Card>
  )
}

export default function Reports() {
  const now = new Date()
  const [f, setF] = useState({ from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now), classId: '', studentId: '' })
  const classes = useClasses()
  const students = useStudentsOverview()
  const { data, isLoading, error } = useReport(f)
  const invalid = f.to < f.from

  const exportCsv = () => data && downloadCsv(`attendance_${f.from}_to_${f.to}.csv`, [
    ['Student', 'Class', 'Sessions conducted (while enrolled)', 'Present', 'Absent', 'Not marked', 'Attendance %'],
    ...data.detail.map((r) => [r.student, r.class, r.conducted, r.present, r.absent, r.unmarked, r.pct]),
  ])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Button variant="secondary" onClick={exportCsv} disabled={!data?.detail.length}><Download className="h-4 w-4" />Export CSV</Button>
      </div>
      <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} error={invalid ? 'Must be before “To”' : undefined} />
        <Field label="To" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <SelectField label="Class" value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })}>
          <option value="">All classes</option>{classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <SelectField label="Student" value={f.studentId} onChange={(e) => setF({ ...f, studentId: e.target.value })}>
          <option value="">All students</option>{students.data?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </SelectField>
      </Card>

      {invalid ? null : isLoading ? <Skeleton className="h-64" /> : error ? <p role="alert">Could not load the report.</p> : !data ? null : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Sessions conducted" value={data.conducted} />
            <Stat label="Sessions cancelled" value={data.cancelled} />
            <Stat label="Overall attendance" value={pct(data.overallPct)} />
          </div>
          {data.byStudent.length === 0 && data.conducted === 0
            ? <Card><EmptyState icon={BarChart3} title="No conducted sessions in this period" body="Mark sessions as conducted and record attendance to see results." /></Card> : (
              <>
                <Card className="p-5">
                  <h2 className="mb-3 text-sm font-semibold">Monthly trend</h2>
                  <ul className="space-y-2">
                    {data.monthly.map((m) => (
                      <li key={m.key} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-sm">
                        <span className="text-ink-muted">{m.label}</span>
                        <div className="h-2.5 overflow-hidden rounded-full bg-line" role="img" aria-label={`${m.label} attendance ${pct(m.pct)}`}>
                          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${m.pct ?? 0}%` }} />
                        </div>
                        <span className="whitespace-nowrap text-xs">{pct(m.pct)} · {m.conducted} held · {m.cancelled} cancelled</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Table title="Student-wise attendance" rows={data.byStudent} />
                <Table title="Class-wise attendance" rows={data.byClass} />
              </>
            )}
          <p className="text-xs text-ink-muted">Attendance % = present ÷ (present + absent), counting only conducted sessions within each student’s enrollment dates. Sessions not yet marked are listed separately and excluded from the percentage. Assignment completion and performance reports arrive with Phase 3.</p>
        </div>
      )}
    </>
  )
}
