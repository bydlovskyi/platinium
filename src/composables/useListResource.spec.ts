import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

interface ITestItem {
  id: number
  name: string
}

interface ITestQuery {
  page: number
}

interface IDeferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

/**
 * `useListResource` unit tests (GitHub issue #22): binds a reactive list
 * query to an entity fetcher, refetching on change while guarding against
 * the classic fast-typing-administrator race — a superseded request must
 * never overwrite state set by a newer one. Driven through a trivial host
 * component (matching `useListQuery.spec.ts`) since `useAbortController`
 * registers an `onUnmounted` hook and needs a real component instance. The
 * fetcher itself is a hand-rolled deferred-promise stub so each test
 * controls resolve/reject order explicitly instead of racing real timers.
 */

function buildPaginationMeta (overrides: Partial<TPaginationMeta> = {}): TPaginationMeta {
  return { page: 1, perPage: 20, total: 0, totalPages: 1, ...overrides }
}

function deferred<T> (): IDeferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function buildAbortError (): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

async function setup (
  initialQuery: ITestQuery,
  fetcher: (query: ITestQuery, signal: AbortSignal) => Promise<{ data: ITestItem[]; meta: TPaginationMeta }>
) {
  const query = ref<ITestQuery>(initialQuery)

  let listResource!: ReturnType<typeof useListResource<ITestQuery, ITestItem>>

  const HostComponent = defineComponent({
    setup () {
      listResource = useListResource<ITestQuery, ITestItem>(query, fetcher)

      return () => null
    }
  })

  const wrapper = mount(HostComponent)

  await flushPromises()

  return { query, wrapper, listResource }
}

async function flushPromises (): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('useListResource', () => {
  it('refetches when the query changes', async () => {
    const calls: ITestQuery[] = []

    const { query } = await setup({ page: 1 }, (currentQuery) => {
      calls.push(currentQuery)

      return Promise.resolve({ data: [{ id: currentQuery.page, name: `item-${currentQuery.page}` }], meta: buildPaginationMeta({ page: currentQuery.page }) })
    })

    expect(calls).toEqual([{ page: 1 }])

    query.value = { page: 2 }
    await flushPromises()

    expect(calls).toEqual([{ page: 1 }, { page: 2 }])
  })

  it('aborts a superseded request and its late resolution does not overwrite newer state', async () => {
    const firstRequest = deferred<{ data: ITestItem[]; meta: TPaginationMeta }>()
    const secondRequest = deferred<{ data: ITestItem[]; meta: TPaginationMeta }>()

    const requests: IDeferred<{ data: ITestItem[]; meta: TPaginationMeta }>[] = [firstRequest, secondRequest]
    let callIndex = 0
    const signals: AbortSignal[] = []

    const { query, listResource } = await setup({ page: 1 }, async (_currentQuery, signal) => {
      signals.push(signal)

      return requests[callIndex++]!.promise
    })

    query.value = { page: 2 }
    await flushPromises()

    expect(signals).toHaveLength(2)
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)

    // Newer request settles first.
    secondRequest.resolve({ data: [{ id: 2, name: 'page-2' }], meta: buildPaginationMeta({ page: 2 }) })
    await flushPromises()

    expect(listResource.data.value).toEqual([{ id: 2, name: 'page-2' }])
    expect(listResource.meta.value).toEqual(buildPaginationMeta({ page: 2 }))

    // The superseded (older) request resolves late, simulating a real abort
    // signal rejecting it — it must not overwrite the newer state above.
    firstRequest.reject(buildAbortError())
    await flushPromises()

    expect(listResource.data.value).toEqual([{ id: 2, name: 'page-2' }])
    expect(listResource.meta.value).toEqual(buildPaginationMeta({ page: 2 }))
    expect(listResource.error.value).toBeUndefined()
    expect(listResource.loading.value).toBe(false)
  })

  it('sets error state on a non-abort fetch rejection', async () => {
    const failure = new Error('network down')

    const { listResource } = await setup({ page: 1 }, () => Promise.reject(failure))

    expect(listResource.error.value).toBe(failure)
    expect(listResource.loading.value).toBe(false)
    expect(listResource.data.value).toEqual([])
  })

  it('refetch after an error clears the error and can succeed', async () => {
    let shouldFail = true

    const { listResource } = await setup({ page: 1 }, (currentQuery) => {
      if (shouldFail) {
        return Promise.reject(new Error('network down'))
      }

      return Promise.resolve({ data: [{ id: currentQuery.page, name: 'ok' }], meta: buildPaginationMeta() })
    })

    expect(listResource.error.value).toBeInstanceOf(Error)

    shouldFail = false
    const refetchPromise = listResource.refetch()

    // `error` is cleared synchronously as part of calling `refetch`, before
    // the retried fetch even settles.
    expect(listResource.error.value).toBeUndefined()

    await refetchPromise

    expect(listResource.error.value).toBeUndefined()
    expect(listResource.data.value).toEqual([{ id: 1, name: 'ok' }])
  })

  it('produces no error state for an aborted request', async () => {
    const firstRequest = deferred<{ data: ITestItem[]; meta: TPaginationMeta }>()

    const { query, listResource } = await setup({ page: 1 }, async (currentQuery) => {
      if (currentQuery.page === 1) {
        return firstRequest.promise
      }

      return { data: [{ id: 2, name: 'page-2' }], meta: buildPaginationMeta({ page: 2 }) }
    })

    query.value = { page: 2 }
    await flushPromises()

    firstRequest.reject(buildAbortError())
    await flushPromises()

    expect(listResource.error.value).toBeUndefined()
  })

  it('keeps previous data visible while a new page loads, toggling only loading', async () => {
    const secondRequest = deferred<{ data: ITestItem[]; meta: TPaginationMeta }>()
    let callIndex = 0

    const { query, listResource } = await setup({ page: 1 }, async () => {
      callIndex++

      if (callIndex === 1) {
        return { data: [{ id: 1, name: 'page-1' }], meta: buildPaginationMeta({ page: 1 }) }
      }

      return secondRequest.promise
    })

    expect(listResource.data.value).toEqual([{ id: 1, name: 'page-1' }])
    expect(listResource.loading.value).toBe(false)

    query.value = { page: 2 }
    await flushPromises()

    // The second page's fetch is in flight: loading is true, but the first
    // page's data must remain visible rather than being cleared to `[]`.
    expect(listResource.loading.value).toBe(true)
    expect(listResource.data.value).toEqual([{ id: 1, name: 'page-1' }])

    secondRequest.resolve({ data: [{ id: 2, name: 'page-2' }], meta: buildPaginationMeta({ page: 2 }) })
    await flushPromises()

    expect(listResource.loading.value).toBe(false)
    expect(listResource.data.value).toEqual([{ id: 2, name: 'page-2' }])
  })
})
