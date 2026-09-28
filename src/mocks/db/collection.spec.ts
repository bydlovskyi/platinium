import { createCollection } from './collection'

interface IWidget {
  id: string
  name: string
  price: number
}

function seedWidgets (): IWidget[] {
  return [
    { id: 'a', name: 'Anvil', price: 300 },
    { id: 'b', name: 'Bolt', price: 10 }
  ]
}

describe('createCollection', () => {
  it('lists all seeded records through the query engine', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    const result = collection.list({})

    expect(result.data.map(w => w.id)).toEqual(['a', 'b'])
    expect(result.meta.total).toBe(2)
  })

  it('gets a record by id', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    expect(collection.get('a')).toEqual({ id: 'a', name: 'Anvil', price: 300 })
  })

  it('returns undefined when getting an unknown id', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    expect(collection.get('unknown')).toBeUndefined()
  })

  it('inserts a new record and makes it immediately listable', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    collection.insert({ id: 'c', name: 'Crate', price: 50 })

    expect(collection.get('c')).toEqual({ id: 'c', name: 'Crate', price: 50 })
    expect(collection.list({}).meta.total).toBe(3)
  })

  it('throws on inserting a duplicate id and leaves the existing record untouched', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    expect(() => collection.insert({ id: 'a', name: 'Impostor', price: 1 })).toThrow(/already exists/)
    expect(collection.get('a')).toEqual({ id: 'a', name: 'Anvil', price: 300 })
    expect(collection.list({}).meta.total).toBe(2)
  })

  it('updates an existing record by id, merging the given fields', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    const updated = collection.update('a', { price: 999 })

    expect(updated).toEqual({ id: 'a', name: 'Anvil', price: 999 })
    expect(collection.get('a')).toEqual({ id: 'a', name: 'Anvil', price: 999 })
  })

  it('returns undefined when updating an unknown id, without inserting it', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    const updated = collection.update('unknown', { price: 1 })

    expect(updated).toBeUndefined()
    expect(collection.list({}).meta.total).toBe(2)
  })

  it('removes a record by id and reports whether it existed', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    expect(collection.remove('a')).toBe(true)
    expect(collection.get('a')).toBeUndefined()
    expect(collection.list({}).meta.total).toBe(1)
  })

  it('returns false when removing an unknown id', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    expect(collection.remove('unknown')).toBe(false)
  })

  it('replace() swaps the entire underlying dataset', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    collection.replace([{ id: 'z', name: 'Zipper', price: 5 }])

    expect(collection.list({}).data.map(w => w.id)).toEqual(['z'])
  })

  it('does not mutate the array passed in at construction', () => {
    const initial = seedWidgets()
    const collection = createCollection<IWidget>({ initialRecords: initial, searchableFields: ['name'] })

    collection.insert({ id: 'c', name: 'Crate', price: 50 })

    expect(initial).toHaveLength(2)
  })

  it('mutating a record returned by get() does not affect a subsequent get()', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    const fetched = collection.get('a')

    if (fetched === undefined) {
      throw new Error('expected record "a" to exist')
    }

    fetched.price = 999999

    expect(collection.get('a')).toEqual({ id: 'a', name: 'Anvil', price: 300 })
  })

  it('mutating a record returned by list() does not affect a subsequent list()', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    const fetched = collection.list({}).data[0]

    if (fetched === undefined) {
      throw new Error('expected at least one listed record')
    }

    fetched.price = 999999

    expect(collection.list({}).data[0]).toEqual({ id: 'a', name: 'Anvil', price: 300 })
  })

  it('mutating a record returned by insert() does not affect what is stored', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    const inserted = collection.insert({ id: 'c', name: 'Crate', price: 50 })

    inserted.price = 999999

    expect(collection.get('c')).toEqual({ id: 'c', name: 'Crate', price: 50 })
  })

  it('mutating a record returned by update() does not affect what is stored', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    const updated = collection.update('a', { price: 999 })

    if (updated === undefined) {
      throw new Error('expected update of "a" to succeed')
    }

    updated.price = 111111

    expect(collection.get('a')).toEqual({ id: 'a', name: 'Anvil', price: 999 })
  })

  it('mutating the record passed to insert() does not affect what is stored', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })
    const input = { id: 'c', name: 'Crate', price: 50 }

    collection.insert(input)
    input.price = 999999

    expect(collection.get('c')).toEqual({ id: 'c', name: 'Crate', price: 50 })
  })

  it('mutating a record passed to replace() does not affect what is stored', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })
    const replacement = [{ id: 'z', name: 'Zipline', price: 20 }]

    collection.replace(replacement)
    const [record] = replacement

    if (record === undefined) {
      throw new Error('expected a replacement record')
    }

    record.price = 999999

    expect(collection.get('z')).toEqual({ id: 'z', name: 'Zipline', price: 20 })
  })

  it('mutating a record from the initialRecords array does not affect what is stored', () => {
    const initialRecords = seedWidgets()
    const collection = createCollection<IWidget>({ initialRecords, searchableFields: ['name'] })
    const [record] = initialRecords

    if (record === undefined) {
      throw new Error('expected a seeded record')
    }

    record.price = 999999

    expect(collection.get('a')).toEqual({ id: 'a', name: 'Anvil', price: 300 })
  })

  it('ignores undefined patch fields rather than erasing the stored value', () => {
    const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name'] })

    collection.update('a', { name: undefined, price: 250 })

    expect(collection.get('a')).toEqual({ id: 'a', name: 'Anvil', price: 250 })
  })
})
