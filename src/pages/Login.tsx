import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { brand } from '@/config/brand'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'

const schema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') })
type Values = z.infer<typeof schema>

export function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-app p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="rounded-card bg-brand-gradient p-6 text-white shadow-card">
          <p className="text-lg font-semibold">{brand.name}</p><p className="text-sm text-white/80">{brand.tagline}</p>
        </div>
        <Card className="space-y-4 p-6"><h1 className="text-xl font-semibold">{title}</h1>{children}</Card>
      </div>
    </div>
  )
}

export default function Login() {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })
  if (session) return <Navigate to="/" replace />

  const onSubmit = async (v: Values) => {
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword(v)
    setBusy(false)
    if (error) toast.error(error.message)
  }
  return (
    <AuthLayout title="Sign in">
      {!isSupabaseConfigured && (
        <p role="alert" className="rounded-control bg-accent-soft p-3 text-sm">Supabase is not configured. Copy <code>.env.example</code> to <code>.env</code> and fill in your project values.</p>
      )}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" className="w-full" loading={busy} disabled={!isSupabaseConfigured}>Sign in</Button>
      </form>
      <Link to="/forgot-password" className="text-sm text-brand hover:underline">Forgot password?</Link>
    </AuthLayout>
  )
}
