import NotFound from './NotFound.vue'

import { mountWithRouterAndPinia, hasIcon } from '../../../tests/support'

// Starts at /login so the auth guard never redirects mid-test.
describe('NotFound', () => {
  it('shows the not-found illustration, a way back, and no other state illustration', async () => {
    const { wrapper } = await mountWithRouterAndPinia(NotFound, { initialRoute: '/login' })

    expect(wrapper.text()).toContain('Page not found')
    expect(hasIcon(wrapper, 'not-found')).toBe(true)

    const backButton = wrapper.findAll('a, button').find(el => el.text().includes('Back to dashboard'))
    expect(backButton).toBeDefined()
  })
})
