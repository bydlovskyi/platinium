import { createDatabase } from './database'
import { createSeedDataset } from './fixtures'
import { PERSISTENCE_KEY, PERSISTENCE_VERSION, loadPersistedDataset, persistDataset } from './persistence'
import type { ISeedDataset } from './fixtures'

function emptyDataset (): ISeedDataset {
  return { events: [], categories: [], tickets: [], users: [] }
}

describe('persistDataset / loadPersistedDataset', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a dataset through localStorage under the versioned key', () => {
    const dataset = createSeedDataset()

    persistDataset(dataset)

    expect(localStorage.getItem(PERSISTENCE_KEY)).not.toBeNull()
    expect(loadPersistedDataset()).toEqual(dataset)
  })

  it('returns undefined when nothing has been persisted yet', () => {
    expect(loadPersistedDataset()).toBeUndefined()
  })

  it('discards and returns undefined when the stored version does not match', () => {
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ version: PERSISTENCE_VERSION - 1, dataset: emptyDataset() }))

    expect(loadPersistedDataset()).toBeUndefined()
    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull()
  })

  it('discards and returns undefined when the stored value is malformed JSON', () => {
    localStorage.setItem(PERSISTENCE_KEY, 'not json')

    expect(loadPersistedDataset()).toBeUndefined()
    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull()
  })

  it('discards and returns undefined when the stored value has an unexpected shape', () => {
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ version: PERSISTENCE_VERSION, dataset: { oops: true } }))

    expect(loadPersistedDataset()).toBeUndefined()
    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull()
  })

  it('discards and returns undefined when an event is missing a required field', () => {
    const dataset = createSeedDataset()
    const [firstEvent, ...restEvents] = dataset.events

    if (firstEvent === undefined) {
      throw new Error('expected the seed dataset to contain at least one event')
    }

    const { name, ...eventWithoutName } = firstEvent

    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({
      version: PERSISTENCE_VERSION,
      dataset: { ...dataset, events: [eventWithoutName, ...restEvents] }
    }))

    expect(loadPersistedDataset()).toBeUndefined()
    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull()
  })

  it('discards and returns undefined when a ticket has a required field of the wrong type', () => {
    const dataset = createSeedDataset()
    const [firstTicket, ...restTickets] = dataset.tickets

    if (firstTicket === undefined) {
      throw new Error('expected the seed dataset to contain at least one ticket')
    }

    const ticketWithBadPrice = { ...firstTicket, price: String(firstTicket.price) }

    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({
      version: PERSISTENCE_VERSION,
      dataset: { ...dataset, tickets: [ticketWithBadPrice, ...restTickets] }
    }))

    expect(loadPersistedDataset()).toBeUndefined()
    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull()
  })

  it('discards and returns undefined when a category is missing a required field, triggering reseed', () => {
    const dataset = createSeedDataset()
    const [firstCategory, ...restCategories] = dataset.categories

    if (firstCategory === undefined) {
      throw new Error('expected the seed dataset to contain at least one category')
    }

    const { description, ...categoryWithoutDescription } = firstCategory

    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({
      version: PERSISTENCE_VERSION,
      dataset: { ...dataset, categories: [categoryWithoutDescription, ...restCategories] }
    }))

    expect(loadPersistedDataset()).toBeUndefined()
    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull()

    const db = createDatabase()
    const seed = createSeedDataset()

    expect(db.categories.list({}).meta.total).toBe(seed.categories.length)
  })

  it('discards and returns undefined when a user has a required field of the wrong type', () => {
    const dataset = createSeedDataset()
    const [firstUser, ...restUsers] = dataset.users

    if (firstUser === undefined) {
      throw new Error('expected the seed dataset to contain at least one user')
    }

    const userWithBadSessionActive = { ...firstUser, sessionActive: 'false' }

    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({
      version: PERSISTENCE_VERSION,
      dataset: { ...dataset, users: [userWithBadSessionActive, ...restUsers] }
    }))

    expect(loadPersistedDataset()).toBeUndefined()
    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull()
  })

  it('overwrites a previously persisted dataset', () => {
    persistDataset(createSeedDataset())
    persistDataset(emptyDataset())

    expect(loadPersistedDataset()).toEqual(emptyDataset())
  })
})

describe('createDatabase persistence wiring', () => {
  beforeEach(() => localStorage.clear())

  it('does not read or write localStorage under test, even when a persisted dataset exists', () => {
    persistDataset(emptyDataset())

    const db = createDatabase()

    const seed = createSeedDataset()

    expect(db.events.list({}).meta.total).toBe(seed.events.length)
  })
})
