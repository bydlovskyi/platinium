import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import type { TCapabilityEntity, TCapabilityOperation } from './useCapability'

const ENTITIES: TCapabilityEntity[] = ['events', 'categories', 'tickets']
const OPERATIONS: TCapabilityOperation[] = ['create', 'update', 'delete']

function buildHost () {
  let capability: ReturnType<typeof useCapability>

  const HostComponent = defineComponent({
    setup () {
      capability = useCapability()
      return {}
    },
    template: '<div />'
  })

  const wrapper = mount(HostComponent)

  return {
    wrapper,
    getCapability: () => capability
  }
}

function signInAs (role: TUserRole): void {
  const authStore = useAuthStore()

  authStore.token = 'mock-token-under-test'
  authStore.user = { id: 'u1', name: 'Test User', email: `${role}@platinium.test`, role }
}

describe('useCapability', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('role', () => {
    it('is undefined when no user is signed in', () => {
      const { getCapability } = buildHost()

      expect(getCapability().role.value).toBeUndefined()
    })

    it('reflects the signed-in user\'s role', () => {
      signInAs('admin')
      const { getCapability } = buildHost()

      expect(getCapability().role.value).toBe('admin')
    })
  })

  describe('canDo', () => {
    describe('admin', () => {
      beforeEach(() => {
        signInAs('admin')
      })

      for (const entity of ENTITIES) {
        for (const operation of OPERATIONS) {
          it(`allows ${operation} on ${entity}`, () => {
            const { getCapability } = buildHost()

            expect(getCapability().canDo(entity, operation)).toBe(true)
          })
        }
      }
    })

    describe('viewer', () => {
      beforeEach(() => {
        signInAs('viewer')
      })

      for (const entity of ENTITIES) {
        for (const operation of OPERATIONS) {
          it(`denies ${operation} on ${entity}`, () => {
            const { getCapability } = buildHost()

            expect(getCapability().canDo(entity, operation)).toBe(false)
          })
        }
      }
    })

    describe('unauthenticated (no signed-in user)', () => {
      for (const entity of ENTITIES) {
        for (const operation of OPERATIONS) {
          it(`denies ${operation} on ${entity}`, () => {
            const { getCapability } = buildHost()

            expect(getCapability().canDo(entity, operation)).toBe(false)
          })
        }
      }
    })
  })
})
