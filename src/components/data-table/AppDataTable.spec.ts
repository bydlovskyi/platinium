import { mount, flushPromises } from '@vue/test-utils'

import AppDataTable from './AppDataTable.vue'
import type { IDataTableColumn, IDataTableRowAction } from './data-table.types'

import EmptyNoDataIllustration from '../illustrations/EmptyNoDataIllustration.vue'
import EmptyNoMatchesIllustration from '../illustrations/EmptyNoMatchesIllustration.vue'
import LoadFailedIllustration from '../illustrations/LoadFailedIllustration.vue'

import { setViewportToBreakpoint } from '../../../tests/support'

/**
 * `AppDataTable` component tests (GitHub issue #23, PRD-003's testing
 * boundary for the data table slice): descriptor-driven rendering, sort
 * cycling through three states, each async/empty state, selection
 * behaviour (including the page-scoped select-all), and the presentation
 * switch at the tablet breakpoint. Assertions target user-visible roles,
 * text and ARIA attributes rather than internal component state, matching
 * this repo's testing convention.
 *
 * A trivial row shape stands in for any future entity (events, categories,
 * tickets) — the whole point of the component is that it carries no
 * entity-specific knowledge.
 */

interface ITestRow extends Record<string, unknown> {
  id: string
  name: string
  status: string
}

function buildRows (count = 3): ITestRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index + 1}`,
    name: `Row ${index + 1}`,
    status: index % 2 === 0 ? 'active' : 'inactive'
  }))
}

function buildColumns (): IDataTableColumn<ITestRow>[] {
  return [
    { key: 'name', label: 'Name', sortable: true, responsivePriority: 'high' },
    { key: 'status', label: 'Status', sortable: false, responsivePriority: 'low' }
  ]
}

function buildRowActions (): IDataTableRowAction<ITestRow>[] {
  return [
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete', danger: true }
  ]
}

function buildMeta (overrides: Partial<TPaginationMeta> = {}): TPaginationMeta {
  return { page: 1, perPage: 20, total: 3, totalPages: 1, ...overrides }
}

function mountTable (props: Record<string, unknown>) {
  return mount(AppDataTable<ITestRow>, {
    props: {
      columns: buildColumns(),
      rows: buildRows(),
      rowKey: (row: ITestRow) => row.id,
      ...props
    }
  })
}

beforeEach(() => {
  setViewportToBreakpoint('desktop')
})

// `el-dropdown` teleports its menu to `document.body` regardless of
// `attachTo`, so a menu left open by one test would otherwise bleed into
// the next test's `document.querySelectorAll` lookups.
afterEach(() => {
  document.body.innerHTML = ''
})

describe('AppDataTable', () => {
  describe('descriptor-driven rendering', () => {
    it('renders a header and a cell for every declared column, and nothing entity-specific', async () => {
      const wrapper = mountTable({})
      await flushPromises()

      const headers = wrapper.findAll('th').map(header => header.text())

      expect(headers).toContain('Name')
      expect(headers).toContain('Status')

      expect(wrapper.text()).toContain('Row 1')
      expect(wrapper.text()).toContain('active')
    })

    it('renders custom cell content through the column\'s named slot', async () => {
      const wrapper = mount(AppDataTable<ITestRow>, {
        props: {
          columns: [{ key: 'name', label: 'Name', cellSlot: 'name' }] as IDataTableColumn<ITestRow>[],
          rows: buildRows(1),
          rowKey: (row: ITestRow) => row.id
        },
        slots: {
          'cell-name': '<template #cell-name="{ row }"><strong class="custom-cell">{{ row.name }}!!!</strong></template>'
        }
      })
      await flushPromises()

      expect(wrapper.find('.custom-cell').text()).toBe('Row 1!!!')
    })
  })

  describe('three-state sort cycling', () => {
    function nameHeader (wrapper: ReturnType<typeof mountTable>) {
      return wrapper.findAll('th').find(header => header.text().includes('Name'))!
    }

    it('requests a sort on every header activation as el-table cycles ascending -> descending -> unsorted', async () => {
      const wrapper = mountTable({ sort: undefined })
      await flushPromises()

      await nameHeader(wrapper).trigger('click')
      await nameHeader(wrapper).trigger('click')
      await nameHeader(wrapper).trigger('click')

      expect(wrapper.emitted('sort-requested')).toEqual([['name'], ['name'], ['name']])
    })

    it('mirrors the sort prop into aria-sort without echoing it back as a request', async () => {
      const wrapper = mountTable({ sort: undefined })
      await flushPromises()

      // el-table renders an empty `aria-sort` on an unsorted column, which
      // assistive technology treats as the default, "none".
      expect(nameHeader(wrapper).attributes('aria-sort') ?? '').toBe('')

      await wrapper.setProps({ sort: { field: 'name', order: 'asc' } })
      await flushPromises()
      expect(nameHeader(wrapper).attributes('aria-sort')).toBe('ascending')

      await wrapper.setProps({ sort: { field: 'name', order: 'desc' } })
      await flushPromises()
      expect(nameHeader(wrapper).attributes('aria-sort')).toBe('descending')

      await wrapper.setProps({ sort: undefined })
      await flushPromises()
      expect(nameHeader(wrapper).attributes('aria-sort') ?? '').toBe('')

      expect(wrapper.emitted('sort-requested')).toBeUndefined()
    })

    it('applies an initial sort from props on mount', async () => {
      const wrapper = mountTable({ sort: { field: 'name', order: 'desc' } })
      await flushPromises()

      expect(nameHeader(wrapper).attributes('aria-sort')).toBe('descending')
    })

    it('ignores activation of a non-sortable header', async () => {
      const wrapper = mountTable({})
      await flushPromises()

      const statusHeader = wrapper.findAll('th').find(header => header.text().includes('Status'))!
      expect(statusHeader.attributes('aria-sort')).toBeUndefined()

      await statusHeader.trigger('click')
      expect(wrapper.emitted('sort-requested')).toBeUndefined()
    })
  })

  describe('async states', () => {
    it('renders a column-shaped skeleton while loading with no prior rows', async () => {
      const wrapper = mountTable({ rows: [], loading: true })
      await flushPromises()

      expect(wrapper.findAll('th')).toHaveLength(2)
      expect(wrapper.findAll('.el-skeleton__item').length).toBeGreaterThan(0)
      expect(wrapper.text()).not.toContain('Row 1')
    })

    it('dims rather than removes existing rows while a later page loads', async () => {
      const wrapper = mountTable({ loading: true })
      await flushPromises()

      expect(wrapper.text()).toContain('Row 1')
      expect(wrapper.find('.el-loading-mask').exists()).toBe(true)
    })

    it('shows a create action when nothing exists yet, with the no-data illustration and no other', async () => {
      const wrapper = mountTable({ rows: [], emptyReason: 'no-data' })
      await flushPromises()

      expect(wrapper.text()).toContain('Nothing here yet')
      expect(wrapper.findComponent(EmptyNoDataIllustration).exists()).toBe(true)
      expect(wrapper.findComponent(EmptyNoMatchesIllustration).exists()).toBe(false)
      expect(wrapper.findComponent(LoadFailedIllustration).exists()).toBe(false)

      const createButton = wrapper.findAll('button').find(button => button.text().includes('Create'))
      expect(createButton).toBeDefined()

      await createButton!.trigger('click')
      expect(wrapper.emitted('create-requested')).toHaveLength(1)
    })

    it('shows a clear-filters action when nothing matched the filters, with the no-matches illustration and no other', async () => {
      const wrapper = mountTable({ rows: [], emptyReason: 'no-matches' })
      await flushPromises()

      expect(wrapper.text()).toContain('No results match your filters')
      expect(wrapper.findComponent(EmptyNoMatchesIllustration).exists()).toBe(true)
      expect(wrapper.findComponent(EmptyNoDataIllustration).exists()).toBe(false)
      expect(wrapper.findComponent(LoadFailedIllustration).exists()).toBe(false)

      const clearButton = wrapper.findAll('button').find(button => button.text().includes('Clear filters'))
      expect(clearButton).toBeDefined()

      await clearButton!.trigger('click')
      expect(wrapper.emitted('clear-filters-requested')).toHaveLength(1)
    })

    it('shows a retry action when the load failed, with the load-failed illustration, distinct from the empty states', async () => {
      const wrapper = mountTable({ rows: [], error: new Error('network down') })
      await flushPromises()

      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      expect(wrapper.text()).not.toContain('Nothing here yet')
      expect(wrapper.text()).not.toContain('No results match your filters')
      expect(wrapper.findComponent(LoadFailedIllustration).exists()).toBe(true)
      expect(wrapper.findComponent(EmptyNoDataIllustration).exists()).toBe(false)
      expect(wrapper.findComponent(EmptyNoMatchesIllustration).exists()).toBe(false)

      const retryButton = wrapper.findAll('button').find(button => button.text().includes('Retry'))
      expect(retryButton).toBeDefined()

      await retryButton!.trigger('click')
      expect(wrapper.emitted('retry-requested')).toHaveLength(1)
    })

    it('shows dimmed prior rows, not the stale error panel, once a retry starts loading again', async () => {
      const wrapper = mountTable({ loading: true, error: new Error('network down') })
      await flushPromises()

      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Row 1')
      expect(wrapper.find('.el-loading-mask').exists()).toBe(true)
    })

    it('shows the loading skeleton, not the stale error panel, when a retry starts with no prior rows', async () => {
      const wrapper = mountTable({ rows: [], loading: true, error: new Error('network down') })
      await flushPromises()

      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.find('table').exists()).toBe(true)
      expect(wrapper.findAll('th')).toHaveLength(2)
    })
  })

  describe('selection behaviour', () => {
    it('emits selection-changed with the row key when a single row is checked', async () => {
      const wrapper = mountTable({ selectable: true, rowActions: buildRowActions() })
      await flushPromises()

      const rowCheckboxes = wrapper.findAll('tbody input[type="checkbox"]')
      await rowCheckboxes[0]!.setValue(true)

      expect(wrapper.emitted('selection-changed')?.[0]).toEqual([['row-1']])
    })

    it('visibly states that select-all applies to the current page only', async () => {
      const wrapper = mountTable({ selectable: true })
      await flushPromises()

      expect(wrapper.text()).toContain('this page only')
    })

    it('states the page-only scope in the select-all checkbox\'s own accessible name', async () => {
      const wrapper = mountTable({ selectable: true, rows: buildRows(3) })
      await flushPromises()

      // `el-checkbox` never forwards attrs like `aria-describedby` to its
      // inner `<input>` (only to the outer label), so the scope has to be
      // in the label a screen reader announces for the focused control.
      const headerLabel = wrapper.find('thead label')
      expect(headerLabel.attributes('aria-label')).toBe('Select all 3 rows on this page')
    })

    it('select-all on the page selects exactly the rows on that page, not the whole dataset', async () => {
      const wrapper = mountTable({
        selectable: true,
        rows: buildRows(3),
        meta: buildMeta({ total: 50 })
      })
      await flushPromises()

      const headerCheckbox = wrapper.find('thead input[type="checkbox"]')
      await headerCheckbox.setValue(true)
      // el-table debounces its select-all toggle.
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(wrapper.emitted('selection-changed')?.[0]).toEqual([['row-1', 'row-2', 'row-3']])
    })

    it('shows an indeterminate select-all state when only some page rows are selected', async () => {
      const wrapper = mountTable({ selectable: true, selectedRowKeys: ['row-1'] })
      await flushPromises()

      const headerCheckboxInput = wrapper.find('thead input[type="checkbox"]')
        .element as HTMLInputElement
      expect(headerCheckboxInput.indeterminate).toBe(true)
    })

    it('reflects all-selected when every row on the page is selected', async () => {
      const wrapper = mountTable({ selectable: true, selectedRowKeys: ['row-1', 'row-2', 'row-3'] })
      await flushPromises()

      const headerCheckboxInput = wrapper.find('thead input[type="checkbox"]')
        .element as HTMLInputElement
      expect(headerCheckboxInput.checked).toBe(true)
      expect(headerCheckboxInput.indeterminate).toBe(false)
    })

    it('does not render a selection column when selectable is not set', async () => {
      const wrapper = mountTable({})
      await flushPromises()

      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    })
  })

  describe('row actions', () => {
    it('emits row-action-invoked with the action key and row when an action is triggered', async () => {
      // `el-dropdown`'s menu teleports to `document.body` when opened, so the
      // wrapper needs to be attached to a real document to find it.
      const wrapper = mount(AppDataTable<ITestRow>, {
        props: {
          columns: buildColumns(),
          rows: buildRows(),
          rowKey: (row: ITestRow) => row.id,
          rowActions: buildRowActions()
        },
        attachTo: document.body
      })
      await flushPromises()

      await wrapper.find('button[aria-label="Row actions"]').trigger('click')
      await flushPromises()

      const editItem = Array.from(document.querySelectorAll('.el-dropdown-menu__item'))
        .find(item => item.textContent?.trim() === 'Edit')

      expect(editItem).toBeDefined()
      editItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(wrapper.emitted('row-action-invoked')?.[0]).toEqual([{ action: 'edit', row: buildRows()[0] }])

      wrapper.unmount()
    })
  })

  describe('presentation switch at the tablet breakpoint', () => {
    it('renders a real table at and above the tablet breakpoint', async () => {
      setViewportToBreakpoint('tablet')
      const wrapper = mountTable({})
      await flushPromises()

      expect(wrapper.find('table').exists()).toBe(true)
      expect(wrapper.find('[role="table"], table').exists()).toBe(true)
    })

    it('renders stacked cards showing only high-priority columns below the tablet breakpoint', async () => {
      setViewportToBreakpoint('mobile')
      const wrapper = mountTable({})
      await flushPromises()

      expect(wrapper.find('table').exists()).toBe(false)
      // High-priority column content is present...
      expect(wrapper.text()).toContain('Row 1')
      // ...but the low-priority column's label is not rendered on the card.
      expect(wrapper.text()).not.toContain('Status')
    })

    it('switches from table to cards when the viewport crosses the tablet breakpoint reactively', async () => {
      setViewportToBreakpoint('desktop')
      const wrapper = mountTable({})
      await flushPromises()
      expect(wrapper.find('table').exists()).toBe(true)

      setViewportToBreakpoint('mobile')
      await flushPromises()
      expect(wrapper.find('table').exists()).toBe(false)
    })
  })

  describe('pagination', () => {
    it('renders the total from the pagination meta envelope', async () => {
      const wrapper = mountTable({ meta: buildMeta({ total: 42 }) })
      await flushPromises()

      expect(wrapper.find('.el-pagination__total').text()).toContain('42')
    })

    it('emits page-requested when a different page is chosen', async () => {
      const wrapper = mountTable({
        rows: buildRows(20),
        meta: buildMeta({ total: 60, perPage: 20, totalPages: 3 })
      })
      await flushPromises()

      const pager = wrapper.findComponent({ name: 'ElPagination' })
      await pager.vm.$emit('current-change', 2)

      expect(wrapper.emitted('page-requested')?.[0]).toEqual([2])
    })

    it('emits page-size-requested with the chosen size when the page-size selector changes', async () => {
      const wrapper = mountTable({
        rows: buildRows(20),
        meta: buildMeta({ total: 60, perPage: 20, totalPages: 3 })
      })
      await flushPromises()

      const pager = wrapper.findComponent({ name: 'ElPagination' })
      await pager.vm.$emit('size-change', 50)

      expect(wrapper.emitted('page-size-requested')?.[0]).toEqual([50])
    })

    it('passes custom pageSizes through to el-pagination\'s page-size choices', async () => {
      const wrapper = mountTable({
        pageSizes: [5, 15],
        meta: buildMeta({ total: 60, perPage: 5, totalPages: 12 })
      })
      await flushPromises()

      const pager = wrapper.findComponent({ name: 'ElPagination' })
      expect(pager.props('pageSizes')).toEqual([5, 15])
    })
  })
})
