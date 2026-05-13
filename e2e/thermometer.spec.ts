import { test, expect } from '@playwright/test'

test('thermometer URL renders the board with the thermometer overlay', async ({ page }) => {
  await page.goto('/play?variant=thermometer&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  await expect(page.getByTestId('thermometer-overlay')).toBeVisible()
  const cells = page.getByRole('gridcell')
  await expect(cells).toHaveCount(81)
})
