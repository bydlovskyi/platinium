import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

/**
 * `useUnsavedChangesGuard` unit tests (GitHub issue #27, PRD-004
 * "Unsaved-changes guard composable — unit tested: clean form navigates
 * freely, dirty form prompts through `ElMessageBox.confirm`, saving clears
 * the dirty state"). `onBeforeRouteLeave` only registers inside a component
 * rendered by a matched route, so — like `useListQuery.spec.ts` — this is
 * driven through a real memory-history router with two routes and a host
 * component that calls the composable, rather than calling it bare.
 * `ElMessageBox.confirm` teleports to `document.body` regardless of where
 * the host is mounted (PRD-004's testing boundary), so its dialog is queried
 * there.
 *
 * Every mounted wrapper is unmounted in `afterEach` (not just its DOM wiped)
 * so each test's `beforeunload` listener (registered in
 * `useUnsavedChangesGuard`, removed via its own `onUnmounted`) doesn't leak
 * into the next test and pollute the "clean" assertions.
 */

let mountedWrappers: VueWrapper[] = []

function buildHost (isDirty: Ref<boolean>, onMarkClean?: (markClean: () => void) => void) {
  return defineComponent({
    setup () {
      const { markClean } = useUnsavedChangesGuard({ isDirty })
      onMarkClean?.(markClean)

      return {}
    },
    template: '<div>host</div>'
  })
}

function findMessageBoxButton (text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.el-message-box button'))
    .find(candidate => candidate.textContent?.trim() === text)

  if (!button) {
    throw new Error(`No message box button found with text "${text}"`)
  }

  return button
}

async function setup (isDirty: Ref<boolean>, onMarkClean?: (markClean: () => void) => void) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/form', name: 'form', component: buildHost(isDirty, onMarkClean) },
      { path: '/list', name: 'list', component: { template: '<div>list</div>' } }
    ]
  })

  await router.push('/form')
  await router.isReady()

  const RootComponent = defineComponent({
    template: '<router-view />'
  })

  const wrapper = mount(RootComponent, {
    attachTo: document.body,
    global: { plugins: [router] }
  })
  mountedWrappers.push(wrapper)

  return { wrapper, router }
}

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }
  mountedWrappers = []
  document.body.innerHTML = ''
})

describe('useUnsavedChangesGuard', () => {
  it('navigates freely when clean, without prompting', async () => {
    const isDirty = ref(false)
    const { router } = await setup(isDirty)

    await router.push('/list')

    expect(router.currentRoute.value.name).toBe('list')
    expect(document.querySelector('.el-message-box')).toBeNull()
  })

  it('prompts through ElMessageBox.confirm when dirty, and blocks navigation on cancel', async () => {
    const isDirty = ref(true)
    const { router } = await setup(isDirty)

    void router.push('/list')
    await flushPromises()

    expect(document.querySelector('.el-message-box')).not.toBeNull()
    expect(document.querySelector('.el-message-box')?.textContent).toContain('unsaved changes')

    findMessageBoxButton('Stay').click()
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('form')
  })

  it('allows navigation to proceed when the prompt is confirmed', async () => {
    const isDirty = ref(true)
    const { router } = await setup(isDirty)

    void router.push('/list')
    await flushPromises()

    findMessageBoxButton('Leave').click()
    await flushPromises()

    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe('list')
    })
  })

  it('registers a beforeunload handler that prevents default only while dirty', async () => {
    const isDirty = ref(false)
    await setup(isDirty)

    const cleanEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(cleanEvent)
    expect(cleanEvent.defaultPrevented).toBe(false)

    isDirty.value = true
    await flushPromises()

    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)
  })

  it('marking saved clears dirty state so further navigation does not prompt', async () => {
    const isDirty = ref(true)
    let markClean!: () => void

    const { router } = await setup(isDirty, (fn) => {
      markClean = fn
    })

    markClean()
    expect(isDirty.value).toBe(false)

    await router.push('/list')

    expect(router.currentRoute.value.name).toBe('list')
    expect(document.querySelector('.el-message-box')).toBeNull()
  })
})
