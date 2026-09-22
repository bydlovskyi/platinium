import { applyListQuery } from './list-query'

interface IWidget {
  id: string
  name: string
  description: string
  price: number
  releasedAt: string
}

const widgets: IWidget[] = [
  { id: 'a', name: 'Anvil', description: 'Heavy duty steel anvil', price: 300, releasedAt: '2024-01-01' },
  { id: 'b', name: 'Bolt', description: 'Small fastener', price: 10, releasedAt: '2024-02-01' },
  { id: 'c', name: 'Crate', description: 'Wooden shipping crate', price: 50, releasedAt: '2024-03-01' },
  { id: 'd', name: 'Dolly', description: 'Anvil transport dolly', price: 75, releasedAt: '2024-04-01' },
  { id: 'e', name: 'Eyebolt', description: 'Threaded eyebolt', price: 10, releasedAt: '2024-05-01' }
]

const SEARCHABLE_FIELDS: (keyof IWidget)[] = ['name', 'description']

describe('applyListQuery', () => {
  describe('search', () => {
    it('matches a free-text term across the declared searchable fields, case-insensitively', () => {
      const result = applyListQuery(widgets, { search: 'anvil' }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['a', 'd'])
    })

    it('returns everything when search is empty or omitted', () => {
      const result = applyListQuery(widgets, { search: '' }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data).toHaveLength(widgets.length)
    })

    it('returns nothing when no field matches the term', () => {
      const result = applyListQuery(widgets, { search: 'nonexistent' }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data).toEqual([])
    })
  })

  describe('equality filters', () => {
    it('filters records where the field strictly equals the given value', () => {
      const result = applyListQuery(widgets, { equals: { price: 10 } }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['b', 'e'])
    })

    it('supports equality on string fields', () => {
      const result = applyListQuery(widgets, { equals: { name: 'Crate' } }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['c'])
    })

    it('combines multiple equality filters with AND semantics', () => {
      const result = applyListQuery(
        widgets,
        { equals: { price: 10, name: 'Bolt' } },
        { searchableFields: SEARCHABLE_FIELDS }
      )

      expect(result.data.map(w => w.id)).toEqual(['b'])
    })
  })

  describe('range filters', () => {
    it('filters records within an inclusive numeric [min, max] range', () => {
      const result = applyListQuery(
        widgets,
        { range: { price: { min: 10, max: 50 } } },
        { searchableFields: SEARCHABLE_FIELDS }
      )

      expect(result.data.map(w => w.id)).toEqual(['b', 'c', 'e'])
    })

    it('supports an open-ended lower bound', () => {
      const result = applyListQuery(
        widgets,
        { range: { price: { max: 50 } } },
        { searchableFields: SEARCHABLE_FIELDS }
      )

      expect(result.data.map(w => w.id)).toEqual(['b', 'c', 'e'])
    })

    it('supports an open-ended upper bound', () => {
      const result = applyListQuery(
        widgets,
        { range: { price: { min: 75 } } },
        { searchableFields: SEARCHABLE_FIELDS }
      )

      expect(result.data.map(w => w.id)).toEqual(['a', 'd'])
    })

    it('supports range filters on ISO date strings', () => {
      const result = applyListQuery(
        widgets,
        { range: { releasedAt: { min: '2024-02-01', max: '2024-04-01' } } },
        { searchableFields: SEARCHABLE_FIELDS }
      )

      expect(result.data.map(w => w.id)).toEqual(['b', 'c', 'd'])
    })
  })

  describe('sorting', () => {
    it('sorts ascending by a given field', () => {
      const result = applyListQuery(widgets, { sort: 'price', order: 'asc' }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['b', 'e', 'c', 'd', 'a'])
    })

    it('sorts descending by a given field', () => {
      const result = applyListQuery(
        widgets,
        { sort: 'price', order: 'desc' },
        { searchableFields: SEARCHABLE_FIELDS }
      )

      expect(result.data.map(w => w.id)).toEqual(['a', 'd', 'c', 'b', 'e'])
    })

    it('breaks ties deterministically by id ascending, holding a consistent order across pages', () => {
      const resultPage1 = applyListQuery(
        widgets,
        { sort: 'price', order: 'asc', page: 1, perPage: 1 },
        { searchableFields: SEARCHABLE_FIELDS }
      )
      const resultPage2 = applyListQuery(
        widgets,
        { sort: 'price', order: 'asc', page: 2, perPage: 1 },
        { searchableFields: SEARCHABLE_FIELDS }
      )

      // price=10 is tied between 'b' and 'e' — id tiebreak keeps 'b' before 'e'.
      expect(resultPage1.data.map(w => w.id)).toEqual(['b'])
      expect(resultPage2.data.map(w => w.id)).toEqual(['e'])
    })

    it('defaults to id-ascending order when no sort field is given', () => {
      const result = applyListQuery(widgets, {}, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    })
  })

  describe('pagination', () => {
    it('returns the first page with correct meta', () => {
      const result = applyListQuery(widgets, { page: 1, perPage: 2 }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['a', 'b'])
      expect(result.meta).toEqual({ page: 1, perPage: 2, total: 5, totalPages: 3 })
    })

    it('returns the last page, which may be partial, with correct meta', () => {
      const result = applyListQuery(widgets, { page: 3, perPage: 2 }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['e'])
      expect(result.meta).toEqual({ page: 3, perPage: 2, total: 5, totalPages: 3 })
    })

    it('returns an empty page with correct meta when the page is out of range', () => {
      const result = applyListQuery(widgets, { page: 10, perPage: 2 }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data).toEqual([])
      expect(result.meta).toEqual({ page: 10, perPage: 2, total: 5, totalPages: 3 })
    })

    it('defaults page to 1 and perPage to 20 when omitted', () => {
      const result = applyListQuery(widgets, {}, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.meta).toEqual({ page: 1, perPage: 20, total: 5, totalPages: 1 })
    })

    it('reports totalPages as 0 when there are no matching records', () => {
      const result = applyListQuery(widgets, { search: 'nonexistent' }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.meta).toEqual({ page: 1, perPage: 20, total: 0, totalPages: 0 })
    })

    it('clamps a negative page to 1 instead of returning a wrapped-around slice', () => {
      const result = applyListQuery(widgets, { page: -1, perPage: 2 }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['a', 'b'])
      expect(result.meta).toEqual({ page: 1, perPage: 2, total: 5, totalPages: 3 })
    })

    it('clamps a zero page to 1 instead of returning a wrapped-around slice', () => {
      const result = applyListQuery(widgets, { page: 0, perPage: 2 }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['a', 'b'])
      expect(result.meta).toEqual({ page: 1, perPage: 2, total: 5, totalPages: 3 })
    })

    it('clamps a zero perPage to 1 instead of producing an Infinity/null totalPages', () => {
      const result = applyListQuery(widgets, { page: 1, perPage: 0 }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['a'])
      expect(result.meta).toEqual({ page: 1, perPage: 1, total: 5, totalPages: 5 })
      expect(Number.isFinite(result.meta.totalPages)).toBe(true)
    })

    it('clamps a negative perPage to 1 instead of producing a negative totalPages', () => {
      const result = applyListQuery(widgets, { page: 1, perPage: -5 }, { searchableFields: SEARCHABLE_FIELDS })

      expect(result.data.map(w => w.id)).toEqual(['a'])
      expect(result.meta).toEqual({ page: 1, perPage: 1, total: 5, totalPages: 5 })
      expect(Number.isFinite(result.meta.totalPages)).toBe(true)
    })
  })

  describe('combined query', () => {
    it('applies search, filters, sort and pagination together', () => {
      const result = applyListQuery(
        widgets,
        {
          equals: {},
          range: { price: { min: 10 } },
          sort: 'price',
          order: 'desc',
          page: 1,
          perPage: 2
        },
        { searchableFields: SEARCHABLE_FIELDS }
      )

      expect(result.data.map(w => w.id)).toEqual(['a', 'd'])
      expect(result.meta).toEqual({ page: 1, perPage: 2, total: 5, totalPages: 3 })
    })
  })
})
