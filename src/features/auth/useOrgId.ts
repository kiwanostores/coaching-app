import { useAuth } from './AuthProvider'

export function useOrgId(): string {
  const { membership } = useAuth()
  if (!membership) throw new Error('No organization membership')
  return membership.organizationId
}
