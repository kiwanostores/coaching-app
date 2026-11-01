import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { check, useAction } from '@/lib/query'
import type { ClassRow, Schedule, SessionRow } from '@/lib/types'
import { useOrgId } from '@/features/auth/useOrgId'

export type ClassWithCount = ClassRow & { enrolled: number }

export const useClasses = () =>
  useQuery({
    queryKey: ['classes', 'list'],
    queryFn: async (): Promise<ClassWithCount[]> => {
      const [c, e] = await Promise.all([
        supabase.from('classes').select('*, subjects(name)').order('name'),
        supabase.from('class_enrollments').select('class_id').is('left_on', null),
      ])
      check(c); check(e)
      const counts = new Map<string, number>()
      for (const r of (e.data ?? []) as { class_id: string }[]) counts.set(r.class_id, (counts.get(r.class_id) ?? 0) + 1)
      return ((c.data ?? []) as ClassRow[]).map((x) => ({ ...x, enrolled: counts.get(x.id) ?? 0 }))
    },
  })

export const useClass = (id: string) =>
  useQuery({
    queryKey: ['classes', 'one', id],
    queryFn: async () => check(await supabase.from('classes').select('*, subjects(name)').eq('id', id).single()).data as ClassRow,
  })

export const useSchedules = (classId: string) =>
  useQuery({
    queryKey: ['classes', 'schedules', classId],
    queryFn: async () =>
      (check(await supabase.from('class_schedules').select('*').eq('class_id', classId).order('weekday').order('start_time')).data ?? []) as Schedule[],
  })

export interface EnrollmentRow {
  id: string; student_id: string; enrolled_on: string; left_on: string | null
  students: { full_name: string; email: string; status: string } | null
}
export const useClassEnrollments = (classId: string) =>
  useQuery({
    queryKey: ['classes', 'enrollments', classId],
    queryFn: async () =>
      (check(await supabase.from('class_enrollments').select('id, student_id, enrolled_on, left_on, students(full_name, email, status)')
        .eq('class_id', classId).order('enrolled_on', { ascending: false })).data ?? []) as unknown as EnrollmentRow[],
  })

export const useClassSessions = (classId: string) =>
  useQuery({
    queryKey: ['sessions', 'class', classId],
    queryFn: async () =>
      (check(await supabase.from('class_sessions').select('*').eq('class_id', classId)
        .order('session_date', { ascending: false }).limit(60)).data ?? []) as SessionRow[],
  })

export interface ClassInput {
  name: string; subject: string; description: string
  class_type: 'individual' | 'group'; start_date: string; end_date: string
}

async function ensureSubject(org: string, name: string): Promise<string | null> {
  const n = name.trim()
  if (!n) return null
  const found = check(await supabase.from('subjects').select('id').eq('organization_id', org).eq('name', n).maybeSingle())
  if (found.data) return (found.data as { id: string }).id
  return (check(await supabase.from('subjects').insert({ organization_id: org, name: n }).select('id').single()).data as { id: string }).id
}

export function useSaveClass(existingId: string | null, onDone: () => void) {
  const org = useOrgId()
  return useAction(async (v: ClassInput) => {
    const row = {
      name: v.name, description: v.description || null, class_type: v.class_type,
      start_date: v.start_date, end_date: v.end_date || null, subject_id: await ensureSubject(org, v.subject),
    }
    check(existingId
      ? await supabase.from('classes').update(row).eq('id', existingId)
      : await supabase.from('classes').insert({ ...row, organization_id: org }))
  }, ['classes', 'dashboard'], existingId ? 'Class updated' : 'Class created', onDone)
}

export const useSetClassActive = () =>
  useAction(async (v: { id: string; active: boolean }) => {
    check(await supabase.from('classes').update({ status: v.active ? 'active' : 'inactive' }).eq('id', v.id))
  }, ['classes'], 'Class updated')

export function useAddSchedule(classId: string, onDone: () => void) {
  const org = useOrgId()
  return useAction(async (v: { weekday: number; start_time: string; end_time: string; valid_from: string }) => {
    check(await supabase.from('class_schedules').insert({ organization_id: org, class_id: classId, ...v }))
  }, ['classes'], 'Schedule added', onDone)
}

export const useDeleteSchedule = () =>
  useAction(async (id: string) => { check(await supabase.from('class_schedules').delete().eq('id', id)) }, ['classes'], 'Schedule removed')

export const useGenerateSessions = (classId: string) =>
  useAction(async (v: { from: string; to: string }) => {
    const res = check(await supabase.rpc('generate_sessions', { p_class: classId, p_from: v.from, p_to: v.to }))
    return res.data
  }, ['sessions', 'attendance', 'dashboard'])

export const useEnroll = () =>
  useAction(async (v: { classId: string; studentId: string; on: string }) => {
    check(await supabase.rpc('enroll_student', { p_class: v.classId, p_student: v.studentId, p_on: v.on }))
  }, ['classes', 'students', 'attendance'], 'Student enrolled')

export const useLeaveClass = () =>
  useAction(async (v: { classId: string; studentId: string }) => {
    check(await supabase.rpc('leave_class', { p_class: v.classId, p_student: v.studentId }))
  }, ['classes', 'students'], 'Student removed from class')
