import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

import type { TConfirmIntent } from './useConfirm'

/**
 * `useConfirm` unit tests (GitHub issue #24, PRD-003 "Confirmation
 * composable — unit tested for confirm and cancel paths against the real
 * `ElMessageBox`, including `confirmButtonLoading` while the request is in
 * flight"). `ElMessageBox.confirm` teleports its dialog to `document.body`
 * regardless of where the host component is mounted, so — per
 * `docs/prd/ELEMENT-PLUS.md`'s "Testing Element Plus components" section —
 * the wrapper is `attachTo: document.body` and assertions query the real
 * rendered dialog/buttons there rather than trusting internal state.
 *
 * A trivial host component invokes `confirm()` from a click handler (the
 * shape every real call site uses) rather than calling the composable
 * function directly outside of Vue's reactivity, matching this repo's
 * `useListQuery.spec.ts` / `useBreakpoint.spec.ts` convention of exercising
 * composables through a host rather than mocking their dependencies.
 */

function buildHost (onConfirm: () => Promise<void>) {
  let resolvedIntent: TConfirmIntent | undefined

  const HostComponent = defineComponent({
    setup () {
      const { confirm } = useConfirm()

      async function trigger () {
        resolvedIntent = await confirm({
          subject: 'Summer Fair',
          onConfirm
        })
      }

      return { trigger }
    },
    template: '<button @click="trigger">Delete</button>'
  })

  return {
    wrapper: mount(HostComponent, { attachTo: document.body }),
    getIntent: () => resolvedIntent
  }
}

function findMessageBoxButton (text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.el-message-box button'))
    .find(candidate => candidate.textContent?.trim() === text)

  if (!button) {
    throw new Error(`No message box button found with text "${text}"`)
  }

  return button
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useConfirm', () => {
  it('names the record in the rendered dialog text', async () => {
    const { wrapper } = buildHost(() => Promise.resolve())

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(document.querySelector('.el-message-box')?.textContent).toContain('Summer Fair')

    findMessageBoxButton('Cancel').click()
    await flushPromises()
  })

  describe('confirm path', () => {
    it('calls onConfirm and resolves to { confirmed: true }', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      const { wrapper, getIntent } = buildHost(onConfirm)

      await wrapper.find('button').trigger('click')
      await flushPromises()

      findMessageBoxButton('Delete').click()
      await flushPromises()

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(getIntent()).toEqual({ confirmed: true })
    })
  })

  describe('cancel path', () => {
    it('does not call onConfirm and resolves to { confirmed: false, reason: "cancel" }', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      const { wrapper, getIntent } = buildHost(onConfirm)

      await wrapper.find('button').trigger('click')
      await flushPromises()

      findMessageBoxButton('Cancel').click()
      await flushPromises()

      expect(onConfirm).not.toHaveBeenCalled()
      expect(getIntent()).toEqual({ confirmed: false, reason: 'cancel' })
    })
  })

  describe('in-flight state', () => {
    it('shows the confirm button as loading and disabled while onConfirm is pending, then clears it', async () => {
      let resolveOnConfirm!: () => void
      const onConfirm = vi.fn(() => new Promise<void>((resolve) => {
        resolveOnConfirm = resolve
      }))
      const { wrapper, getIntent } = buildHost(onConfirm)

      await wrapper.find('button').trigger('click')
      await flushPromises()

      const confirmButton = findMessageBoxButton('Delete')
      confirmButton.click()
      await flushPromises()

      expect(confirmButton.classList.contains('is-loading')).toBe(true)
      expect(confirmButton.disabled).toBe(true)
      expect(confirmButton.getAttribute('aria-disabled')).toBe('true')
      // The dialog stays open (its overlay visible) while the request is in flight.
      expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
        .not.toBe('none')

      resolveOnConfirm()
      await flushPromises()

      // On success `beforeClose` calls `done()`, which hides the overlay
      // (Element Plus keeps the node mounted for its leave transition
      // rather than removing it outright) and clears the loading state.
      await vi.waitFor(() => {
        expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
          .toBe('none')
      })
      expect(confirmButton.classList.contains('is-loading')).toBe(false)

      expect(getIntent()).toEqual({ confirmed: true })
    })
  })
})
