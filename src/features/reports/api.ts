import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { check } from '@/lib/query'
import { MONTHS, iso, parseISO } from '@/lib/dates'
import type { SummaryRow } from '@/lib/types'

export interface ReportFilters { from: string; to: string; classId: string; studentId: string }
export interface MonthPoint { key: string; label: string; conducted: number; cancelled: number; pct: number | null }

const pctOf = (present: number, absent: number) => (present + absent > 0 ? Math.round((1000 * present) / (present + absent)) / 10 : null)

export const useReport = (f: ReportFilters) =>
  useQuery({
    queryKey: ['reports', f],
    queryFn: async () => {
      const args = { p_from: f.from, p_to: f.to, p_student: f.studentId || null, p_class: f.classId || null }
      let classIds: string[] | null = f.classId ? [f.classId] : null
      if (f.studentId && !f.classId) {
        const en = check(await supabase.from('class_enrollments').select('class_id').eq('student_id', f.studentId))
        classIds = [...new Set(((en.data ?? []) as { class_id: string }[]).map((r) => r.class_id))]
      }
      let sq = supabase.from('class_sessions').select('class_id, session_date, status')
        .gte('session_date', f.from).lte('session_date', f.to).in('status', ['conducted', 'cancelled'])
      if (classIds) sq = sq.in('class_id', classIds.length ? classIds : ['00000000-0000-0000-0000-000000000000'])
      const [sum, ses, studs, cls] = await Promise.all([
        supabase.rpc('attendance_summary', args), sq,
        supabase.from('students').select('id, full_name'), supabase.from('classes').select('id, name'),
      ])
      check(sum); check(ses); check(studs); check(cls)
      const rows = (sum.data ?? []) as SummaryRow[]
      const sessions = (ses.data ?? []) as { class_id: string; session_date: string; status: string }[]
      const sName = new Map(((studs.data ?? []) as { id: string; full_name: string }[]).map((s) => [s.id, s.full_name]))
      const cName = new Map(((cls.data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]))

      const agg = (key: (r: SummaryRow) => string, names: Map<string, string>) => {
        const m = new Map<string, { id: string; name: string; present: number; absent: number; unmarked: number }>()
        for (const r of rows) {
          const k = key(r)
          const cur = m.get(k) ?? { id: k, name: names.get(k) ?? 'Unknown', present: 0, absent: 0, unmarked: 0 }
          cur.present += r.present; cur.absent += r.absent; cur.unmarked += r.unmarked
          m.set(k, cur)
        }
        return [...m.values()].map((x) => ({ ...x, pct: pctOf(x.present, x.absent) })).sort((a, b) => a.name.localeCompare(b.name))
      }

      // monthly trend: attendance computed per calendar month (last 12 months of the range)
      const months: { key: string; from: string; to: string }[] = []
      const end = parseISO(f.to)
      for (let d = new Date(end.getFullYear(), end.getMonth(), 1); months.length < 12 && iso(d) >= iso(new Date(parseISO(f.from).getFullYear(), parseISO(f.from).getMonth(), 1)); d = new Date(d.getFullYear(), d.getMonth() - 1, 1)) {
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        months.unshift({ key: iso(d).slice(0, 7), from: iso(d) < f.from ? f.from : iso(d), to: iso(last) > f.to ? f.to : iso(last) })
      }
      const monthly = await Promise.all(months.map(async (mo): Promise<MonthPoint> => {
        const r = check(await supabase.rpc('attendance_summary', { ...args, p_from: mo.from, p_to: mo.to }))
        const mr = (r.data ?? []) as SummaryRow[]
        const inMonth = sessions.filter((s) => s.session_date.startsWith(mo.key))
        return {
          key: mo.key, label: `${MONTHS[Number(mo.key.slice(5)) - 1]} ${mo.key.slice(0, 4)}`,
          conducted: inMonth.filter((s) => s.status === 'conducted').length,
          cancelled: inMonth.filter((s) => s.status === 'cancelled').length,
          pct: pctOf(mr.reduce((a, x) => a + x.present, 0), mr.reduce((a, x) => a + x.absent, 0)),
        }
      }))

      const present = rows.reduce((a, r) => a + r.present, 0)
      const absent = rows.reduce((a, r) => a + r.absent, 0)
      return {
        conducted: sessions.filter((s) => s.status === 'conducted').length,
        cancelled: sessions.filter((s) => s.status === 'cancelled').length,
        overallPct: pctOf(present, absent),
        byStudent: agg((r) => r.student_id, sName),
        byClass: agg((r) => r.class_id, cName),
        monthly,
        detail: rows.map((r) => ({ ...r, student: sName.get(r.student_id) ?? '', class: cName.get(r.class_id) ?? '' })),
      }
    },
  })
