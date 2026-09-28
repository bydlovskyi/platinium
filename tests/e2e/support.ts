import { expect, type Page } from '@playwright/test'

export const ACCOUNTS = {
  admin: { email: 'admin@platinium.test', password: 'admin123' },
  viewer: { email: 'viewer@platinium.test', password: 'viewer123' }
} as const

export async function signIn (page: Page, role: keyof typeof ACCOUNTS = 'admin'): Promise<void> {
  // Keep a `?redirect=` the app already put in the URL.
  if (!page.url().includes('/login')) {
    await page.goto('/login')
  }

  await page.getByLabel(/email/i).fill(ACCOUNTS[role].email)
  await page.getByLabel(/password/i).fill(ACCOUNTS[role].password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

// Element Plus renders a select's placeholder over its combobox input, so click the wrapper.
export async function pickOption (page: Page, comboboxName: string | RegExp, option: string | RegExp): Promise<void> {
  await page.locator('.el-select', { has: page.getByRole('combobox', { name: comboboxName }) }).click()
  await page.getByRole('option', { name: option }).first().click()
}

// Closed dropdowns stay in the DOM, so "the first option" must be scoped to the open one, and a remote
// select re-renders its options once the search settles, so the click waits for that.
export async function pickFirstVisibleOption (page: Page): Promise<void> {
  const dropdown = page.locator('.el-select-dropdown:visible').last()

  await expect(dropdown.getByText('Loading…')).toHaveCount(0)
  await expect(dropdown.getByRole('option').first()).toBeVisible()
  await page.waitForTimeout(300)
  await dropdown.getByRole('option').first().click()
}

// Rows on a laptop, cards below 1024 px.
export function listRows (page: Page, listName: string) {
  return page.getByRole('region', { name: listName }).locator('.el-table__body tr, .el-card')
}

export function formItem (page: Page, label: string) {
  return page.locator('.el-form-item').filter({ has: page.locator('.el-form-item__label', { hasText: label }) })
}
