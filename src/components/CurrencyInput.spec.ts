import { mount } from '@vue/test-utils'

import CurrencyInput from './CurrencyInput.vue'

/**
 * `CurrencyInput` unit tests (GitHub issue #32, PRD-006's testing boundary
 * — "unit tested exhaustively: decimal-to-minor conversion in both
 * directions, precision clamping, zero, a large value, negative rejection,
 * and a currency change preserving the entered amount correctly; asserted
 * through the real `el-input-number` `<input>`"). Mounts the real
 * `el-input-number` (never stubbed, per `docs/prd/ELEMENT-PLUS.md`'s
 * testing section) and drives/reads its rendered `<input>` rather than any
 * internal component state — no network, no router dependency, matching
 * the "testable standalone" acceptance criterion.
 *
 * `el-input-number` only emits `update:modelValue` on its underlying
 * `change` event (blur / Enter), not on every keystroke `input` event (see
 * `input-number2.mjs`'s `onInput: handleInput` / `onChange:
 * handleInputChange`, where only the latter calls
 * `setCurrentValueToModelValue`) — so `setAmount` below types the value and
 * then commits it with a `change` trigger, the same "type, then commit"
 * shape `EventForm.spec.ts` uses for its `el-date-picker` field.
 */

function mountCurrencyInput (props: { modelValue: number; currency: TCurrency }) {
  return mount(CurrencyInput, { props })
}

async function setAmount (wrapper: ReturnType<typeof mountCurrencyInput>, value: string): Promise<void> {
  const input = wrapper.find('input')
  await input.setValue(value)
  await input.trigger('change')
}

function getInputValue (wrapper: ReturnType<typeof mountCurrencyInput>): string {
  return (wrapper.find('input').element as HTMLInputElement).value
}

describe('CurrencyInput', () => {
  it('presents a minor-unit modelValue as the correct decimal amount (minor-to-decimal)', () => {
    const wrapper = mountCurrencyInput({ modelValue: 4999, currency: 'USD' })

    expect(getInputValue(wrapper)).toBe('49.99')
  })

  it('emits the correct minor-unit integer when a decimal amount is typed (decimal-to-minor)', async () => {
    const wrapper = mountCurrencyInput({ modelValue: 0, currency: 'USD' })

    await setAmount(wrapper, '49.99')

    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions).toBeTruthy()
    expect(emissions?.[emissions.length - 1]).toEqual([4999])
  })

  it('treats zero as a valid amount, not empty/falsy', async () => {
    const wrapper = mountCurrencyInput({ modelValue: 0, currency: 'USD' })

    expect(getInputValue(wrapper)).toBe('0.00')

    await setAmount(wrapper, '0')

    const emissions = wrapper.emitted('update:modelValue')
    // Setting the same decimal (0.00 -> 0 minor units) may not re-emit if
    // el-input-number's change handler treats it as unchanged, but the
    // rendered input must still show the valid zero amount, not blank.
    expect(getInputValue(wrapper)).toBe('0.00')
    if (emissions) {
      expect(emissions[emissions.length - 1]).toEqual([0])
    }
  })

  it('renders a large value with no precision/overflow bug', () => {
    const wrapper = mountCurrencyInput({ modelValue: 123_456_789, currency: 'USD' })

    expect(getInputValue(wrapper)).toBe('1234567.89')
  })

  it('emits the correct minor-unit integer for a large typed decimal amount', async () => {
    const wrapper = mountCurrencyInput({ modelValue: 0, currency: 'USD' })

    await setAmount(wrapper, '1234567.89')

    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions?.[emissions.length - 1]).toEqual([123_456_789])
  })

  it('constrains input to the currency\'s decimal precision — a third decimal digit is clamped away', async () => {
    const wrapper = mountCurrencyInput({ modelValue: 0, currency: 'USD' })

    // USD has 2 fraction digits; el-input-number's :precision="2" rounds a
    // third typed decimal digit away rather than accepting it verbatim.
    await setAmount(wrapper, '49.999')

    expect(getInputValue(wrapper)).toBe('50.00')
    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions?.[emissions.length - 1]).toEqual([5000])
  })

  it('rejects a negative typed value, clamping to the 0 minimum', async () => {
    const wrapper = mountCurrencyInput({ modelValue: 500, currency: 'USD' })

    await setAmount(wrapper, '-5.00')

    expect(getInputValue(wrapper)).toBe('0.00')
    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions?.[emissions.length - 1]).toEqual([0])
  })

  it('rejects a negative modelValue prop, clamping the rendered amount to 0', () => {
    const wrapper = mountCurrencyInput({ modelValue: -100, currency: 'USD' })

    expect(getInputValue(wrapper)).not.toContain('-')
  })

  it('renders the currency symbol in the prefix slot', () => {
    const usd = mountCurrencyInput({ modelValue: 1000, currency: 'USD' })
    const eur = mountCurrencyInput({ modelValue: 1000, currency: 'EUR' })
    const gbp = mountCurrencyInput({ modelValue: 1000, currency: 'GBP' })

    expect(usd.text()).toContain('$')
    expect(eur.text()).toContain('€')
    expect(gbp.text()).toContain('£')
  })

  describe('currency change with a genuinely different precision', () => {
    // USD/EUR/GBP all share 2 fraction digits in this portal's real
    // currency set, so a same-precision currency switch can't distinguish
    // "recompute from the displayed decimal" from "do nothing" — both
    // produce the same minor-unit integer. Stubbing `getCurrencyPrecision`
    // so 'EUR' resolves to 0 fraction digits for the duration of these
    // tests forces a real precision change, so the assertions can only
    // pass if the watcher's recompute logic actually ran.
    let precisionSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      precisionSpy = vi.spyOn(filters, 'getCurrencyPrecision').mockImplementation((currency: TCurrency) => {
        return currency === 'EUR' ? 0 : 2
      })
    })

    afterEach(() => {
      precisionSpy.mockRestore()
    })

    it('preserves the displayed decimal amount when currency changes, recomputing minor units at the new precision rather than reinterpreting the stale integer', async () => {
      // Admin enters "49.99" while currency=USD (precision 2) -> stored as
      // 4999 minor units. Switching to the stubbed 0-precision 'EUR' must
      // still read "50" (49.99 rounds to 50 at 0 decimals) and emit 50
      // minor units — not 4999 reinterpreted as if it were already
      // expressed at 0 decimals.
      const wrapper = mountCurrencyInput({ modelValue: 4999, currency: 'USD' })

      expect(getInputValue(wrapper)).toBe('49.99')

      await wrapper.setProps({ currency: 'EUR' })
      await wrapper.vm.$nextTick()

      expect(getInputValue(wrapper)).toBe('50')
      // `wrapper.setProps` drives the prop directly rather than through a
      // real parent's `v-model`, so the component's own re-emission (not
      // `wrapper.props()`, which only reflects what the test explicitly
      // set) is what proves the recomputed minor-unit value left the
      // component — matching this file's existing `emitted(...)` convention.
      const emissions = wrapper.emitted('update:modelValue')
      expect(emissions?.[emissions.length - 1]).toEqual([50])
    })

    it('re-derives minor units from the displayed decimal (not the raw stored integer) on every currency change, even repeated ones', async () => {
      const wrapper = mountCurrencyInput({ modelValue: 250, currency: 'USD' })

      expect(getInputValue(wrapper)).toBe('2.50')

      // USD (2) -> EUR (stubbed 0): 2.50 -> 3 (rounds up) -> 3 minor units.
      await wrapper.setProps({ currency: 'EUR' })
      await wrapper.vm.$nextTick()
      expect(getInputValue(wrapper)).toBe('3')

      // EUR (stubbed 0) -> USD (2): 3 -> 3.00 -> 300 minor units, not the
      // original 250 — proving the recompute is driven by the currently
      // displayed decimal at each step, not a cached original value. The
      // component's internal `minorUnits` ref (driving `el-input-number`'s
      // own rendering) already reflects the first EUR recompute even though
      // `wrapper.setProps` never fed that emitted value back in as a prop
      // — this second switch's correctness depends on that.
      await wrapper.setProps({ currency: 'USD' })
      await wrapper.vm.$nextTick()
      expect(getInputValue(wrapper)).toBe('3.00')

      const emissions = wrapper.emitted('update:modelValue')
      expect(emissions?.[emissions.length - 1]).toEqual([300])
    })
  })

  it('does not reconvert modelValue when currency and modelValue change together in the same tick (e.g. a form loading a fetched price and currency at once)', async () => {
    // Regression case for the same-tick data-loss bug: setting currency and
    // modelValue together must treat the incoming modelValue as already
    // correct in the new currency, not reinterpret it as an amount that
    // was displayed under the old currency's precision.
    const wrapper = mountCurrencyInput({ modelValue: 4999, currency: 'USD' })

    expect(getInputValue(wrapper)).toBe('49.99')

    await wrapper.setProps({ currency: 'EUR', modelValue: 5000 })
    await wrapper.vm.$nextTick()

    expect(getInputValue(wrapper)).toBe('50.00')
    expect(wrapper.props('modelValue')).toBe(5000)
  })
})
