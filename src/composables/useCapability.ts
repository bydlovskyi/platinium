/**
 * Single source of truth for "may the current user do this?" (GitHub issue
 * #37, PRD-007 "Role-based permissions"). The PRD expresses permissions as
 * entity-and-operation pairs rather than a bare admin/viewer flag, so every
 * call site names *what* it's asking about (`'events'`, `'create'`) instead
 * of re-deriving a role comparison itself — this composable is the only
 * place `authStore.user?.role` is read for an authorization decision.
 *
 * Every entity/operation combination happens to reduce to the same
 * admin-vs-viewer answer today (an administrator can do everything, a
 * viewer can do nothing but read), but the shape is deliberate: a future
 * role or a future per-entity exception only ever changes `canDo`'s body,
 * never any of its call sites. Read is implicitly always allowed and is
 * never gated through here.
 */

export type TCapabilityEntity = 'events' | 'categories' | 'tickets'
export type TCapabilityOperation = 'create' | 'update' | 'delete'

/** Entity-and-operation pair shape used wherever a single value (e.g. route meta) is more natural than two separate fields — see `canDo`, which also accepts the pair positionally. */
export interface ICapability {
  entity: TCapabilityEntity
  operation: TCapabilityOperation
}

const CAPABILITY_ENTITIES: TCapabilityEntity[] = ['events', 'categories', 'tickets']
const CAPABILITY_OPERATIONS: TCapabilityOperation[] = ['create', 'update', 'delete']

/**
 * Which roles may perform which entity-and-operation pair. Every pair
 * currently resolves to the same admin-vs-viewer answer, but the table is
 * still keyed by both `entity` and `operation` — not by operation alone —
 * so a future entity-specific exception (e.g. a role that may manage
 * categories but not delete events) only ever changes one entry here,
 * never a call site. Built from the two enumerations above rather than
 * written out by hand so a new `TCapabilityEntity`/`TCapabilityOperation`
 * value can't silently fall through without an explicit entry.
 */
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
