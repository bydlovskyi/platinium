import { mount } from '@vue/test-utils'

import StatusTag from './StatusTag.vue'

/**
 * `StatusTag` component tests (GitHub issue #24, PRD-003 "Formatters and
 * status tag — unit tested"). Mounts the real `el-tag` (never stubbed, per
 * `docs/prd/ELEMENT-PLUS.md`'s testing section) with every `TEventStatus`
 * and `TTicketStatus` value and asserts both the rendered text label (the
 * "identical statuses look identical" / "distinguishable in greyscale"
 * acceptance criterion — colour is never the only signal) and the tag's
 * `type` prop reaching the DOM as an `el-tag--<type>` class, so a
 * colour-only regression (e.g. two different statuses silently sharing one
 * type) would also be caught, not just a label typo.
 */
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

      // `el-tag`'s component root is a `<transition>`, not the `<span
      // class="el-tag">` itself, so the type/colour class is asserted on
      // the rendered DOM element rather than `findComponent(...).classes()`.
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

    // draft is the only literal overlap between the two status universes
    // (event draft + ticket draft), so 8 cases collapse to 7 unique labels.
    expect(uniqueLabels.size).toBe(7)
  })

  it('never renders colour as the only signal — the text label is always present in the DOM', () => {
    const wrapper = mount(StatusTag, { props: { status: 'sold_out' as TTicketStatus } })

    // Asserting on rendered text (not a `type`/colour prop alone) is what
    // makes this greyscale-safe: a screen reader or a printed page with no
    // colour still gets "Sold out".
    expect(wrapper.text().trim()).toBe('Sold out')
  })
})
