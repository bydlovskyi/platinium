export type TCapabilityEntity = 'events' | 'categories' | 'tickets'
export type TCapabilityOperation = 'create' | 'update' | 'delete'

export interface ICapability {
  entity: TCapabilityEntity
  operation: TCapabilityOperation
}

const CAPABILITY_ENTITIES: TCapabilityEntity[] = ['events', 'categories', 'tickets']
const CAPABILITY_OPERATIONS: TCapabilityOperation[] = ['create', 'update', 'delete']

// Keyed by entity and operation (not just role) so per-entity exceptions change one entry, not call sites.
const CAPABILITY_ROLES: Record<TCapabilityEntity, Record<TCapabilityOperation, TUserRole[]>> = Object.fromEntries(
  CAPABILITY_ENTITIES.map(entity => [
    entity,
    Object.fromEntries(CAPABILITY_OPERATIONS.map(operation => [operation, ['admin'] as TUserRole[]]))
  ])
) as Record<TCapabilityEntity, Record<TCapabilityOperation, TUserRole[]>>

export function useCapability () {
  const authStore = useAuthStore()

  const role = computed<TUserRole | undefined>(() => authStore.user?.role)

  function canDo (entity: TCapabilityEntity, operation: TCapabilityOperation): boolean {
    if (role.value === undefined) {
      return false
    }

    return CAPABILITY_ROLES[entity][operation].includes(role.value)
  }

  return {
    role,
    canDo
  }
}
