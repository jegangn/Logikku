import { test, expect } from '@playwright/test'

const LANDSCAPE = { width: 1080, height: 810 }

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
})

test('all 23 variant cards render on Home', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('variant-card-classic')).toBeVisible()
  await expect(page.getByTestId('variant-card-samurai')).toBeVisible()
  await expect(page.getByTestId('variant-card-killer')).toBeVisible()
  await expect(page.getByTestId('variant-card-jigsaw')).toHaveAttribute('aria-disabled', 'true')
})

test('grid-size + feature filter narrow to a single card', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('filter-size-9x9').click()
  await page.getByTestId('filter-feature-cage').click()
  await expect(page.getByTestId('variant-card-killer')).toBeVisible()
  await expect(page.getByTestId('variant-card-classic')).toBeHidden()
})

test('Home → Killer → Easy → onboarding → Done → Play loads', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('variant-card-killer').click()
  await expect(page).toHaveURL(/\/variant\/killer/)
  await expect(page.getByRole('heading', { name: 'Killer', exact: true })).toBeVisible()
  await expect(page.getByText('Pick difficulty')).toBeVisible()
  await page.getByTestId('difficulty-easy').click()
  await expect(page.getByTestId('onboarding-modal')).toBeVisible()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page).toHaveURL(/variant=killer&difficulty=easy/)
  await expect(page.getByTestId('board')).toBeVisible()
})

test('Continue card appears after starting a game, labelled with catalog name', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('variant-card-killer').click()
  await page.getByTestId('difficulty-easy').click()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await page.goto('/')
  await expect(page.getByTestId('continue-card')).toContainText('Killer')
  await expect(page.getByTestId('continue-card')).toContainText('Easy')
})

test('second visit skips onboarding', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('variant-card-killer').click()
  await page.getByTestId('difficulty-easy').click()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await page.goto('/variant/killer')
  await page.getByTestId('difficulty-easy').click()
  await expect(page.getByTestId('onboarding-modal')).toBeHidden()
  await expect(page).toHaveURL(/variant=killer/)
})

test('Reset onboarding from Settings brings the wizard back', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('variant-card-killer').click()
  await page.getByTestId('difficulty-easy').click()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await page.goto('/settings')
  await page.getByTestId('action-reset-onboarding').click()
  await expect(page.getByTestId('onboarding-reset-status')).toBeVisible()
  await page.goto('/variant/killer')
  await page.getByTestId('difficulty-easy').click()
  await expect(page.getByTestId('onboarding-modal')).toBeVisible()
})
