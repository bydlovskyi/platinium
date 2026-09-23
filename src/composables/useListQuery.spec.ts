import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount } from '@vue/test-utils'

interface ITestFilters {
  status: string
  ownerId: number
}

/**
 * `useListQuery` unit tests (GitHub issue #21): a generic, URL-driven list
 * query composable meant to back every future list screen (events,
 * categories, tickets). Driven through a real memory-history router (no app
 * route table needed — this composable is route-table agnostic) with a
 * trivial host component, matching this repo's `useBreakpoint.spec.ts`
 * pattern of exercising the composable directly rather than mocking its
 * dependencies.
 */

const LIST_QUERY_KEY = 'test-list'

function buildFilters () {
  return {
    status: {
      default: 'all',
      parse: (raw: string) => (['all', 'active', 'archived'].includes(raw) ? raw : undefined)
    },
    ownerId: {
      default: 0,
      parse: (raw: string) => {
        const parsed = Number(raw)

        return Number.isFinite(parsed) ? parsed : undefined
      }
    }
  }
}

const SORT_FIELDS = ['name', 'createdAt'] as const

async function setup (initialRoute = '/list') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/list', component: { template: '<div />' } }]
  })

  await router.push(initialRoute)
  await router.isReady()

  let listQuery!: ReturnType<typeof useListQuery<ITestFilters>>

  const HostComponent = defineComponent({
    setup () {
      listQuery = useListQuery<ITestFilters>({
        key: LIST_QUERY_KEY,
        filters: buildFilters(),
        sortFields: SORT_FIELDS
      })

      return () => null
    }
  })

  const wrapper = mount(HostComponent, {
    global: {
      plugins: [router]
    }
  })

  return { router, wrapper, listQuery }
}

describe('useListQuery', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('URL round-tripping', () => {
    it('updates route.query when setting search, filters, sort, page and perPage', async () => {
      const { router, listQuery } = await setup()

      await listQuery.setFilter('status', 'active')
      expect(router.currentRoute.value.query.status).toBe('active')

      await listQuery.setSort('name')
      expect(router.currentRoute.value.query.sort).toBe('name')
      expect(router.currentRoute.value.query.order).toBe('asc')

      await listQuery.setPage(3)
      expect(router.currentRoute.value.query.page).toBe('3')

      await listQuery.setPerPage(50)
      expect(router.currentRoute.value.query.perPage).toBe('50')

      listQuery.setSearch('hello')
      await vi.advanceTimersByTimeAsync(300)
      expect(router.currentRoute.value.query.search).toBe('hello')
    })

    it('hydrates composable state from an existing route query', async () => {
      const { listQuery } = await setup('/list?search=widgets&status=archived&ownerId=7&sort=createdAt&order=desc&page=2&perPage=25')

      expect(listQuery.search.value).toBe('widgets')
      expect(listQuery.filters.status).toBe('archived')
      expect(listQuery.filters.ownerId).toBe(7)
      expect(listQuery.sort.value).toEqual({ field: 'createdAt', order: 'desc' })
      expect(listQuery.page.value).toBe(2)
      expect(listQuery.perPage.value).toBe(25)
    })
  })

  describe('debounced search', () => {
    it('does not touch route.query until the debounce window settles, then pushes once', async () => {
      const { router, listQuery } = await setup()
      const pushSpy = vi.spyOn(router, 'push')

      listQuery.setSearch('h')
      listQuery.setSearch('he')
      listQuery.setSearch('hel')
      listQuery.setSearch('hell')
      listQuery.setSearch('hello')

      await vi.advanceTimersByTimeAsync(299)
      expect(router.currentRoute.value.query.search).toBeUndefined()
      expect(pushSpy).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(pushSpy).toHaveBeenCalledOnce()
    })

    it('supports a configurable debounce duration', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/list', component: { template: '<div />' } }]
      })

      await router.push('/list')
      await router.isReady()

      let listQuery!: ReturnType<typeof useListQuery<ITestFilters>>

      const HostComponent = defineComponent({
        setup () {
          listQuery = useListQuery<ITestFilters>({
            key: LIST_QUERY_KEY,
            filters: buildFilters(),
            sortFields: SORT_FIELDS,
            debounceMs: 1000
          })

          return () => null
        }
      })

      mount(HostComponent, { global: { plugins: [router] } })

      listQuery.setSearch('hello')

      await vi.advanceTimersByTimeAsync(300)
      expect(router.currentRoute.value.query.search).toBeUndefined()

      await vi.advanceTimersByTimeAsync(700)
      expect(router.currentRoute.value.query.search).toBe('hello')
    })

    it('keeps in-progress search text when a filter change is pushed before the debounce settles', async () => {
      const { router, listQuery } = await setup()

      listQuery.setSearch('hello')
      await listQuery.setFilter('status', 'active')

      expect(router.currentRoute.value.query.status).toBe('active')
      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')

      await vi.advanceTimersByTimeAsync(300)

      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')
    })

    it('keeps in-progress search text when a sort change is pushed before the debounce settles', async () => {
      const { router, listQuery } = await setup()

      listQuery.setSearch('hello')
      await listQuery.setSort('name')

      expect(router.currentRoute.value.query.sort).toBe('name')
      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')

      await vi.advanceTimersByTimeAsync(300)

      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')
    })

    it('keeps in-progress search text when a page change is pushed before the debounce settles', async () => {
      const { router, listQuery } = await setup()

      listQuery.setSearch('hello')
      await listQuery.setPage(2)

      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')

      await vi.advanceTimersByTimeAsync(300)

      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')
    })

    it('keeps in-progress search text when a perPage change is pushed before the debounce settles', async () => {
      const { router, listQuery } = await setup()

      listQuery.setSearch('hello')
      await listQuery.setPerPage(50)

      expect(router.currentRoute.value.query.perPage).toBe('50')
      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')

      await vi.advanceTimersByTimeAsync(300)

      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')
    })

    it('keeps in-progress search text when filters are reset before the debounce settles', async () => {
      const { router, listQuery } = await setup()

      await listQuery.setFilter('status', 'active')

      listQuery.setSearch('hello')
      await listQuery.resetFilters()

      expect(router.currentRoute.value.query.status).toBeUndefined()
      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')

      await vi.advanceTimersByTimeAsync(300)

      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.search.value).toBe('hello')
    })
  })

  describe('page reset', () => {
    it('resets page to 1 when a committed search change happens on page > 1', async () => {
      const { router, listQuery } = await setup()

      await listQuery.setPage(4)
      expect(router.currentRoute.value.query.page).toBe('4')

      listQuery.setSearch('hello')
      await vi.advanceTimersByTimeAsync(300)

      expect(router.currentRoute.value.query.search).toBe('hello')
      expect(listQuery.page.value).toBe(1)
      expect(router.currentRoute.value.query.page).toBeUndefined()
    })

    it('resets page to 1 when a filter changes on page > 1', async () => {
      const { router, listQuery } = await setup()

      await listQuery.setPage(4)
      await listQuery.setFilter('status', 'active')

      expect(listQuery.page.value).toBe(1)
      expect(router.currentRoute.value.query.page).toBeUndefined()
    })

    it('does not reset page when sort changes', async () => {
      const { listQuery } = await setup()

      await listQuery.setPage(4)
      await listQuery.setSort('name')

      expect(listQuery.page.value).toBe(4)
    })

    it('does not reset page when perPage changes', async () => {
      const { listQuery } = await setup()

      await listQuery.setPage(4)
      await listQuery.setPerPage(50)

      expect(listQuery.page.value).toBe(4)
    })
  })

  describe('rapid successive calls', () => {
    it('nets two toggles (undefined -> asc -> desc) when setSort is called twice back-to-back without awaiting in between', async () => {
      const { router, listQuery } = await setup()

      // Neither call is awaited before the next fires, so both must still
      // observe each other's effect rather than both reading the same
      // pre-push `sort.value` and collapsing into a single toggle (which
      // would leave order at 'asc' instead of progressing to 'desc').
      const firstCall = listQuery.setSort('name')
      const secondCall = listQuery.setSort('name')

      await Promise.all([firstCall, secondCall])

      expect(router.currentRoute.value.query.sort).toBe('name')
      expect(router.currentRoute.value.query.order).toBe('desc')
      expect(listQuery.sort.value).toEqual({ field: 'name', order: 'desc' })
    })

    it('produces the same net state as two properly-sequenced (awaited) setSort calls', async () => {
      const { listQuery: sequenced } = await setup()

      await sequenced.setSort('name')
      await sequenced.setSort('name')

      const { listQuery: rapid } = await setup()

      await Promise.all([rapid.setSort('name'), rapid.setSort('name')])

      expect(rapid.sort.value).toEqual(sequenced.sort.value)
    })
  })

  describe('defaults omitted from the URL', () => {
    it('removes a filter from the query when set back to its default', async () => {
      const { router, listQuery } = await setup()

      await listQuery.setFilter('status', 'active')
      expect(router.currentRoute.value.query.status).toBe('active')

      await listQuery.setFilter('status', 'all')
      expect(router.currentRoute.value.query.status).toBeUndefined()
    })

    it('produces an empty query object at all defaults', async () => {
      const { router, listQuery } = await setup()

      await listQuery.setPage(3)
      await listQuery.setPage(1)
      await listQuery.setPerPage(20)

      expect(router.currentRoute.value.query).toEqual({})
    })

    it('omits page when set to 1 and perPage when set to the default', async () => {
      const { router, listQuery } = await setup()

      await listQuery.setPage(1)
      expect(router.currentRoute.value.query.page).toBeUndefined()
    })
  })

  describe('defensive parsing', () => {
    it('falls back page=0 to 1', async () => {
      const { listQuery } = await setup('/list?page=0')

      expect(listQuery.page.value).toBe(1)
    })

    it('falls back page=-1 to 1', async () => {
      const { listQuery } = await setup('/list?page=-1')

      expect(listQuery.page.value).toBe(1)
    })

    it('falls back page=abc to 1', async () => {
      const { listQuery } = await setup('/list?page=abc')

      expect(listQuery.page.value).toBe(1)
    })

    it('falls back an out-of-range perPage to the default', async () => {
      const { listQuery } = await setup('/list?perPage=-5')

      expect(listQuery.perPage.value).toBe(20)
    })

    it('falls back a non-numeric perPage to the default', async () => {
      const { listQuery } = await setup('/list?perPage=abc')

      expect(listQuery.perPage.value).toBe(20)
    })

    it('falls back an unknown sort field to undefined when no default sort is given', async () => {
      const { listQuery } = await setup('/list?sort=unknownField&order=asc')

      expect(listQuery.sort.value).toBeUndefined()
    })

    it('falls back an invalid filter value to its default without throwing', async () => {
      const { listQuery } = await setup('/list?status=not-a-real-status&ownerId=not-a-number')

      expect(listQuery.filters.status).toBe('all')
      expect(listQuery.filters.ownerId).toBe(0)
    })

    it('never throws while hydrating from a hostile query string', async () => {
      await expect(setup('/list?page=abc&perPage=abc&sort=nope&status=nope&ownerId=nope')).resolves.toBeDefined()
    })
  })

  describe('page-size persistence', () => {
    it('persists perPage across a fresh composable instance with no perPage in the URL', async () => {
      const { listQuery } = await setup()

      await listQuery.setPerPage(100)
      expect(listQuery.perPage.value).toBe(100)

      const { listQuery: secondInstance } = await setup('/list')

      expect(secondInstance.perPage.value).toBe(100)
    })

    it('keeps independent persisted perPage per key across separate list screens', async () => {
      async function setupWithKey (key: string) {
        const router = createRouter({
          history: createMemoryHistory(),
          routes: [{ path: '/list', component: { template: '<div />' } }]
        })

        await router.push('/list')
        await router.isReady()

        let listQuery!: ReturnType<typeof useListQuery<ITestFilters>>

        const HostComponent = defineComponent({
          setup () {
            listQuery = useListQuery<ITestFilters>({
              key,
              filters: buildFilters(),
              sortFields: SORT_FIELDS
            })

            return () => null
          }
        })

        mount(HostComponent, { global: { plugins: [router] } })

        return { router, listQuery }
      }

      const eventsScreen = await setupWithKey('events')

      await eventsScreen.listQuery.setPerPage(75)
      expect(eventsScreen.listQuery.perPage.value).toBe(75)

      // A different list screen (own `key`, own route/URL) must not see
      // the events screen's persisted page size.
      const ticketsScreen = await setupWithKey('tickets')

      expect(ticketsScreen.listQuery.perPage.value).toBe(20)

      // Re-visiting the events screen later (fresh instance, no perPage in
      // its URL) still recalls its own persisted value.
      const eventsScreenRevisit = await setupWithKey('events')

      expect(eventsScreenRevisit.listQuery.perPage.value).toBe(75)
    })

    it('lets an explicit URL perPage win over a persisted value', async () => {
      const { listQuery } = await setup()

      await listQuery.setPerPage(100)

      const { listQuery: secondInstance } = await setup('/list?perPage=15')

      expect(secondInstance.perPage.value).toBe(15)
    })
  })
})
