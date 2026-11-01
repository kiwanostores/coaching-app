import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'
import { SelectField, TextAreaField } from '@/components/ui/form-controls'
import { iso } from '@/lib/dates'

const schema = z.object({
  name: z.string().trim().min(1, 'Class name is required'),
  subject: z.string().trim().max(80),
  description: z.string().trim().max(500),
  class_type: z.enum(['individual', 'group']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string(),
}).refine((v) => !v.end_date || v.end_date >= v.start_date, { path: ['end_date'], message: 'End date must be after the start date' })
export type ClassValues = z.infer<typeof schema>

export function ClassForm({ initial, subjects, busy, onSubmit, onCancel }: {
  initial?: Partial<ClassValues>; subjects: string[]; busy: boolean; onSubmit: (v: ClassValues) => void; onCancel: () => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ClassValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', subject: '', description: '', class_type: 'group', start_date: iso(new Date()), end_date: '', ...initial },
  })
  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <Field label="Class name" error={errors.name?.message} {...register('name')} />
      <div>
        <Field label="Subject" list="subject-options" error={errors.subject?.message} {...register('subject')} />
        <datalist id="subject-options">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
      <TextAreaField label="Description" error={errors.description?.message} {...register('description')} />
      <SelectField label="Class type" {...register('class_type')}>
        <option value="group">Group (several students)</option>
        <option value="individual">Individual (one student)</option>
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date" type="date" error={errors.start_date?.message} {...register('start_date')} />
        <Field label="End date (optional)" type="date" error={errors.end_date?.message} {...register('end_date')} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={busy}>Save</Button>
      </div>
    </form>
  )
}
