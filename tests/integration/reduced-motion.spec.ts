import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { flushPromises } from '@vue/test-utils'

import Dashboard from '@/views/dashboard/Dashboard.vue'
import { NEARLY_SOLD_OUT_MAX_QUANTITY } from '@/mocks/handlers/dashboard'

import { mountWithRouterAndPinia, resetDatabase, seedSession, setPreferredReducedMotion } from '../support'
import { db } from '@/mocks/db/singleton'
import type { ICategory, IEvent, ITicket } from '@/mocks/db'

const THEME_CSS_PATH = resolve(__dirname, '../../src/assets/styles/element-reset/theme.css')

// jsdom can't evaluate CSS @media, so the duration-token override is checked against the CSS source;
// the JS-driven count-up bypass is tested live.

const NOW_ISO = '2026-01-01T00:00:00.000Z'

function buildEvent (overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: overrides.id ?? `event-${Math.random().toString(36).slice(2)}`,
    name: 'Rooftop Jazz Night',
    country: 'US',
    venue: 'Skyline Terrace',
    startDate: '2027-05-01',
    endDate: '2027-05-02',
    status: 'published',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

function buildCategory (overrides: Partial<ICategory> = {}): ICategory {
  return {
    id: overrides.id ?? `category-${Math.random().toString(36).slice(2)}`,
    name: 'General Admission',
    description: 'Standard entry.',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

function buildTicket (overrides: Partial<ITicket> = {}): ITicket {
  return {
    id: overrides.id ?? `ticket-${Math.random().toString(36).slice(2)}`,
    name: 'General Admission Ticket',
    price: 1000,
    currency: 'USD',
    quantity: 10,
    status: 'on_sale',
    eventId: overrides.eventId ?? 'rm-event',
    categoryId: overrides.categoryId ?? 'rm-category',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

async function mountDashboard () {
  await seedSession('admin')

  const result = await mountWithRouterAndPinia(Dashboard, { initialRoute: '/', attachTo: document.body })
  mountedWrappers.push(result.wrapper)

  const authStore = useAuthStore()
  await authStore.restore()

  await result.router.push('/')
  await flushPromises()

  return result
}

describe('reduced motion', () => {
  beforeEach(() => {
    const seededUsers = db.users.list({ perPage: Number.MAX_SAFE_INTEGER }).data
    resetDatabase({ events: [], categories: [], tickets: [], users: seededUsers })
  })

  afterEach(() => {
    setPreferredReducedMotion('no-preference')

    for (const wrapper of mountedWrappers) {
      wrapper.unmount()
    }
    mountedWrappers = []
    document.body.innerHTML = ''
    localStorage.clear()
  })

  describe('dashboard headline figures (useCountUp)', () => {
    it('shows the final value immediately, without counting, when prefers-reduced-motion is set', async () => {
      setPreferredReducedMotion('reduce')

      db.categories.insert(buildCategory({ id: 'rm-category' }))
      db.events.insert(buildEvent({ id: 'rm-event' }))
      db.tickets.insert(buildTicket({ id: 'rm-ticket-1', quantity: 7 }))
      db.tickets.insert(buildTicket({ id: 'rm-ticket-2', quantity: NEARLY_SOLD_OUT_MAX_QUANTITY }))

      const { wrapper } = await mountDashboard()

      const statisticByTitle = (title: string) => (
        wrapper.findAllComponents({ name: 'ElStatistic' }).find(stat => stat.props('title') === title)
      )

      // No `vi.waitFor`: a count-up still animating under the preference would fail here immediately.
      await nextTick()
      await flushPromises()
      await nextTick()

      expect(statisticByTitle('Total events')?.props('value')).toBe(1)
      expect(statisticByTitle('Total tickets')?.props('value')).toBe(2)
      expect(statisticByTitle('Total available quantity')?.props('value')).toBe(7 + NEARLY_SOLD_OUT_MAX_QUANTITY)
    })

    it('counts up under the default (non-reduced) preference, for contrast with the reduced case above', async () => {
      setPreferredReducedMotion('no-preference')

      db.categories.insert(buildCategory({ id: 'rm-category' }))
      db.events.insert(buildEvent({ id: 'rm-event' }))
      db.tickets.insert(buildTicket({ id: 'rm-ticket-1', quantity: 5 }))

      const { wrapper } = await mountDashboard()

      const statisticByTitle = (title: string) => (
        wrapper.findAllComponents({ name: 'ElStatistic' }).find(stat => stat.props('title') === title)
      )

      // Without the preference the figure may still be mid-transition, so wait for it.
      await vi.waitFor(() => {
        expect(statisticByTitle('Total events')?.props('value')).toBe(1)
        expect(statisticByTitle('Total tickets')?.props('value')).toBe(1)
      })
    })
  })

  describe('motion token CSS contract', () => {
    it('overrides the duration tokens and --el-transition-duration* to 0s under prefers-reduced-motion', () => {
      const css = readFileSync(THEME_CSS_PATH, 'utf-8')

      const reducedMotionBlockMatch = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)
      expect(reducedMotionBlockMatch, 'expected a @media (prefers-reduced-motion: reduce) block in element-reset/theme.css').not.toBeNull()

      const block = reducedMotionBlockMatch![1]

      expect(block).toMatch(/--duration-fast:\s*0s\s*;/)
      expect(block).toMatch(/--duration-base:\s*0s\s*;/)
      expect(block).toMatch(/--el-transition-duration:\s*0s\s*;/)
      expect(block).toMatch(/--el-transition-duration-fast:\s*0s\s*;/)
    })

    it('maps the base duration/easing tokens onto --el-transition-duration* unconditionally (so the mapping itself is always active)', () => {
      const css = readFileSync(THEME_CSS_PATH, 'utf-8')

      expect(css).toMatch(/--el-transition-duration:\s*var\(--duration-base\)\s*;/)
      expect(css).toMatch(/--el-transition-duration-fast:\s*var\(--duration-fast\)\s*;/)
    })
  })
})
