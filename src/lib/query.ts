import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/** Throws a real Error if a Supabase response carries an error. */
export function check<T extends { error: { message: string } | null }>(res: T): T {
  if (res.error) throw new Error(res.error.message)
  return res
}

/** Mutation helper: toast on success/failure and refresh the listed query roots. */
export function useAction<V>(fn: (v: V) => Promise<unknown>, invalidate: string[], okMsg?: string, onDone?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidate.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }))
      if (okMsg) toast.success(okMsg)
      onDone?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
