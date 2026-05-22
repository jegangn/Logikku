import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const LANDSCAPE = { width: 1080, height: 810 }

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
})

async function scan(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
}

test('Home has no axe violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('variant-card-classic')).toBeVisible()
  const results = await scan(page)
  expect(results.violations).toEqual([])
})

test('Variant detail has no axe violations', async ({ page }) => {
  await page.goto('/variant/classic')
  await expect(page.getByText('Pick difficulty', { exact: false })).toBeVisible()
  const results = await scan(page)
  expect(results.violations).toEqual([])
})

test('Play (classic) has no axe violations', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('variant-card-classic').click()
  await page.getByTestId('difficulty-easy').click()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page.getByTestId('board')).toBeVisible()
  const results = await scan(page)
  expect(results.violations).toEqual([])
})

test('Settings has no axe violations', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByTestId('theme-system')).toBeVisible()
  const results = await scan(page)
  expect(results.violations).toEqual([])
})
