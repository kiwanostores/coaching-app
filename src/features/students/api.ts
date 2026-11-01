import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { check, useAction } from '@/lib/query'
import { iso } from '@/lib/dates'
import type { AttendanceRow, ClassRow, Student, SummaryRow } from '@/lib/types'
import { useOrgId } from '@/features/auth/useOrgId'

export interface StudentOverview extends Student {
  classes: { id: string; name: string }[]
  attendancePct: number | null
  pending: number
}

export function useStudentsOverview() {
  return useQuery({
    queryKey: ['students', 'overview'],
    queryFn: async (): Promise<StudentOverview[]> => {
      const [s, e, a, p] = await Promise.all([
        supabase.from('students').select('*').order('full_name'),
        supabase.from('class_enrollments').select('student_id, class_id, classes(name)').is('left_on', null),
        supabase.rpc('attendance_summary', { p_from: '2000-01-01', p_to: iso(new Date()) }),
        supabase.from('assignment_student_status').select('student_id, derived_status').in('derived_status', ['open', 'overdue']),
      ])
      check(s); check(e); check(a); check(p)
      const att = new Map<string, { present: number; marked: number }>()
      for (const r of (a.data ?? []) as SummaryRow[]) {
        const cur = att.get(r.student_id) ?? { present: 0, marked: 0 }
        cur.present += r.present; cur.marked += r.present + r.absent
        att.set(r.student_id, cur)
      }
      const pending = new Map<string, number>()
      for (const r of (p.data ?? []) as { student_id: string }[]) pending.set(r.student_id, (pending.get(r.student_id) ?? 0) + 1)
      const classes = new Map<string, { id: string; name: string }[]>()
      for (const r of (e.data ?? []) as unknown as { student_id: string; class_id: string; classes: { name: string } | null }[]) {
        classes.set(r.student_id, [...(classes.get(r.student_id) ?? []), { id: r.class_id, name: r.classes?.name ?? 'Class' }])
      }
      return ((s.data ?? []) as Student[]).map((st) => {
        const t = att.get(st.id)
        return {
          ...st, classes: classes.get(st.id) ?? [], pending: pending.get(st.id) ?? 0,
          attendancePct: t && t.marked > 0 ? Math.round((1000 * t.present) / t.marked) / 10 : null,
        }
      })
    },
  })
}

export const useStudent = (id: string) =>
  useQuery({
    queryKey: ['students', 'one', id],
    queryFn: async () => (check(await supabase.from('students').select('*').eq('id', id).single()).data as Student),
  })

export const useStudentEnrollments = (id: string) =>
  useQuery({
    queryKey: ['students', 'enrollments', id],
    queryFn: async () =>
      (check(await supabase.from('class_enrollments').select('id, class_id, enrolled_on, left_on, classes(name)')
        .eq('student_id', id).order('enrolled_on', { ascending: false })).data ?? []) as unknown as
        { id: string; class_id: string; enrolled_on: string; left_on: string | null; classes: { name: string } | null }[],
  })

export const useStudentAttendance = (id: string) =>
  useQuery({
    queryKey: ['attendance', 'student', id],
    queryFn: async () => {
      const recs = check(await supabase.from('attendance_records')
        .select('*, class_sessions(session_date, classes(name))').eq('student_id', id)).data ?? []
      const rows = recs as unknown as (AttendanceRow & { class_sessions: { session_date: string; classes: { name: string } | null } })[]
      return rows.sort((x, y) => y.class_sessions.session_date.localeCompare(x.class_sessions.session_date))
    },
  })

export const useStudentSummary = (id: string) =>
  useQuery({
    queryKey: ['attendance', 'summary', id],
    queryFn: async () =>
      (check(await supabase.rpc('attendance_summary', { p_from: '2000-01-01', p_to: iso(new Date()), p_student: id })).data ?? []) as SummaryRow[],
  })

export const useTeacherNotes = (studentId: string) =>
  useQuery({
    queryKey: ['students', 'notes', studentId],
    queryFn: async () =>
      (check(await supabase.from('teacher_notes').select('id, body, created_at').eq('student_id', studentId)
        .order('created_at', { ascending: false })).data ?? []) as { id: string; body: string; created_at: string }[],
  })

export interface StudentInput { full_name: string; email: string; phone: string }

export function useCreateStudent(onDone: () => void) {
  const org = useOrgId()
  return useAction(async (v: StudentInput) => {
    check(await supabase.from('students').insert({ organization_id: org, full_name: v.full_name, email: v.email.trim(), phone: v.phone || null }))
  }, ['students', 'dashboard'], 'Student added', onDone)
}

export function useUpdateStudent(id: string, onDone: () => void) {
  return useAction(async (v: StudentInput) => {
    check(await supabase.from('students').update({ full_name: v.full_name, email: v.email.trim(), phone: v.phone || null }).eq('id', id))
  }, ['students'], 'Student updated', onDone)
}

export const useSetStudentActive = () =>
  useAction(async (v: { id: string; active: boolean }) => {
    check(await supabase.rpc('set_student_active', { p_student: v.id, p_active: v.active }))
  }, ['students', 'classes', 'dashboard'], 'Student updated')

export const useInviteStudent = () =>
  useAction(async (studentId: string) => {
    const { error } = await supabase.functions.invoke('invite-student', { body: { student_id: studentId } })
    if (error) throw new Error(`Invite failed: ${error.message}. Is the invite-student function deployed?`)
  }, [], 'Invitation sent')

export const useAddNote = (studentId: string) => {
  const org = useOrgId()
  return useAction(async (body: string) => {
    check(await supabase.from('teacher_notes').insert({ organization_id: org, student_id: studentId, body }))
  }, ['students'], 'Note saved')
}

export const useDeleteNote = () =>
  useAction(async (id: string) => { check(await supabase.from('teacher_notes').delete().eq('id', id)) }, ['students'], 'Note deleted')

export type { ClassRow }
