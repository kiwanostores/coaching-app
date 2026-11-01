import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth, type Role } from './AuthProvider'

const Spinner = () => (
  <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Loading" /></div>
)

export const homeFor = (role: Role) => (role === 'teacher' ? '/teacher' : '/student')

/** UX guard only. Real protection is Row Level Security in the database. */
export function RequireRole({ role }: { role: Role }) {
  const { session, membership, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!membership) return <Navigate to="/setup" replace />
  if (membership.role !== role) return <Navigate to={homeFor(membership.role)} replace />
  return <Outlet />
}

export function RootRedirect() {
  const { session, membership, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!membership) return <Navigate to="/setup" replace />
  return <Navigate to={homeFor(membership.role)} replace />
}
