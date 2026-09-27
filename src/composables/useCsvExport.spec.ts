import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

function setup () {
  let csvExport!: ReturnType<typeof useCsvExport>

  const HostComponent = defineComponent({
    setup () {
      csvExport = useCsvExport()

      return () => null
    }
  })

  const wrapper = mount(HostComponent, { attachTo: document.body })

  return { wrapper, csvExport }
}

function findMessageBoxButton (text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.el-message-box button'))
    .find(candidate => candidate.textContent?.trim() === text)

  if (!button) {
    throw new Error(`No message box button found with text "${text}"`)
  }

  return button
}

function buildBlob (): Blob {
  return new Blob(['name,price\r\nGeneral,12.00'], { type: 'text/csv' })
}

let createObjectUrlSpy: ReturnType<typeof vi.fn>
let revokeObjectUrlSpy: ReturnType<typeof vi.fn>
let clickSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  createObjectUrlSpy = vi.fn().mockReturnValue('blob:mock-url')
  revokeObjectUrlSpy = vi.fn()

  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: createObjectUrlSpy,
    revokeObjectURL: revokeObjectUrlSpy
  })

  // Clicking a real `<a download>` would trigger a jsdom navigation.
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  clickSpy.mockRestore()
})

describe('useCsvExport', () => {
  describe('below the warning threshold', () => {
    it('does not show a confirmation dialog and requests the export directly', async () => {
      const { csvExport } = setup()
      const exportFn = vi.fn().mockResolvedValue(buildBlob())

      await csvExport.exportCsv({
        entity: 'events',
        exportFn,
        params: { search: 'jazz' },
        total: CSV_EXPORT_WARNING_THRESHOLD
      })

      expect(document.querySelector('.el-message-box')).toBeNull()
      expect(exportFn).toHaveBeenCalledWith({ search: 'jazz' })
    })
  })

  describe('above the warning threshold', () => {
    it('warns via ElMessageBox naming the exact row count, and does not export when cancelled', async () => {
      const { csvExport } = setup()
      const exportFn = vi.fn().mockResolvedValue(buildBlob())
      const total = CSV_EXPORT_WARNING_THRESHOLD + 1

      const exportPromise = csvExport.exportCsv({ entity: 'events', exportFn, params: {}, total })
      await flushPromises()

      expect(document.querySelector('.el-message-box')?.textContent).toContain(String(total))

      findMessageBoxButton('Cancel').click()
      await flushPromises()
      await exportPromise

      expect(exportFn).not.toHaveBeenCalled()
    })

    it('requests the export once confirmed', async () => {
      const { csvExport } = setup()
      const exportFn = vi.fn().mockResolvedValue(buildBlob())
      const total = CSV_EXPORT_WARNING_THRESHOLD + 1

      const exportPromise = csvExport.exportCsv({ entity: 'events', exportFn, params: { status: 'published' }, total })
      await flushPromises()

      findMessageBoxButton('Export').click()
      await flushPromises()
      await exportPromise

      expect(exportFn).toHaveBeenCalledWith({ status: 'published' })
    })
  })

  describe('download-trigger mechanics', () => {
    it('creates an object URL, clicks a temporary anchor with the matching download filename, then revokes the URL', async () => {
      const { csvExport } = setup()
      const blob = buildBlob()
      const exportFn = vi.fn().mockResolvedValue(blob)
      const today = new Date().toISOString().slice(0, 10)

      await csvExport.exportCsv({ entity: 'events', exportFn, params: {}, total: 1 })

      expect(createObjectUrlSpy).toHaveBeenCalledWith(blob)
      expect(clickSpy).toHaveBeenCalledTimes(1)

      const anchor = clickSpy.mock.contexts[0] as HTMLAnchorElement
      expect(anchor.download).toBe(`events-${today}.csv`)
      expect(anchor.href).toBe('blob:mock-url')

      expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('loading', () => {
    it('is false before and after a below-threshold export', async () => {
      const { csvExport } = setup()
      const exportFn = vi.fn().mockResolvedValue(buildBlob())

      expect(csvExport.loading.value).toBe(false)

      const exportPromise = csvExport.exportCsv({ entity: 'events', exportFn, params: {}, total: 1 })
      expect(csvExport.loading.value).toBe(true)

      await exportPromise
      expect(csvExport.loading.value).toBe(false)
    })

    it('is already true while the large-export warning dialog is open, before any confirmation', async () => {
      const { csvExport } = setup()
      const exportFn = vi.fn().mockResolvedValue(buildBlob())
      const total = CSV_EXPORT_WARNING_THRESHOLD + 1

      const exportPromise = csvExport.exportCsv({ entity: 'events', exportFn, params: {}, total })
      await flushPromises()

      expect(document.querySelector('.el-message-box')).not.toBeNull()
      expect(csvExport.loading.value).toBe(true)

      findMessageBoxButton('Cancel').click()
      await flushPromises()
      await exportPromise

      expect(csvExport.loading.value).toBe(false)
    })
  })

  describe('a rejected exportFn call', () => {
    it('clears loading and rethrows so the caller can surface the failure (response interceptor toast)', async () => {
      const { csvExport } = setup()
      const exportFn = vi.fn().mockRejectedValue(new Error('Request failed with status code 500'))

      await expect(
        csvExport.exportCsv({ entity: 'events', exportFn, params: {}, total: 1 })
      ).rejects.toThrow('Request failed with status code 500')

      expect(csvExport.loading.value).toBe(false)
    })
  })
})
