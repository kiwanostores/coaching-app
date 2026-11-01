import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'

const schema = z.object({
  full_name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().max(30),
})
export type StudentValues = z.infer<typeof schema>

export function StudentForm({ initial, busy, onSubmit, onCancel }: {
  initial?: Partial<StudentValues>; busy: boolean; onSubmit: (v: StudentValues) => void; onCancel: () => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<StudentValues>({
    resolver: zodResolver(schema), defaultValues: { full_name: '', email: '', phone: '', ...initial },
  })
  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <Field label="Full name" error={errors.full_name?.message} {...register('full_name')} />
      <Field label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <Field label="Phone (optional)" error={errors.phone?.message} {...register('phone')} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={busy}>Save</Button>
      </div>
    </form>
  )
}
