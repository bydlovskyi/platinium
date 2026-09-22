import { createDatabase } from './database'
import type { IEvent } from './types'
import { createSeedDataset } from './fixtures'
import { PERSISTENCE_KEY, loadPersistedDataset, persistDataset } from './persistence'

function anEvent (id: string): IEvent {
  return {
    id,
    name: id,
    country: 'US',
    venue: 'Somewhere',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-01-02T00:00:00.000Z',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

describe('createDatabase', () => {
  it('seeds all three collections from the deterministic fixtures by default', () => {
    const seed = createSeedDataset()
    const db = createDatabase()

    expect(db.events.list({}).meta.total).toBe(seed.events.length)
    expect(db.categories.list({}).meta.total).toBe(seed.categories.length)
    expect(db.tickets.list({}).meta.total).toBe(seed.tickets.length)
  })

  it('accepts a custom dataset override at construction', () => {
    const db = createDatabase({
      events: [],
      categories: [],
      tickets: []
    })

    expect(db.events.list({}).meta.total).toBe(0)
    expect(db.categories.list({}).meta.total).toBe(0)
    expect(db.tickets.list({}).meta.total).toBe(0)
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
      tickets: []
    })

    expect(db.events.list({}).meta.total).toBe(0)
    expect(db.categories.list({}).meta.total).toBe(0)
    expect(db.tickets.list({}).meta.total).toBe(0)
  })

  it('writes nothing to localStorage under test', () => {
    // The default, seam-driven path (`resetDatabase()` calls `createDatabase()`
    // with no dataset) must stay silent towards localStorage during an
    // ordinary test run. The matching read-side case — a persisted dataset
    // present and still ignored — lives in persistence.spec.ts.
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
      tickets: []
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

  it('flushes every mutating operation to localStorage when persistence is enabled', () => {
    localStorage.clear()
    vi.stubEnv('MODE', 'production')

    try {
      const db = createDatabase()

      db.events.insert(anEvent('flush-test'))
      expect(loadPersistedDataset()?.events.some(event => event.id === 'flush-test')).toBe(true)

      db.events.update('flush-test', { name: 'Renamed' })
      expect(loadPersistedDataset()?.events.find(event => event.id === 'flush-test')?.name).toBe('Renamed')

      db.events.remove('flush-test')
      expect(loadPersistedDataset()?.events.some(event => event.id === 'flush-test')).toBe(false)

      db.events.replace([anEvent('replaced')])
      expect(loadPersistedDataset()?.events.map(event => event.id)).toEqual(['replaced'])
    } finally {
      vi.unstubAllEnvs()
      localStorage.clear()
    }
  })

  it('flushes the whole dataset exactly once per reset when persistence is enabled', () => {
    localStorage.clear()
    vi.stubEnv('MODE', 'production')

    try {
      const db = createDatabase()
      const setItem = vi.spyOn(Storage.prototype, 'setItem')

      db.reset({ events: [anEvent('after-reset')], categories: [], tickets: [] })

      expect(setItem).toHaveBeenCalledTimes(1)
      expect(loadPersistedDataset()?.events.map(event => event.id)).toEqual(['after-reset'])

      setItem.mockRestore()
    } finally {
      vi.unstubAllEnvs()
      localStorage.clear()
    }
  })
})
