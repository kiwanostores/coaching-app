import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { brand } from '@/config/brand'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthProvider'
import { AuthLayout } from './Login'

/** First-run: a signed-in user with no organisation becomes the teacher of a new one. */
export default function Setup() {
  const { session, membership, refresh, signOut } = useAuth()
  const [name, setName] = useState(brand.name)
  const [busy, setBusy] = useState(false)
  if (!session) return <Navigate to="/login" replace />
  if (membership) return <Navigate to="/" replace />
  const create = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('bootstrap_teacher_org', { org_name: name })
    if (error) { toast.error(error.message); setBusy(false); return }
    await refresh(); setBusy(false)
  }
  return (
    <AuthLayout title="Set up your coaching space">
      <p className="text-sm text-ink-muted">Give your space a name. You can change it later.</p>
      <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button className="w-full" loading={busy} disabled={!name.trim()} onClick={() => void create()}>Create</Button>
      <button onClick={() => void signOut()} className="text-sm text-ink-muted hover:underline">Sign out</button>
    </AuthLayout>
  )
}
