import { h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

import ListFilterField from './ListFilterField.vue'
import ListToolbar from './ListToolbar.vue'

import { setViewportToBreakpoint } from '../../../tests/support'

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

// `el-drawer` teleports to `document.body`, so clear it between tests.
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

      // el-input only renders its clear icon once it has content and is focused.
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

    it('renders the sort slot inline and keeps ListFilterField width without a label', async () => {
      const wrapper = mountToolbar({}, {
        slots: {
          filters: () => h(ListFilterField, { label: 'Status', class: 'w-40' }, () => h('div', { class: 'entity-filter' })),
          sort: '<div class="entity-sort">Sort</div>'
        }
      })
      await flushPromises()

      expect(wrapper.find('.entity-sort').exists()).toBe(true)
      expect(wrapper.find('.entity-filter').element.parentElement?.classList.contains('w-40')).toBe(true)
      expect(wrapper.text()).not.toContain('Status')
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
      const wrapper = mountToolbar({ activeFilters: buildActiveFilters() }, {
        slots: { filters: '<div class="entity-filter">Entity filter</div>' },
        attachTo: document.body
      })
      await flushPromises()

      const badge = wrapper.findComponent({ name: 'ElBadge' })
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toContain('2')
    })

    it('hides the badge value when there are no active filters', async () => {
      const wrapper = mountToolbar({ activeFilters: [] }, {
        slots: { filters: '<div class="entity-filter">Entity filter</div>' },
        attachTo: document.body
      })
      await flushPromises()

      const badge = wrapper.findComponent({ name: 'ElBadge' })
      expect(badge.props('hidden')).toBe(true)
    })

    it('does not render the filters button/drawer at all when the entity supplies no filter controls', async () => {
      const wrapper = mountToolbar({}, { attachTo: document.body })
      await flushPromises()

      expect(wrapper.find('button[aria-label="Open filters"]').exists()).toBe(false)
    })

    it('offers the drawer for a sort-only toolbar and renders sort inside it', async () => {
      const wrapper = mountToolbar({}, {
        slots: { sort: '<div class="entity-sort">Sort</div>' },
        attachTo: document.body
      })
      await flushPromises()

      expect(wrapper.find('.entity-sort').exists()).toBe(false)

      await wrapper.find('button[aria-label="Open filters"]').trigger('click')
      await flushPromises()

      expect(document.querySelector('.el-drawer .entity-sort')).toBeTruthy()
    })

    it('stacks ListFilterField controls under a visible label inside the drawer', async () => {
      const wrapper = mountToolbar({}, {
        slots: { filters: () => h(ListFilterField, { label: 'Status', class: 'w-40' }, () => h('div', { class: 'entity-filter' })) },
        attachTo: document.body
      })
      await flushPromises()

      await wrapper.find('button[aria-label="Open filters"]').trigger('click')
      await flushPromises()

      const field = document.querySelector('.el-drawer .entity-filter')?.parentElement
      expect(field?.textContent).toContain('Status')
      expect(field?.classList.contains('w-40')).toBe(false)
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
