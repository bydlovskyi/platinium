import BulkResultDialog from './BulkResultDialog.vue'

import { mountWithRouterAndPinia } from '../../tests/support'

function mountDialog (props: Partial<InstanceType<typeof BulkResultDialog>['$props']> = {}) {
  return mountWithRouterAndPinia(BulkResultDialog, {
    props: {
      modelValue: true,
      entityLabel: 'event',
      result: { succeeded: ['event-1'], failed: [] },
      ...props
    }
  })
}

describe('BulkResultDialog', () => {
  it('titles the dialog after the entity and reports a full success', async () => {
    const { wrapper } = await mountDialog()

    expect(wrapper.text()).toContain('Bulk event update result')
    expect(wrapper.text()).toContain('Bulk operation completed')
    expect(wrapper.text()).toContain('1 succeeded, 0 failed')
    expect(wrapper.find('li').exists()).toBe(false)
  })

  it('reports a partial success and lists each failure by name, falling back to the id', async () => {
    const { wrapper } = await mountDialog({
      result: {
        succeeded: ['event-1'],
        failed: [
          { id: 'event-2', code: 'CONFLICT', reason: '4 ticket(s) reference this event.', count: 4 },
          { id: 'event-3', code: 'NOT_FOUND', reason: 'Not found.' }
        ]
      },
      names: { 'event-2': 'Summer Fest' }
    })

    expect(wrapper.text()).toContain('Bulk operation partially completed')

    const rows = wrapper.findAll('li')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Summer Fest')
    expect(rows[0]!.text()).toContain('4 ticket(s) reference this event.')
    expect(rows[1]!.text()).toContain('event-3')
  })

  it('reports a total failure', async () => {
    const { wrapper } = await mountDialog({
      result: { succeeded: [], failed: [{ id: 'event-2', code: 'NOT_FOUND', reason: 'Not found.' }] }
    })

    expect(wrapper.text()).toContain('Bulk operation failed')
  })

  it('links a failure to its blocking records and closes when the link is followed', async () => {
    const { wrapper } = await mountDialog({
      result: { succeeded: [], failed: [{ id: 'event-2', code: 'CONFLICT', reason: 'Blocked.', count: 4 }] },
      blockingLink: failure => ({ to: { name: routeNames.tickets, query: { eventId: failure.id } }, label: 'View 4 tickets' })
    })

    const link = wrapper.findAllComponents({ name: 'RouterLink' }).find(candidate => candidate.text() === 'View 4 tickets')!
    expect(link.props('to')).toEqual({ name: routeNames.tickets, query: { eventId: 'event-2' } })

    await link.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('emits a close from the footer button', async () => {
    const { wrapper } = await mountDialog()

    await wrapper.findAll('button').find(button => button.text() === 'Close')!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
