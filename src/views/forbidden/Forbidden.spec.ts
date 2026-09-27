import NotFound from '../not-found/NotFound.vue'
import Forbidden from './Forbidden.vue'

import { mountWithRouterAndPinia, hasIcon } from '../../../tests/support'

describe('Forbidden', () => {
  it('shows the forbidden illustration, a way back, and no other state illustration', async () => {
    const { wrapper } = await mountWithRouterAndPinia(Forbidden, { initialRoute: '/login' })

    expect(wrapper.text()).toContain('Access denied')
    expect(hasIcon(wrapper, 'forbidden')).toBe(true)
    expect(hasIcon(wrapper, 'not-found')).toBe(false)

    const backButton = wrapper.findAll('a, button').find(el => el.text().includes('Back to dashboard'))
    expect(backButton).toBeDefined()
  })

  it('renders a different illustration than the 404 page for the same "el-result" shape', async () => {
    const forbidden = await mountWithRouterAndPinia(Forbidden, { initialRoute: '/login' })
    const notFound = await mountWithRouterAndPinia(NotFound, { initialRoute: '/login' })

    expect(hasIcon(forbidden.wrapper, 'forbidden')).toBe(true)
    expect(hasIcon(notFound.wrapper, 'forbidden')).toBe(false)
  })
})
