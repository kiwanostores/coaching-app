import { useAuth } from '@/features/auth/AuthProvider'

export default function StudentHome() {
  const { session } = useAuth()
  const name = (session?.user.user_metadata?.full_name as string | undefined) ?? session?.user.email
  return (
    <div className="rounded-card bg-brand-gradient p-6 text-white shadow-card">
      <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
      <p className="text-sm text-white/80">Your classes, assignments and resources will appear here (Phase 5).</p>
    </div>
  )
}
