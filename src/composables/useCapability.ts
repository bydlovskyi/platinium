export type TCapabilityEntity = 'events' | 'categories' | 'tickets'
export type TCapabilityOperation = 'create' | 'update' | 'delete'

export interface ICapability {
  entity: TCapabilityEntity
  operation: TCapabilityOperation
}

const WRITE_ROLES: TUserRole[] = ['admin']

// Keyed by entity and operation (not just role) so a per-entity exception changes one entry, not call sites.
const CAPABILITY_ROLES: Record<TCapabilityEntity, Record<TCapabilityOperation, TUserRole[]>> = {
  events: { create: WRITE_ROLES, update: WRITE_ROLES, delete: WRITE_ROLES },
  categories: { create: WRITE_ROLES, update: WRITE_ROLES, delete: WRITE_ROLES },
  tickets: { create: WRITE_ROLES, update: WRITE_ROLES, delete: WRITE_ROLES }
}

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
