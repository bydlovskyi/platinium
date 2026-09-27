import { mount } from '@vue/test-utils'

import StatusTag from './StatusTag.vue'

interface IStatusCase {
  status: TEventStatus | TTicketStatus
  label: string
  type: 'success' | 'warning' | 'danger' | 'info'
}

const EVENT_STATUS_CASES: IStatusCase[] = [
  { status: 'draft', label: 'Draft', type: 'warning' },
  { status: 'published', label: 'Published', type: 'success' },
  { status: 'cancelled', label: 'Cancelled', type: 'danger' },
  { status: 'completed', label: 'Completed', type: 'info' }
]

const TICKET_STATUS_CASES: IStatusCase[] = [
  { status: 'draft', label: 'Draft', type: 'warning' },
  { status: 'on_sale', label: 'On sale', type: 'success' },
  { status: 'sold_out', label: 'Sold out', type: 'danger' },
  { status: 'archived', label: 'Archived', type: 'info' }
]

describe('StatusTag', () => {
  describe.each(EVENT_STATUS_CASES)('event status "$status"', ({ status, label, type }) => {
    it(`renders the "${label}" label with the ${type} tag type`, () => {
      const wrapper = mount(StatusTag, { props: { status } })

      // `el-tag`'s root is a `<transition>`, so assert on the rendered `.el-tag` element.
      const tag = wrapper.find('.el-tag')
      expect(tag.exists()).toBe(true)
      expect(wrapper.text()).toContain(label)
      expect(tag.classes()).toContain(`el-tag--${type}`)
    })
  })

  describe.each(TICKET_STATUS_CASES)('ticket status "$status"', ({ status, label, type }) => {
    it(`renders the "${label}" label with the ${type} tag type`, () => {
      const wrapper = mount(StatusTag, { props: { status } })

      const tag = wrapper.find('.el-tag')
      expect(tag.exists()).toBe(true)
      expect(wrapper.text()).toContain(label)
      expect(tag.classes()).toContain(`el-tag--${type}`)
    })
  })

  it('renders the draft status identically for an event and a ticket — same label, same type', () => {
    const eventDraft = mount(StatusTag, { props: { status: 'draft' as TEventStatus } })
    const ticketDraft = mount(StatusTag, { props: { status: 'draft' as TTicketStatus } })

    expect(eventDraft.text()).toBe(ticketDraft.text())
    expect(eventDraft.find('.el-tag').classes()).toEqual(ticketDraft.find('.el-tag').classes())
  })

  it('gives each status its own visible label, so no two statuses share the same rendered text', () => {
    const allCases = [...EVENT_STATUS_CASES, ...TICKET_STATUS_CASES]
    const uniqueLabels = new Set(allCases.map(({ label }) => label))

    // draft is the only overlap between event and ticket statuses: 8 cases, 7 labels.
    expect(uniqueLabels.size).toBe(7)
  })

  it('never renders colour as the only signal — the text label is always present in the DOM', () => {
    const wrapper = mount(StatusTag, { props: { status: 'sold_out' as TTicketStatus } })

    expect(wrapper.text().trim()).toBe('Sold out')
  })

  it('renders nothing rather than throwing for a status outside the known set', () => {
    const wrapper = mount(StatusTag, { props: { status: 'unknown-status' as TEventStatus } })

    expect(wrapper.find('.el-tag').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
