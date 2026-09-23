import { mount, flushPromises } from '@vue/test-utils'

import ListToolbar from './ListToolbar.vue'

import { setViewportToBreakpoint } from '../../../tests/support'

/**
 * `ListToolbar` component tests (GitHub issue #24, PRD-003's testing
 * boundary "Toolbar and pagination — component tested: `el-input` clear,
 * `el-tag` close removes a filter, `el-drawer` + `el-badge` count on
 * mobile"). Pagination's own `el-pagination` page-size-change case belongs
 * to `AppDataTable.spec.ts`, not here. Mounts the real `el-input`, `el-tag`,
 * `el-drawer` and `el-badge` (never stubbed), driving them through their
 * real rendered DOM per `docs/prd/ELEMENT-PLUS.md`'s testing section, and
 * uses `setViewportToBreakpoint` (`tests/support/viewport.ts`) the same way
 * `AppDataTable.spec.ts` does for its own mobile-breakpoint cases.
 */

function buildActiveFilters () {
  return [
    { key: 'status', label: 'Status: Published' },
    { key: 'category', label: 'Category: Music' }
  ]
}

function mountToolbar (props: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
  return mount(ListToolbar, {
    props: {
      search: '',
      ...props
    },
    ...options
  })
}

beforeEach(() => {
  setViewportToBreakpoint('desktop')
})

// `el-drawer` teleports to `document.body`, so a drawer left open by one
// test would otherwise bleed into the next test's DOM queries.
afterEach(() => {
  document.body.innerHTML = ''
})

describe('ListToolbar', () => {
  describe('search', () => {
    it('emits update:search with the typed value', async () => {
      const wrapper = mountToolbar()

      const input = wrapper.find('input')
      await input.setValue('summer fair')

      expect(wrapper.emitted('update:search')?.[0]).toEqual(['summer fair'])
    })

    it('clears the search and emits update:search with an empty string via el-input\'s clear button', async () => {
      const wrapper = mountToolbar({ search: 'summer fair' }, { attachTo: document.body })

      // el-input only renders its clear icon once the input has content
      // *and* is focused — matching how an administrator would actually
      // reach it (focus, then click the clear glyph).
      await wrapper.find('input').trigger('focus')
      await flushPromises()

      const clearIcon = wrapper.find('.el-input__clear')
      expect(clearIcon.exists()).toBe(true)

      await clearIcon.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('update:search')?.[0]).toEqual([''])
    })
  })

  describe('active filter chips', () => {
    it('emits filter-removed with the chip\'s key when its el-tag close button is clicked', async () => {
      const wrapper = mountToolbar({ activeFilters: buildActiveFilters() })

      const statusChip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Status: Published'))!
      await statusChip.find('.el-tag__close').trigger('click')

      expect(wrapper.emitted('filter-removed')).toEqual([['status']])
    })

    it('emits clear-all-requested when "Clear all" is clicked', async () => {
      const wrapper = mountToolbar({ activeFilters: buildActiveFilters() })

      const clearAllButton = wrapper.findAll('button').find(button => button.text() === 'Clear all')!
      await clearAllButton.trigger('click')

      expect(wrapper.emitted('clear-all-requested')).toHaveLength(1)
    })

    it('renders no chips and no clear-all when there are no active filters', () => {
      const wrapper = mountToolbar({ activeFilters: [] })

      expect(wrapper.find('.el-tag').exists()).toBe(false)
      expect(wrapper.findAll('button').some(button => button.text() === 'Clear all')).toBe(false)
    })
  })

  describe('filters slot', () => {
    it('renders the filters slot inline above the tablet breakpoint', async () => {
      setViewportToBreakpoint('desktop')
      const wrapper = mountToolbar({}, {
        slots: { filters: '<div class="entity-filter">Entity filter</div>' }
      })
      await flushPromises()

      expect(wrapper.find('.entity-filter').exists()).toBe(true)
      expect(wrapper.find('.el-drawer').exists()).toBe(false)
    })
  })

  describe('below the tablet breakpoint', () => {
    beforeEach(() => {
      setViewportToBreakpoint('mobile')
    })

    it('does not render the filter slot inline, offering a badge-and-drawer control instead', async () => {
      const wrapper = mountToolbar({}, {
        slots: { filters: '<div class="entity-filter">Entity filter</div>' },
        attachTo: document.body
      })
      await flushPromises()

      expect(wrapper.find('.entity-filter').exists()).toBe(false)
      expect(wrapper.find('button[aria-label="Open filters"]').exists()).toBe(true)
    })

    it('shows the active-filter count on the badge', async () => {
      const wrapper = mountToolbar({ activeFilters: buildActiveFilters() }, { attachTo: document.body })
      await flushPromises()

      const badge = wrapper.findComponent({ name: 'ElBadge' })
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toContain('2')
    })

    it('hides the badge value when there are no active filters', async () => {
      const wrapper = mountToolbar({ activeFilters: [] }, { attachTo: document.body })
      await flushPromises()

      const badge = wrapper.findComponent({ name: 'ElBadge' })
      expect(badge.props('hidden')).toBe(true)
    })

    it('renders the filter slot inside the el-drawer once opened', async () => {
      const wrapper = mountToolbar({}, {
        slots: { filters: '<div class="entity-filter">Entity filter</div>' },
        attachTo: document.body
      })
      await flushPromises()

      await wrapper.find('button[aria-label="Open filters"]').trigger('click')
      await flushPromises()

      // el-drawer teleports its body to document.body.
      const drawerFilter = document.querySelector('.el-drawer .entity-filter')
      expect(drawerFilter).toBeTruthy()
      expect(drawerFilter?.textContent).toBe('Entity filter')
    })
  })
})
