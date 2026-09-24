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

  describe('when the invoking component unmounts while the dialog is open', () => {
    it('force-closes the dialog instead of leaving it stuck (unmount while onConfirm is still pending)', async () => {
      // Reproduces GitHub issue #28's finding against `useConfirm` (issue
      // #24): `ElMessageBox` is a route-independent singleton teleported to
      // `document.body`, so navigating away from the view that opened it
      // (simulated here by unmounting the host) does not tear the dialog
      // down on its own. Without the fix the overlay stays in the DOM
      // forever, blocking pointer events on whatever screen the admin has
      // since navigated to — even once the in-flight `onConfirm` eventually
      // settles, since `beforeClose`'s `.catch()` deliberately never calls
      // `done()`.
      let resolveOnConfirm!: () => void
      const onConfirm = vi.fn(() => new Promise<void>((resolve) => {
        resolveOnConfirm = resolve
      }))
      const { wrapper } = buildHost(onConfirm)

      await wrapper.find('button').trigger('click')
      await flushPromises()

      findMessageBoxButton('Delete').click()
      await flushPromises()

      expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
        .not.toBe('none')

      wrapper.unmount()
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
          .toBe('none')
      })

      // The delayed response landing afterwards (e.g. a 409 conflict) must
      // not resurrect the dialog or throw against the now-detached instance.
      resolveOnConfirm()
      await flushPromises()

      expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
        .toBe('none')
    })

    it('force-closes the dialog left stuck open by a failed onConfirm after the host has unmounted', async () => {
      // The other half of the same bug: `onConfirm` rejects (e.g. the 409
      // path) instead of resolving. Normally that intentionally leaves the
      // dialog open so the admin can see the failure and retry — but only
      // while the invoking view is still mounted. Once it isn't, there is no
      // one left to retry, so the dialog must still be force-closed rather
      // than staying stuck forever.
      let rejectOnConfirm!: (reason: unknown) => void
      const onConfirm = vi.fn(() => new Promise<void>((_resolve, reject) => {
        rejectOnConfirm = reject
      }))
      const { wrapper } = buildHost(onConfirm)

      await wrapper.find('button').trigger('click')
      await flushPromises()

      findMessageBoxButton('Delete').click()
      await flushPromises()

      wrapper.unmount()
      await flushPromises()

      rejectOnConfirm(new Error('conflict'))
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
          .toBe('none')
      })
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
