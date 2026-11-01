import { Hammer } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'

/** Honest placeholder for screens that belong to a later phase. */
export default function Pending({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
      <Card><EmptyState icon={Hammer} title="Not built yet" body={`This screen is planned for Phase ${phase}.`} /></Card>
    </>
  )
}
