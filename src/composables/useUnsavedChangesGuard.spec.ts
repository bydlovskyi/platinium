import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

let mountedWrappers: VueWrapper[] = []

function buildHost (
  isDirty: Ref<boolean>,
  onMarkClean?: (markClean: () => void) => void,
  guardRouteLeave?: boolean
) {
  return defineComponent({
    setup () {
      const { markClean } = useUnsavedChangesGuard({
        isDirty,
        ...(guardRouteLeave !== undefined ? { guardRouteLeave } : {})
      })
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

async function setup (
  isDirty: Ref<boolean>,
  onMarkClean?: (markClean: () => void) => void,
  guardRouteLeave?: boolean
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/form', name: 'form', component: buildHost(isDirty, onMarkClean, guardRouteLeave) },
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

// Unmount (not just wipe the DOM) so each test's `beforeunload` listener is removed.
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

  describe('guardRouteLeave: false (dialog-hosted form)', () => {
    it('does not prompt or block route navigation while dirty, since the leave path is the dialog, not a route change', async () => {
      const isDirty = ref(true)
      const { router } = await setup(isDirty, undefined, false)

      await router.push('/list')

      expect(router.currentRoute.value.name).toBe('list')
      expect(document.querySelector('.el-message-box')).toBeNull()
    })

    it('still registers the beforeunload handler while dirty, since that path is unconditional', async () => {
      const isDirty = ref(true)
      await setup(isDirty, undefined, false)

      const dirtyEvent = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(dirtyEvent)
      expect(dirtyEvent.defaultPrevented).toBe(true)
    })
  })
})

describe('useUnsavedChangesGuard — confirmDiscard', () => {
  function mountDialogGuard (isDirty: Ref<boolean>) {
    let guard!: ReturnType<typeof useUnsavedChangesGuard>

    const wrapper = mount(defineComponent({
      setup () {
        guard = useUnsavedChangesGuard({
          isDirty,
          message: 'Discard them and close this dialog?',
          confirmButtonText: 'Discard',
          guardRouteLeave: false
        })

        return () => null
      }
    }), { attachTo: document.body })
    mountedWrappers.push(wrapper)

    return guard
  }

  it('resolves true without prompting when clean', async () => {
    const guard = mountDialogGuard(ref(false))

    await expect(guard.confirmDiscard()).resolves.toBe(true)
    expect(document.querySelector('.el-message-box')).toBeNull()
  })

  it('prompts with the given message and button, resolving true on discard', async () => {
    const guard = mountDialogGuard(ref(true))

    const decision = guard.confirmDiscard()
    await vi.waitFor(() => {
      expect(document.querySelector('.el-message-box')?.textContent).toContain('Discard them and close this dialog?')
    })
    findMessageBoxButton('Discard').click()

    await expect(decision).resolves.toBe(true)
  })

  it('resolves false when the administrator chooses to stay', async () => {
    const guard = mountDialogGuard(ref(true))

    const decision = guard.confirmDiscard()
    await vi.waitFor(() => {
      expect(document.querySelector('.el-message-box')).not.toBeNull()
    })
    findMessageBoxButton('Stay').click()

    await expect(decision).resolves.toBe(false)
  })
})
