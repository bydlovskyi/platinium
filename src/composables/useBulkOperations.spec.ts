import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount, flushPromises } from '@vue/test-utils'

/**
 * `useBulkOperations` unit tests (GitHub issue #39, PRD-007 "Bulk
 * operations"). Driven through a real memory-history router with a trivial
 * host component, matching this repo's `useListQuery.spec.ts` /
 * `useConfirm.spec.ts` convention of exercising a composable through a host
 * rather than mocking its own dependencies (`useConfirm`, `useRoute`) — only
 * the caller-injected `bulk` function is a `vi.fn()`, since that boundary is
 * exactly what keeps this composable entity-agnostic (see the composable's
 * own file-level comment).
 *
 * `ElMessageBox.confirm` teleports to `document.body` regardless of where the
 * host is mounted, so the wrapper is `attachTo: document.body` and assertions
 * query the real rendered dialog/buttons there, per
 * `docs/prd/ELEMENT-PLUS.md`'s testing convention (also used by
 * `useConfirm.spec.ts`).
 */

function buildResult (overrides: Partial<TBulkResult> = {}): TBulkResult {
  return { succeeded: [], failed: [], ...overrides }
}

async function setup (initialRoute = '/list') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/list', component: { template: '<div />' } }]
  })

  await router.push(initialRoute)
  await router.isReady()

  let bulkOperations!: ReturnType<typeof useBulkOperations>

  const HostComponent = defineComponent({
    setup () {
      bulkOperations = useBulkOperations()

      return () => null
    }
  })

  const wrapper = mount(HostComponent, {
    attachTo: document.body,
    global: { plugins: [router] }
  })

  return { router, wrapper, bulkOperations }
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

describe('useBulkOperations', () => {
  describe('selection lifecycle', () => {
    it('starts empty, tracks ids added via selectedIds, and clearSelection empties it', async () => {
      const { bulkOperations } = await setup()

      expect(bulkOperations.selectedIds.value).toEqual([])

      bulkOperations.selectedIds.value = ['a', 'b']
      expect(bulkOperations.selectedIds.value).toEqual(['a', 'b'])

      bulkOperations.selectedIds.value = ['a']
      expect(bulkOperations.selectedIds.value).toEqual(['a'])

      bulkOperations.clearSelection()
      expect(bulkOperations.selectedIds.value).toEqual([])
    })
  })

  describe('auto-clear on query change', () => {
    it('clears a non-empty selection when route.query changes (search/filter/sort/page)', async () => {
      const { router, bulkOperations } = await setup()

      bulkOperations.selectedIds.value = ['a', 'b', 'c']
      expect(bulkOperations.selectedIds.value).toEqual(['a', 'b', 'c'])

      await router.push({ path: '/list', query: { search: 'zzz' } })

      expect(bulkOperations.selectedIds.value).toEqual([])
    })

    it('clears selection again on a second, independent query change (e.g. page)', async () => {
      const { router, bulkOperations } = await setup()

      bulkOperations.selectedIds.value = ['a']
      await router.push({ path: '/list', query: { page: '2' } })
      expect(bulkOperations.selectedIds.value).toEqual([])

      bulkOperations.selectedIds.value = ['a']
      await router.push({ path: '/list', query: { page: '2', sort: 'name' } })
      expect(bulkOperations.selectedIds.value).toEqual([])
    })
  })

  describe('runBulkOperation', () => {
    it('names the selection count in the confirm dialog', async () => {
      const { bulkOperations } = await setup()
      bulkOperations.selectedIds.value = ['a', 'b']

      const bulk = vi.fn().mockResolvedValue(buildResult())

      void bulkOperations.runBulkOperation('delete', {
        confirmSubject: '2 events',
        bulk,
        onComplete: vi.fn()
      })

      await flushPromises()

      expect(document.querySelector('.el-message-box')?.textContent).toContain('2 events')

      findMessageBoxButton('Cancel').click()
      await flushPromises()
    })

    it('does not call bulk when the confirmation is cancelled', async () => {
      const { bulkOperations } = await setup()
      bulkOperations.selectedIds.value = ['a']

      const bulk = vi.fn().mockResolvedValue(buildResult())
      const onComplete = vi.fn()

      void bulkOperations.runBulkOperation('delete', { confirmSubject: '1 event', bulk, onComplete })
      await flushPromises()

      findMessageBoxButton('Cancel').click()
      await flushPromises()

      expect(bulk).not.toHaveBeenCalled()
      expect(onComplete).not.toHaveBeenCalled()
      expect(bulkOperations.selectedIds.value).toEqual(['a'])
    })

    describe('total success', () => {
      it('calls bulk with the selected ids and operation, exposes the result, clears selection, and calls onComplete', async () => {
        const { bulkOperations } = await setup()
        bulkOperations.selectedIds.value = ['a', 'b']

        const result = buildResult({ succeeded: ['a', 'b'] })
        const bulk = vi.fn().mockResolvedValue(result)
        const onComplete = vi.fn()

        void bulkOperations.runBulkOperation('delete', { confirmSubject: '2 events', bulk, onComplete })
        await flushPromises()

        findMessageBoxButton('Delete').click()
        await flushPromises()

        expect(bulk).toHaveBeenCalledWith({ ids: ['a', 'b'], operation: 'delete' })
        expect(bulkOperations.lastResult.value).toEqual(result)
        expect(bulkOperations.selectedIds.value).toEqual([])
        expect(onComplete).toHaveBeenCalledTimes(1)
      })
    })

    describe('total failure', () => {
      it('exposes every id as failed, still clears selection, and still calls onComplete', async () => {
        const { bulkOperations } = await setup()
        bulkOperations.selectedIds.value = ['a', 'b']

        const result = buildResult({
          failed: [
            { id: 'a', code: 'NOT_FOUND', reason: 'No event exists with this identifier.' },
            { id: 'b', code: 'NOT_FOUND', reason: 'No event exists with this identifier.' }
          ]
        })
        const bulk = vi.fn().mockResolvedValue(result)
        const onComplete = vi.fn()

        void bulkOperations.runBulkOperation('delete', { confirmSubject: '2 events', bulk, onComplete })
        await flushPromises()

        findMessageBoxButton('Delete').click()
        await flushPromises()

        expect(bulkOperations.lastResult.value).toEqual(result)
        expect(bulkOperations.lastResult.value?.succeeded).toEqual([])
        expect(bulkOperations.lastResult.value?.failed).toHaveLength(2)
        expect(bulkOperations.selectedIds.value).toEqual([])
        expect(onComplete).toHaveBeenCalledTimes(1)
      })
    })

    describe('partial success', () => {
      it('exposes a mix of succeeded and failed ids', async () => {
        const { bulkOperations } = await setup()
        bulkOperations.selectedIds.value = ['a', 'b']

        const result = buildResult({
          succeeded: ['a'],
          failed: [{ id: 'b', code: 'CONFLICT', reason: '1 ticket references this event.', count: 1 }]
        })
        const bulk = vi.fn().mockResolvedValue(result)
        const onComplete = vi.fn()

        void bulkOperations.runBulkOperation('delete', { confirmSubject: '2 events', bulk, onComplete })
        await flushPromises()

        findMessageBoxButton('Delete').click()
        await flushPromises()

        expect(bulkOperations.lastResult.value?.succeeded).toEqual(['a'])
        expect(bulkOperations.lastResult.value?.failed).toEqual([
          { id: 'b', code: 'CONFLICT', reason: '1 ticket references this event.', count: 1 }
        ])
        expect(bulkOperations.selectedIds.value).toEqual([])
        expect(onComplete).toHaveBeenCalledTimes(1)
      })
    })

    describe('isRunning', () => {
      it('is true only while bulk is in flight', async () => {
        const { bulkOperations } = await setup()
        bulkOperations.selectedIds.value = ['a']

        let resolveBulk!: (value: TBulkResult) => void
        const bulk = vi.fn(() => new Promise<TBulkResult>((resolve) => {
          resolveBulk = resolve
        }))

        expect(bulkOperations.isRunning.value).toBe(false)

        void bulkOperations.runBulkOperation('delete', { confirmSubject: '1 event', bulk, onComplete: vi.fn() })
        await flushPromises()

        findMessageBoxButton('Delete').click()
        await flushPromises()

        expect(bulkOperations.isRunning.value).toBe(true)

        resolveBulk(buildResult({ succeeded: ['a'] }))
        await flushPromises()

        expect(bulkOperations.isRunning.value).toBe(false)
      })
    })

    describe('stale-context suppression (a route.query change while the request is in flight)', () => {
      it('does not open the result dialog (lastResult) or call onComplete when the query changed mid-flight, and shows a toast instead', async () => {
        const { router, bulkOperations } = await setup()
        bulkOperations.selectedIds.value = ['a', 'b']

        let resolveBulk!: (value: TBulkResult) => void
        const bulk = vi.fn(() => new Promise<TBulkResult>((resolve) => {
          resolveBulk = resolve
        }))
        const onComplete = vi.fn()

        void bulkOperations.runBulkOperation('delete', { confirmSubject: '2 events', bulk, onComplete })
        await flushPromises()

        findMessageBoxButton('Delete').click()
        await flushPromises()

        // The admin changes the filters/search/page while the request is
        // still in flight — the query watcher already clears the
        // (now-stale) selection.
        await router.push({ path: '/list', query: { search: 'zzz' } })
        expect(bulkOperations.selectedIds.value).toEqual([])

        resolveBulk(buildResult({ succeeded: ['a'], failed: [{ id: 'b', code: 'NOT_FOUND', reason: 'Not found.' }] }))
        await flushPromises()

        // No stale result surfaced for the caller to render in a dialog.
        expect(bulkOperations.lastResult.value).toBeUndefined()
        expect(onComplete).not.toHaveBeenCalled()

        // The admin still gets some signal the mutation completed.
        await vi.waitFor(() => {
          expect(document.querySelector('.el-notification')?.textContent).toContain('1 succeeded, 1 failed')
        })
      })

      it('still opens the result dialog (lastResult) normally when the query did not change while in flight', async () => {
        const { bulkOperations } = await setup()
        bulkOperations.selectedIds.value = ['a']

        const result = buildResult({ succeeded: ['a'] })
        const bulk = vi.fn().mockResolvedValue(result)
        const onComplete = vi.fn()

        void bulkOperations.runBulkOperation('delete', { confirmSubject: '1 event', bulk, onComplete })
        await flushPromises()

        findMessageBoxButton('Delete').click()
        await flushPromises()

        expect(bulkOperations.lastResult.value).toEqual(result)
        expect(onComplete).toHaveBeenCalledTimes(1)
      })
    })

    describe('a rejected bulk() call (network/HTTP failure, not a per-record failure)', () => {
      it('shows a notificationService.error toast, leaves lastResult untouched, and rethrows so the confirm dialog stays open', async () => {
        const { bulkOperations } = await setup()
        bulkOperations.selectedIds.value = ['a', 'b']

        const bulk = vi.fn().mockRejectedValue(new Error('Request failed with status code 500'))
        const onComplete = vi.fn()

        void bulkOperations.runBulkOperation('delete', { confirmSubject: '2 events', bulk, onComplete })
        await flushPromises()

        findMessageBoxButton('Delete').click()
        await flushPromises()

        await vi.waitFor(() => {
          expect(document.querySelector('.el-notification')?.textContent).toContain('could not be completed')
        })
        // `notificationService.error`'s default title (see `notification.service.ts`).
        expect(document.querySelector('.el-notification')?.textContent).toContain('Error')

        expect(bulkOperations.lastResult.value).toBeUndefined()
        expect(onComplete).not.toHaveBeenCalled()

        // `useConfirm`'s contract: a rejected `onConfirm` leaves the dialog
        // open (no `done()` called) so the admin can retry — verified the
        // same way `useConfirm.spec.ts` does, via the overlay still visible.
        expect(document.querySelector<HTMLElement>('.el-overlay.is-message-box')?.style.display)
          .not.toBe('none')

        // Selection survives a failed request — nothing to clear yet, the
        // admin may want to retry the same selection.
        expect(bulkOperations.selectedIds.value).toEqual(['a', 'b'])
      })
    })
  })
})
