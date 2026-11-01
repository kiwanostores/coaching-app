import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type Role = 'teacher' | 'student'
interface Membership { organizationId: string; role: Role }

interface AuthState {
  session: Session | null
  membership: Membership | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMembership = useCallback(async (s: Session | null) => {
    if (!s) { setMembership(null); return }
    const { data } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', s.user.id).eq('status', 'active').limit(1).maybeSingle()
    setMembership(data ? { organizationId: data.organization_id as string, role: data.role as Role } : null)
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadMembership(data.session)
      if (mounted) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s)
      // defer: do not call supabase inside the auth callback
      setTimeout(() => { void loadMembership(s) }, 0)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [loadMembership])

  const value = useMemo<AuthState>(() => ({
    session, membership, loading,
    refresh: () => loadMembership(session),
    signOut: async () => { await supabase.auth.signOut(); setMembership(null) },
  }), [session, membership, loading, loadMembership])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
