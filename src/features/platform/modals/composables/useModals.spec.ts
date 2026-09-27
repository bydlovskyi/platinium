// `modals` is module-level shared state, so clear it between tests.
describe('useModals', () => {
  afterEach(() => {
    const { modals } = useModals()

    modals.value.clear()
  })

  it('has no open modals initially', () => {
    const { isOpen } = useModals()

    expect(isOpen.value.CategoryModal).toBeUndefined()
  })

  it('opens a registered modal by name, with its props', () => {
    const { openModal, isOpen, modals } = useModals()
    const onSaved = (): undefined => undefined

    openModal('CategoryModal', { onSaved })

    expect(isOpen.value.CategoryModal).toBe(true)
    expect(modals.value.get('CategoryModal')?.props).toEqual({ onSaved })
  })

  it('closeModal marks it closed without removing it from the registry', () => {
    const { openModal, closeModal, isOpen, modals } = useModals()

    openModal('CategoryModal', {})
    closeModal('CategoryModal')

    expect(isOpen.value.CategoryModal).toBe(false)
    expect(modals.value.has('CategoryModal')).toBe(true)
  })

  it('closeModal on a modal that was never opened is a no-op, not a throw', () => {
    const { closeModal, isOpen } = useModals()

    expect(() => closeModal('CategoryModal')).not.toThrow()
    expect(isOpen.value.CategoryModal).toBeUndefined()
  })

  it('re-opening an already-open modal keeps it open with the new props', () => {
    const { openModal, isOpen, modals } = useModals()
    const firstOnSaved = (): undefined => undefined
    const secondOnSaved = (): undefined => undefined

    openModal('CategoryModal', { onSaved: firstOnSaved })
    openModal('CategoryModal', { onSaved: secondOnSaved })

    expect(isOpen.value.CategoryModal).toBe(true)
    expect(modals.value.get('CategoryModal')?.props).toEqual({ onSaved: secondOnSaved })
  })

  it('shares state across every call — the registry is a single source of truth, not per-caller state', () => {
    const first = useModals()
    const second = useModals()

    first.openModal('CategoryModal', {})

    expect(second.isOpen.value.CategoryModal).toBe(true)
  })
})
