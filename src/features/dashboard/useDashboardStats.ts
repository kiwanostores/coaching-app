import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  active_students: number
  upcoming_classes: number
  conducted_month: number
  pending_reviews: number
  attendance_rate: number | null
}

/** All numbers come from the teacher_dashboard_stats() database function. Nothing is hardcoded. */
export const useDashboardStats = () =>
  useQuery({
    queryKey: ['teacher', 'dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('teacher_dashboard_stats')
      if (error) throw error
      return data as DashboardStats
    },
  })
