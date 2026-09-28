export function useElFormRef<T extends IElementPlus['FormInstance']> (initialValue: T | null) {
  return ref(initialValue)
}

export function useElFormModel<T extends object> (model: T) {
  return reactive<T>(model)
}

// `whitespace` switches async-validator to its string validator, so enable it only on text fields.
export function useRequiredRule ({ required = true, whitespace = false } = {}): IElementPlus['FormItemRule'] {
  return whitespace
    ? { required, whitespace, message: 'Required field', trigger: 'change' }
    : { required, message: 'Required field', trigger: 'change' }
}

export function useMaxLenRule (max: number): IElementPlus['FormItemRule'] {
  return { max, message: `Maximum ${max} characters`, trigger: 'change' }
}
