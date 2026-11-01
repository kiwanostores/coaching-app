export type RecordStatus = 'active' | 'inactive'
export type SessionStatus = 'scheduled' | 'conducted' | 'cancelled' | 'rescheduled'
export type AttendanceStatus = 'present' | 'absent'

export interface Student {
  id: string; organization_id: string; user_id: string | null
  full_name: string; email: string; phone: string | null; status: RecordStatus; joined_on: string
}
export interface ClassRow {
  id: string; organization_id: string; subject_id: string | null; name: string; description: string | null
  class_type: 'individual' | 'group'; start_date: string; end_date: string | null; status: RecordStatus
  subjects?: { name: string } | null
}
export interface Schedule {
  id: string; class_id: string; weekday: number; start_time: string; end_time: string
  valid_from: string; valid_to: string | null
}
export interface SessionRow {
  id: string; organization_id: string; class_id: string; session_date: string
  start_time: string; end_time: string; status: SessionStatus; notes: string | null
  classes?: { name: string } | null
}
export interface AttendanceRow {
  id: string; session_id: string; student_id: string; status: AttendanceStatus; note: string | null
}
export interface SummaryRow {
  student_id: string; class_id: string; conducted: number; present: number; absent: number
  unmarked: number; pct: number | null
}
