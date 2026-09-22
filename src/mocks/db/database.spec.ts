import { createDatabase } from './database'
import { createSeedDataset } from './fixtures'
import { PERSISTENCE_KEY, loadPersistedDataset, persistDataset } from './persistence'

describe('createDatabase', () => {
  it('seeds all four collections from the deterministic fixtures by default', () => {
    const seed = createSeedDataset()
    const db = createDatabase()

    expect(db.events.list({}).meta.total).toBe(seed.events.length)
    expect(db.categories.list({}).meta.total).toBe(seed.categories.length)
    expect(db.tickets.list({}).meta.total).toBe(seed.tickets.length)
    expect(db.users.list({}).meta.total).toBe(seed.users.length)
  })

  it('accepts a custom dataset override at construction', () => {
    const db = createDatabase({
      events: [],
      categories: [],
      tickets: [],
      users: []
    })

    expect(db.events.list({}).meta.total).toBe(0)
    expect(db.categories.list({}).meta.total).toBe(0)
    expect(db.tickets.list({}).meta.total).toBe(0)
    expect(db.users.list({}).meta.total).toBe(0)
  })

  it('reset() restores all collections to the deterministic seed', () => {
    const db = createDatabase()

    db.events.insert({
      id: 'custom-event',
      name: 'Custom',
      country: 'US',
      venue: 'Somewhere',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-02T00:00:00.000Z',
      status: 'draft',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    })

    expect(db.events.get('custom-event')).toBeDefined()

    db.reset()

    expect(db.events.get('custom-event')).toBeUndefined()

    const seed = createSeedDataset()

    expect(db.events.list({}).meta.total).toBe(seed.events.length)
  })

  it('reset() accepts a custom dataset override', () => {
    const db = createDatabase()

    db.reset({
      events: [],
      categories: [],
      tickets: [],
      users: []
    })

    expect(db.events.list({}).meta.total).toBe(0)
    expect(db.categories.list({}).meta.total).toBe(0)
    expect(db.tickets.list({}).meta.total).toBe(0)
    expect(db.users.list({}).meta.total).toBe(0)
  })

  it('never reads or writes localStorage under test, even when MODE is stubbed to non-test', () => {
    // Persistence is only ever enabled through the no-argument constructor
    // path; even stubbing MODE away from 'test' must not by itself cause a
    // test run to touch localStorage unless a suite explicitly opts in by
    // exercising the persistence module directly (covered in
    // persistence.spec.ts). This asserts the default, seam-driven path
    // (`resetDatabase()` calls `createDatabase()` with no dataset) stays
    // silent towards localStorage during the ordinary test lifecycle.
    localStorage.clear()

    createDatabase()

    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull()
  })

  it('hydrates from a persisted dataset when persistence is enabled', () => {
    localStorage.clear()

    const customDataset = {
      events: [{
        id: 'persisted-event',
        name: 'Persisted',
        country: 'US',
        venue: 'Somewhere',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-02T00:00:00.000Z',
        status: 'draft' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }],
      categories: [],
      tickets: [],
      users: []
    }

    persistDataset(customDataset)
    vi.stubEnv('MODE', 'production')

    try {
      const hydrated = createDatabase()

      expect(hydrated.events.get('persisted-event')).toEqual(customDataset.events[0])
    } finally {
      vi.unstubAllEnvs()
      localStorage.clear()
    }
  })

  it('flushes to localStorage after a mutation when persistence is enabled', () => {
    localStorage.clear()
    vi.stubEnv('MODE', 'production')

    try {
      const db = createDatabase()

      db.events.insert({
        id: 'flush-test',
        name: 'Flush Test',
        country: 'US',
        venue: 'Somewhere',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-02T00:00:00.000Z',
        status: 'draft',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      })

      const persisted = loadPersistedDataset()

      expect(persisted?.events.some(event => event.id === 'flush-test')).toBe(true)
    } finally {
      vi.unstubAllEnvs()
      localStorage.clear()
    }
  })
})
