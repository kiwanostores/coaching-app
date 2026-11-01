import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'
import { AuthLayout } from './Login'

export function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.string().email('Enter a valid email') })),
  })
  const onSubmit = async ({ email }: { email: string }) => {
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    setBusy(false)
    if (error) toast.error(error.message); else setSent(true)
  }
  return (
    <AuthLayout title="Reset password">
      {sent ? <p className="text-sm">If that email has an account, a reset link is on its way.</p> : (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
          <Field label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Button type="submit" className="w-full" loading={busy}>Send reset link</Button>
        </form>
      )}
      <Link to="/login" className="text-sm text-brand hover:underline">Back to sign in</Link>
    </AuthLayout>
  )
}

const pwSchema = z.object({ password: z.string().min(8, 'Use at least 8 characters') })

/** Reached from the emailed link (also used for first-time password setup after an invite). */
export function ResetPassword() {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<{ password: string }>({ resolver: zodResolver(pwSchema) })
  const onSubmit = async ({ password }: { password: string }) => {
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) toast.error(error.message); else { toast.success('Password updated'); nav('/', { replace: true }) }
  }
  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
        <Field label="New password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" className="w-full" loading={busy}>Update password</Button>
      </form>
    </AuthLayout>
  )
}
