import { ElNotification } from 'element-plus'

import { notificationService } from './notification.service'

vi.mock('element-plus', () => ({
  ElNotification: vi.fn()
}))

describe('notificationService', () => {
  afterEach(() => vi.clearAllMocks())

  it('success() calls ElNotification with type "success" and a default title', () => {
    notificationService.success({ message: 'Saved.' })

    expect(ElNotification).toHaveBeenCalledOnce()
    expect(ElNotification).toHaveBeenCalledWith({ type: 'success', title: 'Success', message: 'Saved.' })
  })

  it('error() calls ElNotification with type "error" and a default title', () => {
    notificationService.error({ message: 'Something went wrong.' })

    expect(ElNotification).toHaveBeenCalledOnce()
    expect(ElNotification).toHaveBeenCalledWith({ type: 'error', title: 'Error', message: 'Something went wrong.' })
  })

  it('warning() calls ElNotification with type "warning" and a default title', () => {
    notificationService.warning({ message: 'Careful.' })

    expect(ElNotification).toHaveBeenCalledOnce()
    expect(ElNotification).toHaveBeenCalledWith({ type: 'warning', title: 'Warning', message: 'Careful.' })
  })

  it('info() calls ElNotification with type "info" and a default title', () => {
    notificationService.info({ message: 'FYI.' })

    expect(ElNotification).toHaveBeenCalledOnce()
    expect(ElNotification).toHaveBeenCalledWith({ type: 'info', title: 'Info', message: 'FYI.' })
  })

  it('accepts a custom title, overriding the default', () => {
    notificationService.error({ message: 'Failed.', title: 'Request failed' })

    expect(ElNotification).toHaveBeenCalledWith({ type: 'error', title: 'Request failed', message: 'Failed.' })
  })
})
