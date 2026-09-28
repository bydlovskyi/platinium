import StatusDistributionBar from './StatusDistributionBar.vue'

import { mountWithRouterAndPinia } from '../../../../tests/support'

function buildEntries (): TStatusBreakdown[] {
  return [
    { status: 'draft', count: 1 },
    { status: 'published', count: 3 }
  ]
}

describe('StatusDistributionBar', () => {
  it('renders one bar segment per entry, proportional to its share of the total', async () => {
    const { wrapper } = await mountWithRouterAndPinia(StatusDistributionBar, {
      props: { entries: buildEntries(), routeName: routeNames.events }
    })

    const segments = wrapper.findAll('[aria-hidden="true"] > div')
    expect(segments).toHaveLength(2)
    expect(segments[0]!.attributes('style')).toContain('width: 25%') // 1 of 4
    expect(segments[1]!.attributes('style')).toContain('width: 75%') // 3 of 4
  })

  it('renders an accessible legend with a label and the exact count for every entry', async () => {
    const { wrapper } = await mountWithRouterAndPinia(StatusDistributionBar, {
      props: { entries: buildEntries(), routeName: routeNames.events }
    })

    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('Draft')
    expect(items[0]!.text()).toContain('1')
    expect(items[1]!.text()).toContain('Published')
    expect(items[1]!.text()).toContain('3')
  })

  it('links each legend row to the route filtered by its status', async () => {
    const { wrapper } = await mountWithRouterAndPinia(StatusDistributionBar, {
      props: { entries: buildEntries(), routeName: routeNames.events }
    })

    const links = wrapper.findAllComponents({ name: 'RouterLink' })
    expect(links).toHaveLength(2)
    expect(links[0]!.props('to')).toEqual({ name: routeNames.events, query: { status: 'draft' } })
    expect(links[1]!.props('to')).toEqual({ name: routeNames.events, query: { status: 'published' } })
  })

  it('renders no segments and an empty legend when there are no entries', async () => {
    const { wrapper } = await mountWithRouterAndPinia(StatusDistributionBar, {
      props: { entries: [], routeName: routeNames.events }
    })

    expect(wrapper.findAll('[aria-hidden="true"] > div')).toHaveLength(0)
    expect(wrapper.findAll('li')).toHaveLength(0)
  })
})
