import { baseRules } from './base'
import { stylisticRules } from './stylistic'
import { typescriptRules } from './typescript'
import { vueRules } from './vue'

export const eslintRules = {
  ...baseRules,
  ...typescriptRules,
  ...stylisticRules,
  ...vueRules
}
