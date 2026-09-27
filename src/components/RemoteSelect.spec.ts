import { mount, flushPromises } from '@vue/test-utils'

import RemoteSelect from './RemoteSelect.vue'

interface IOption {
  id: string
  name: string
}

const PER_PAGE = 2

const ALL_OPTIONS: IOption[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Bravo' },
  { id: '3', name: 'Charlie' },
  { id: '4', name: 'Delta' }
]

interface IPage { data: IOption[]; meta: TPaginationMeta }

function paginate (search: string, page: number): IPage {
  const filtered = search
    ? ALL_OPTIONS.filter(option => option.name.toLowerCase().includes(search.toLowerCase()))
    : ALL_OPTIONS
  const start = (page - 1) * PER_PAGE
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))

  return {
    data: filtered.slice(start, start + PER_PAGE),
    meta: { page, perPage: PER_PAGE, total: filtered.length, totalPages }
  }
}

function createDeferred<T> () {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function mountRemoteSelect (options: {
  modelValue?: string
  fetchOptions?: (params: { search: string; page: number }) => Promise<IPage>
} = {}) {
  function defaultFetchOptions (params: { search: string; page: number }) {
    return Promise.resolve(paginate(params.search, params.page))
  }

  const fetchOptions = vi.fn(options.fetchOptions ?? defaultFetchOptions)
  const resolveOption = vi.fn((value: string) => {
    const found = ALL_OPTIONS.find(option => option.id === value)

    return found ? Promise.resolve(found) : Promise.reject(new Error(`not found: ${value}`))
  })

  const wrapper = mount(RemoteSelect<IOption>, {
    props: {
      modelValue: options.modelValue,
      fetchOptions,
      resolveOption,
      optionValue: (option: IOption) => option.id,
      optionLabel: (option: IOption) => option.name
    },
    // The selected-value display isn't teleported, so the tree must be connected.
    attachTo: document.body
  })

  return { wrapper, fetchOptions, resolveOption }
}

async function openDropdown (wrapper: ReturnType<typeof mountRemoteSelect>['wrapper']): Promise<void> {
  await wrapper.find('.el-select__wrapper').trigger('click')
  await flushPromises()
}

function selectedLabel (): string | undefined {
  return document.querySelector('.el-select__placeholder')?.textContent?.trim()
}

describe('RemoteSelect', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('fetches the first page on mount', async () => {
    const { fetchOptions } = mountRemoteSelect()
    await flushPromises()

    expect(fetchOptions).toHaveBeenCalledWith({ search: '', page: 1 })
  })

  it('debounces remote search — one request per settled term, not per keystroke', async () => {
    const { wrapper, fetchOptions } = mountRemoteSelect()
    await flushPromises()
    fetchOptions.mockClear()

    vi.useFakeTimers()

    const searchInput = wrapper.find<HTMLInputElement>('.el-select__input')

    for (const partial of ['c', 'ch', 'cha']) {
      await searchInput.setValue(partial)
      await vi.advanceTimersByTimeAsync(100)
    }

    expect(fetchOptions).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)

    expect(fetchOptions).toHaveBeenCalledTimes(1)
    expect(fetchOptions).toHaveBeenCalledWith({ search: 'cha', page: 1 })
  })

  it('shows the #loading slot while the initial page is in flight, then the results', async () => {
    const deferred = createDeferred<IPage>()
    const { wrapper } = mountRemoteSelect({ fetchOptions: () => deferred.promise })

    await openDropdown(wrapper)

    expect(document.body.textContent).toContain('Loading…')
    expect(document.body.textContent).not.toContain('Alpha')

    deferred.resolve(paginate('', 1))
    await flushPromises()

    expect(document.body.textContent).not.toContain('Loading…')
    expect(document.body.textContent).toContain('Alpha')
    expect(document.body.textContent).toContain('Bravo')
  })

  it('shows the #empty slot when a search matches nothing', async () => {
    const { wrapper } = mountRemoteSelect()
    await openDropdown(wrapper)

    vi.useFakeTimers()

    await wrapper.find<HTMLInputElement>('.el-select__input').setValue('does-not-exist')
    await vi.advanceTimersByTimeAsync(300)

    expect(document.body.textContent).toContain('No results found.')
  })

  it('resolves a preselected value absent from the first loaded page instead of showing a bare identifier', async () => {
    // Page 1 (perPage 2) only holds Alpha/Bravo — Delta sits on page 2.
    const { resolveOption } = mountRemoteSelect({ modelValue: '4' })
    await flushPromises()

    expect(resolveOption).toHaveBeenCalledWith('4')
    expect(selectedLabel()).toBe('Delta')
    expect(selectedLabel()).not.toBe('4')
  })

  it('never shows a blank selected box for a preselected value once resolved', async () => {
    mountRemoteSelect({ modelValue: '3' })
    await flushPromises()

    expect(selectedLabel()).toBe('Charlie')
  })

  it('loads and merges further pages, showing a loading-more footer while the next page is in flight', async () => {
    const pageTwo = createDeferred<IPage>()

    const { wrapper, fetchOptions } = mountRemoteSelect({
      fetchOptions: params => (params.page === 1 ? Promise.resolve(paginate('', 1)) : pageTwo.promise)
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Alpha')
    expect(document.body.textContent).not.toContain('Charlie')

    // jsdom has no layout, so `useInfiniteScroll` sees the dropdown at its boundary as soon as it opens.
    await openDropdown(wrapper)

    await vi.waitFor(() => {
      expect(fetchOptions).toHaveBeenCalledWith({ search: '', page: 2 })
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Loading more…')

    pageTwo.resolve(paginate('', 2))
    await flushPromises()

    expect(document.body.textContent).not.toContain('Loading more…')
    expect(document.body.textContent).toContain('Charlie')
    expect(document.body.textContent).toContain('Delta')
  })

  it('forwards clearable and filterable to the native el-select — clearing and keyboard nav stay el-select\'s own', async () => {
    const { wrapper } = mountRemoteSelect({ modelValue: '1' })
    await flushPromises()

    const select = wrapper.findComponent({ name: 'ElSelect' })

    expect(select.props('clearable')).toBe(true)
    expect(select.props('filterable')).toBe(true)
    expect(select.props('remote')).toBe(true)
  })

  it('does not crash and leaves the dropdown in its empty state when a fetch rejects', async () => {
    const fetchOptions = vi.fn(() => Promise.reject(new Error('network down')))
    const { wrapper } = mountRemoteSelect({ fetchOptions })

    await flushPromises()
    await openDropdown(wrapper)

    expect(fetchOptions).toHaveBeenCalledWith({ search: '', page: 1 })
    expect(document.body.textContent).toContain('No results found.')
    expect(document.body.textContent).not.toContain('Loading…')
  })
})
