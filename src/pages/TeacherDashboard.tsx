import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarCheck, CalendarClock, CheckCircle2, ClipboardCheck, GraduationCap, Percent, UserPlus, Users, type LucideIcon } from 'lucide-react'
import { Badge, sessionTone } from '@/components/ui/badge'
import { Card, Skeleton } from '@/components/ui/card'
import { YearHeatmap } from '@/components/teacher/Heatmap'
import { fmtTime, iso } from '@/lib/dates'
import { useClasses } from '@/features/classes/api'
import { useHeatmap, useSessionsOn } from '@/features/attendance/api'
import { useDashboardStats } from '@/features/dashboard/useDashboardStats'

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="grid h-11 w-11 place-items-center rounded-control bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
      <div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-ink-muted">{label}</p></div>
    </Card>
  )
}

export default function TeacherDashboard() {
  const { data, isLoading, error, refetch } = useDashboardStats()
  const today = iso(new Date())
  const year = new Date().getFullYear()
  const todays = useSessionsOn(today)
  const classes = useClasses()
  const heat = useHeatmap(year, null)
  const enrolled = new Map((classes.data ?? []).map((c) => [c.id, c]))
  return (
    <>
      <div className="mb-6 rounded-card bg-brand-gradient p-6 text-white shadow-card">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-white/80">Your teaching at a glance.</p>
      </div>
      {error ? (
        <Card className="flex items-center gap-3 p-5" role="alert">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-sm">Could not load statistics. <button className="text-brand underline" onClick={() => void refetch()}>Retry</button></p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading || !data ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24" />) : (
            <>
              <Stat icon={Users} label="Active students" value={String(data.active_students)} />
              <Stat icon={CalendarClock} label="Upcoming classes (7 days)" value={String(data.upcoming_classes)} />
              <Stat icon={CheckCircle2} label="Classes conducted this month" value={String(data.conducted_month)} />
              <Stat icon={ClipboardCheck} label="Pending reviews" value={String(data.pending_reviews)} />
              <Stat icon={Percent} label="Attendance this month" value={data.attendance_rate == null ? '—' : `${data.attendance_rate}%`} />
            </>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold">Today’s classes</h2>
          {todays.isLoading ? <Skeleton className="h-16" /> : !todays.data?.length ? (
            <p className="text-sm text-ink-muted">No classes scheduled today.</p>
          ) : (
            <ul className="space-y-2">
              {todays.data.map((s) => {
                const c = enrolled.get(s.class_id)
                return (
                  <li key={s.id}>
                    <Link to={`/teacher/attendance?date=${s.session_date}&session=${s.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line p-3 text-sm hover:border-brand/40">
                      <div>
                        <p className="font-medium">{s.classes?.name}</p>
                        <p className="text-xs text-ink-muted">{c?.subjects?.name ?? 'No subject'} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)} · {c?.class_type} · {c?.enrolled ?? 0} students</p>
                      </div>
                      <Badge tone={sessionTone[s.status]}>{s.status}</Badge>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold">Quick actions</h2>
          <div className="grid gap-2 text-sm font-medium">
            {[{ to: '/teacher/attendance', label: 'Mark attendance', icon: CalendarCheck }, { to: '/teacher/students', label: 'Add student', icon: UserPlus }, { to: '/teacher/classes', label: 'Create class', icon: GraduationCap }].map(({ to, label, icon: Icon }) => (
              <Link key={label} to={to} className="flex items-center gap-2 rounded-control border border-line px-3 py-2 hover:bg-brand-soft"><Icon className="h-4 w-4 text-brand" />{label}</Link>
            ))}
            <p className="px-1 pt-1 text-xs font-normal text-ink-muted">Create assignment and upload resource arrive in Phases 3 and 4.</p>
          </div>
        </Card>
        <Card className="p-5 lg:col-span-3">
          <h2 className="mb-3 text-base font-semibold">Teaching activity, {year}</h2>
          {heat.data ? <YearHeatmap year={year} counts={heat.data} compact /> : <Skeleton className="h-20" />}
        </Card>
      </div>
    </>
  )
}
