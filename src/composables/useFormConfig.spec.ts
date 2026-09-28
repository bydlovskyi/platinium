import Schema from 'async-validator'

async function validate (rule: IElementPlus['FormItemRule'], value: unknown): Promise<string | undefined> {
  const { trigger: _trigger, ...descriptor } = rule

  try {
    await new Schema({ field: descriptor }).validate({ field: value })
    return undefined
  } catch (error) {
    return (error as { errors: { message: string }[] }).errors[0]?.message
  }
}

describe('useRequiredRule', () => {
  it('rejects an empty value and accepts a filled one', async () => {
    expect(await validate(useRequiredRule(), '')).toBe('Required field')
    expect(await validate(useRequiredRule(), 'Early Bird')).toBeUndefined()
  })

  it('lets whitespace-only text through by default', async () => {
    expect(await validate(useRequiredRule(), '   ')).toBeUndefined()
  })

  it('rejects whitespace-only text when `whitespace` is set', async () => {
    expect(await validate(useRequiredRule({ whitespace: true }), '   ')).toBe('Required field')
    expect(await validate(useRequiredRule({ whitespace: true }), ' VIP ')).toBeUndefined()
  })

  it('keeps non-string values valid when `whitespace` is off', async () => {
    expect(await validate(useRequiredRule(), 0)).toBeUndefined()
  })

  it('accepts an empty value when `required` is false', async () => {
    expect(await validate(useRequiredRule({ required: false }), '')).toBeUndefined()
  })
})

describe('length and email rules', () => {
  it('enforces the maximum length', async () => {
    expect(await validate(useMaxLenRule(5), 'abcdef')).toBe('Maximum 5 characters')
    expect(await validate(useMaxLenRule(5), 'abcde')).toBeUndefined()
  })

  it('enforces the minimum length', async () => {
    expect(await validate(useMinLenRule(3), 'ab')).toBe('Minimum 3 characters')
    expect(await validate(useMinLenRule(3), 'abc')).toBeUndefined()
  })

  it('rejects a malformed email', async () => {
    expect(await validate(useEmailRule(), 'not-an-email')).toBe('Invalid email')
    expect(await validate(useEmailRule(), 'admin@platinium.test')).toBeUndefined()
  })
})
