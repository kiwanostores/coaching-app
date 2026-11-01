import { Navigate, Route, Routes } from 'react-router-dom'
import { BarChart3, BookOpen, CalendarCheck, FileText, FolderOpen, GraduationCap, Home, LayoutDashboard, TrendingUp, User, Users } from 'lucide-react'
import { AppShell, type NavItem } from '@/components/layout/AppShell'
import { RequireRole, RootRedirect } from '@/features/auth/guards'
import Login from '@/pages/Login'
import { ForgotPassword, ResetPassword } from '@/pages/PasswordReset'
import Setup from '@/pages/Setup'
import Pending from '@/pages/Pending'
import TeacherDashboard from '@/pages/TeacherDashboard'
import Students from '@/pages/teacher/Students'
import StudentProfile from '@/pages/teacher/StudentProfile'
import Classes from '@/pages/teacher/Classes'
import ClassDetail from '@/pages/teacher/ClassDetail'
import Attendance from '@/pages/teacher/Attendance'
import Reports from '@/pages/teacher/Reports'
import StudentHome from '@/pages/StudentHome'

const teacherNav: NavItem[] = [
  { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/teacher/students', label: 'Students', icon: Users },
  { to: '/teacher/classes', label: 'Classes', icon: GraduationCap },
  { to: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/teacher/assignments', label: 'Assignments', icon: FileText },
  { to: '/teacher/resources', label: 'Resources', icon: FolderOpen },
  { to: '/teacher/reports', label: 'Reports', icon: BarChart3 },
]
const studentNav: NavItem[] = [
  { to: '/student', label: 'Home', icon: Home, end: true },
  { to: '/student/assignments', label: 'My Assignments', icon: FileText },
  { to: '/student/resources', label: 'Resources', icon: BookOpen },
  { to: '/student/progress', label: 'My Progress', icon: TrendingUp },
  { to: '/student/profile', label: 'Profile', icon: User },
]

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/setup" element={<Setup />} />

      <Route element={<RequireRole role="teacher" />}>
        <Route path="/teacher" element={<AppShell items={teacherNav} roleLabel="Teacher" />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentProfile />} />
          <Route path="classes" element={<Classes />} />
          <Route path="classes/:id" element={<ClassDetail />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="assignments" element={<Pending title="Assignments" phase={3} />} />
          <Route path="resources" element={<Pending title="Resources" phase={4} />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="student" />}>
        <Route path="/student" element={<AppShell items={studentNav} roleLabel="Student" />}>
          <Route index element={<StudentHome />} />
          <Route path="assignments" element={<Pending title="My Assignments" phase={5} />} />
          <Route path="resources" element={<Pending title="Resources" phase={5} />} />
          <Route path="progress" element={<Pending title="My Progress" phase={5} />} />
          <Route path="profile" element={<Pending title="Profile" phase={5} />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
