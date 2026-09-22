/**
 * Public surface of the mock database module. A future MSW handler factory
 * (slice #15) wraps `createCollection`/`IEntityCollection` for every entity
 * and reuses the domain types and query shapes declared here, so filtering
 * behaviour cannot diverge between entities.
 */

export { createCollection } from './collection'
export type { ICollectionOptions, IEntityCollection } from './collection'

export { createDatabase } from './database'
export type { IMockDatabase } from './database'

export { createSeedDataset } from './fixtures'
export type { ISeedDataset } from './fixtures'

export type { IPaginationMeta } from './pagination.types'

export { PERSISTENCE_KEY, PERSISTENCE_VERSION } from './persistence'

export type { IListQuery, IListResult, IRangeFilter } from './query.types'

export type {
  ICategory,
  IEntityBase,
  IEvent,
  IIdentifiable,
  ITicket,
  TCurrency,
  TEntityId,
  TEventStatus,
  TSortOrder,
  TTicketStatus
} from './types'
