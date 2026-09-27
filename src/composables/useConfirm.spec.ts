import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

import type { TConfirmIntent } from './useConfirm'

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
      // ElMessageBox isn't torn down on unmount; a stuck overlay would block the next screen.
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

      resolveOnConfirm()
      await flushPromises()

      expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
        .toBe('none')
    })

    it('force-closes the dialog left stuck open by a failed onConfirm after the host has unmounted', async () => {
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
      expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
        .not.toBe('none')

      resolveOnConfirm()
      await flushPromises()

      // Element Plus keeps the node mounted for its leave transition, so check visibility.
      await vi.waitFor(() => {
        expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
          .toBe('none')
      })
      expect(confirmButton.classList.contains('is-loading')).toBe(false)

      expect(getIntent()).toEqual({ confirmed: true })
    })
  })
})
