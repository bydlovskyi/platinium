import { expect, test } from '@playwright/test'

import { formItem, listRows, pickFirstVisibleOption, signIn } from './support'

// A thin smoke layer over the built bundle: it guards what jsdom cannot see (the service worker, real CSS,
// native form validation, the browser's history). The journeys themselves live in tests/integration.

test('an unauthenticated deep link survives the login round trip', async ({ page }) => {
  await page.goto('/tickets?status=on_sale')
  await expect(page).toHaveURL(/\/login\?redirect=/)

  await signIn(page)

  await expect(page).toHaveURL(/\/tickets\?status=on_sale/)
  await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
  await expect(listRows(page, 'Tickets').first()).toBeVisible()
})

test('the dashboard and every list render seeded data', async ({ page }) => {
  await signIn(page)

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Total events/ })).toBeVisible()

  const lists: [string, string][] = [['/events', 'Events'], ['/categories', 'Categories'], ['/tickets', 'Tickets']]

  for (const [path, heading] of lists) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    await expect(listRows(page, heading).first()).toBeVisible()
  }
})

test('the page size chosen on one page does not break the back button or a shared link', async ({ page }) => {
  await signIn(page)
  await page.goto('/events')

  await page.getByRole('listitem', { name: 'page 2' }).click()
  await expect(page).toHaveURL(/page=2/)

  await page.locator('.el-pagination .el-select').click()
  await page.getByRole('option', { name: /50\/page/ }).click()
  await expect(page).toHaveURL(/perPage=50/)

  await page.goBack()
  await expect(page).toHaveURL(/page=2$/)
  await expect(listRows(page, 'Events').first()).toBeVisible()
})

test('an admin can create a ticket with a price in cents and see it in the list', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Remote selects are covered on desktop; the mobile run keeps the layout checks.')

  await signIn(page)
  await page.goto('/tickets/new')

  const name = `Smoke ticket ${Date.now()}`

  await page.getByPlaceholder('General Admission').fill(name)
  await formItem(page, 'Currency').locator('.el-select').click()
  await page.getByRole('option', { name: 'EUR', exact: true }).click()

  // The browser's own step validation rejected "45.50" once; jsdom never runs it, so this stays in the browser.
  const price = formItem(page, 'Price').locator('input')
  await price.fill('45.50')
  await price.blur()

  await formItem(page, 'Quantity').locator('input').fill('10')
  await page.getByText('On sale', { exact: true }).click()

  await formItem(page, 'Event').locator('.el-select').click()
  await pickFirstVisibleOption(page)
  await formItem(page, 'Category').locator('.el-select').click()
  await pickFirstVisibleOption(page)

  await page.getByRole('button', { name: 'Create ticket' }).click()

  await expect(page.locator('.el-notification')).toContainText('Ticket created.')
  await expect(page).toHaveURL(/\/tickets$/)

  await page.getByRole('textbox', { name: 'Search' }).fill(name)
  await expect(listRows(page, 'Tickets').first()).toContainText('€45.50')
})

test('a viewer sees no write controls and cannot open a write route', async ({ page }) => {
  await signIn(page, 'viewer')
  await page.goto('/events')

  await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create event' })).toHaveCount(0)
  await expect(page.getByRole('checkbox')).toHaveCount(0)

  await page.goto('/events/new')
  await expect(page).toHaveURL(/\/403/)
})
