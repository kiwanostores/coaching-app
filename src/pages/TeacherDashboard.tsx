import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Percent, Users, type LucideIcon } from 'lucide-react'
import { Card, Skeleton } from '@/components/ui/card'
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
    </>
  )
}
