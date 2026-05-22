import { test, expect } from '@playwright/test'

const LANDSCAPE = { width: 1080, height: 810 }

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
})

test('keyboard-only: select, arrow-navigate, enter a digit', async ({ page }) => {
  await page.goto('/variant/classic')
  await page.getByTestId('difficulty-easy').click()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page.getByTestId('board')).toBeVisible()

  // Arrow keys move the selection (independent of which cells are givens).
  await page.getByTestId('cell-0-0').click()
  await expect(page.getByTestId('cell-0-0')).toHaveAttribute('data-selected', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('cell-0-1')).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('cell-0-0')).toHaveAttribute('data-selected', 'false')

  // Typing a digit into an empty cell enters it (find one at runtime so the
  // test never depends on a specific puzzle's given layout).
  const emptyCell = page.locator('[role="gridcell"][aria-label*="empty" i]').first()
  const cellTestId = await emptyCell.getAttribute('data-testid')
  expect(cellTestId).toBeTruthy()
  await emptyCell.click()
  await page.keyboard.press('5')
  await expect(page.getByTestId(cellTestId!)).toHaveAttribute('aria-label', /entered 5/i)
})

test('language switch updates visible copy', async ({ page }) => {
  await page.goto('/settings')
  await page.getByTestId('language-ms').click()
  await expect(page.getByRole('heading', { name: 'Tetapan' })).toBeVisible()
  await page.getByTestId('language-en').click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})
