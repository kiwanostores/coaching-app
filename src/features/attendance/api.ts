import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { check, useAction } from '@/lib/query'
import type { AttendanceRow, AttendanceStatus, SessionRow, SessionStatus } from '@/lib/types'
import { useOrgId } from '@/features/auth/useOrgId'

export const useHeatmap = (year: number, classId: string | null) =>
  useQuery({
    queryKey: ['attendance', 'heatmap', year, classId],
    queryFn: async () => {
      const res = check(await supabase.rpc('session_heatmap', { p_year: year, p_class: classId }))
      const m = new Map<string, number>()
      for (const r of (res.data ?? []) as { day: string; conducted: number }[]) m.set(r.day, Number(r.conducted))
      return m
    },
  })

export const useSessionsOn = (date: string | null) =>
  useQuery({
    queryKey: ['sessions', 'on', date],
    enabled: Boolean(date),
    queryFn: async () =>
      (check(await supabase.from('class_sessions').select('*, classes(name)').eq('session_date', date!)
        .order('start_time')).data ?? []) as SessionRow[],
  })

export interface RosterEntry { id: string; name: string }
export const useRoster = (s: SessionRow) =>
  useQuery({
    queryKey: ['attendance', 'roster', s.id, s.session_date],
    queryFn: async () => {
      const [e, a] = await Promise.all([
        supabase.from('class_enrollments').select('student_id, students(full_name)').eq('class_id', s.class_id)
          .lte('enrolled_on', s.session_date).or(`left_on.is.null,left_on.gte.${s.session_date}`),
        supabase.from('attendance_records').select('*').eq('session_id', s.id),
      ])
      check(e); check(a)
      const seen = new Map<string, RosterEntry>()
      for (const r of (e.data ?? []) as unknown as { student_id: string; students: { full_name: string } | null }[]) {
        seen.set(r.student_id, { id: r.student_id, name: r.students?.full_name ?? 'Student' })
      }
      const records = new Map<string, AttendanceRow>()
      for (const r of (a.data ?? []) as AttendanceRow[]) records.set(r.student_id, r)
      return { roster: [...seen.values()].sort((x, y) => x.name.localeCompare(y.name)), records }
    },
  })

const REFRESH = ['sessions', 'attendance', 'dashboard', 'reports']

export const useSetSession = () =>
  useAction(async (v: { id: string; status?: SessionStatus; notes?: string }) => {
    const patch: Record<string, unknown> = {}
    if (v.status) patch.status = v.status
    if (v.notes !== undefined) patch.notes = v.notes || null
    check(await supabase.from('class_sessions').update(patch).eq('id', v.id))
  }, REFRESH, 'Session updated')

export const useReschedule = (onDone: () => void) =>
  useAction(async (v: { id: string; date: string; start: string; end: string }) => {
    check(await supabase.rpc('reschedule_session', { p_session: v.id, p_date: v.date, p_start: v.start, p_end: v.end }))
  }, REFRESH, 'Session rescheduled', onDone)

export const useCreateSession = (onDone: () => void) => {
  const org = useOrgId()
  return useAction(async (v: { class_id: string; session_date: string; start_time: string; end_time: string }) => {
    check(await supabase.from('class_sessions').insert({ organization_id: org, ...v }))
  }, REFRESH, 'Session created', onDone)
}

export const useSaveAttendance = () =>
  useAction(async (v: { sessionId: string; records: { student_id: string; status: AttendanceStatus; note: string | null }[] }) => {
    check(await supabase.rpc('save_attendance', { p_session: v.sessionId, p_records: v.records }))
  }, REFRESH, 'Attendance saved')
