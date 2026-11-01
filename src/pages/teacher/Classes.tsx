import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty'
import { ClassForm } from '@/components/teacher/ClassForm'
import { useClasses, useSaveClass } from '@/features/classes/api'

export default function Classes() {
  const { data, isLoading, error, refetch } = useClasses()
  const [adding, setAdding] = useState(false)
  const save = useSaveClass(null, () => setAdding(false))
  const subjects = [...new Set((data ?? []).map((c) => c.subjects?.name).filter((n): n is string => Boolean(n)))]
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Classes</h1>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Create class</Button>
      </div>
      {isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}</div>
        : error ? <p role="alert">Could not load classes. <button className="text-brand underline" onClick={() => void refetch()}>Retry</button></p>
        : !data?.length ? <Card><EmptyState icon={GraduationCap} title="No classes yet" body="Create a class, add a weekly schedule, then enroll students." /></Card>
        : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.map((c) => (
              <Link key={c.id} to={`/teacher/classes/${c.id}`}>
                <Card className="h-full p-5 transition hover:border-brand/40">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{c.name}</h2>
                    <Badge tone={c.status === 'active' ? 'green' : 'neutral'}>{c.status}</Badge>
                  </div>
                  <p className="text-sm text-ink-muted">{c.subjects?.name ?? 'No subject'}</p>
                  <div className="mt-3 flex gap-2"><Badge tone="blue">{c.class_type}</Badge><Badge tone="violet">{c.enrolled} enrolled</Badge></div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      <Dialog open={adding} onClose={() => setAdding(false)} title="Create class">
        <ClassForm subjects={subjects} busy={save.isPending} onSubmit={(v) => save.mutate(v)} onCancel={() => setAdding(false)} />
      </Dialog>
    </>
  )
}
