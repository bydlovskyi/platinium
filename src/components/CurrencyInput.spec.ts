import { mount } from '@vue/test-utils'

import CurrencyInput from './CurrencyInput.vue'

function mountCurrencyInput (props: { modelValue: number; currency: TCurrency }) {
  return mount(CurrencyInput, { props })
}

// `el-input-number` only updates the model on `change`, not on `input`.
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
    // May not re-emit when the value is unchanged.
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

    await setAmount(wrapper, '49.999')

    expect(getInputValue(wrapper)).toBe('50.00')
    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions?.[emissions.length - 1]).toEqual([5000])
  })

  it('keeps a two-decimal amount valid for the browser, so a native form submit is not blocked', async () => {
    const wrapper = mountCurrencyInput({ modelValue: 0, currency: 'USD' })

    await setAmount(wrapper, '45.50')

    const input = wrapper.find('input').element as HTMLInputElement
    expect(input.validity.stepMismatch).toBe(false)
    expect(input.checkValidity()).toBe(true)
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
    // Real currencies all have 2 decimals; stub EUR to 0 to force a genuine precision change.
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
      const wrapper = mountCurrencyInput({ modelValue: 4999, currency: 'USD' })

      expect(getInputValue(wrapper)).toBe('49.99')

      await wrapper.setProps({ currency: 'EUR' })
      await wrapper.vm.$nextTick()

      expect(getInputValue(wrapper)).toBe('50')
      const emissions = wrapper.emitted('update:modelValue')
      expect(emissions?.[emissions.length - 1]).toEqual([50])
    })

    it('re-derives minor units from the displayed decimal (not the raw stored integer) on every currency change, even repeated ones', async () => {
      const wrapper = mountCurrencyInput({ modelValue: 250, currency: 'USD' })

      expect(getInputValue(wrapper)).toBe('2.50')

      await wrapper.setProps({ currency: 'EUR' })
      await wrapper.vm.$nextTick()
      expect(getInputValue(wrapper)).toBe('3')

      await wrapper.setProps({ currency: 'USD' })
      await wrapper.vm.$nextTick()
      expect(getInputValue(wrapper)).toBe('3.00')

      const emissions = wrapper.emitted('update:modelValue')
      expect(emissions?.[emissions.length - 1]).toEqual([300])
    })
  })

  it('does not reconvert modelValue when currency and modelValue change together in the same tick (e.g. a form loading a fetched price and currency at once)', async () => {
    const wrapper = mountCurrencyInput({ modelValue: 4999, currency: 'USD' })

    expect(getInputValue(wrapper)).toBe('49.99')

    await wrapper.setProps({ currency: 'EUR', modelValue: 5000 })
    await wrapper.vm.$nextTick()

    expect(getInputValue(wrapper)).toBe('50.00')
    expect(wrapper.props('modelValue')).toBe(5000)
  })
})
