import { test, expect } from '@playwright/test'

test('app loads with brand', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Logikku' })).toBeVisible()
})
