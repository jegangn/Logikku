import { test, expect } from '@playwright/test'

test('killer URL renders the board with the killer overlay', async ({ page }) => {
  await page.goto('/play?variant=killer&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  await expect(page.getByTestId('killer-overlay')).toBeVisible()
  const cells = page.getByRole('gridcell')
  await expect(cells).toHaveCount(81)
})
