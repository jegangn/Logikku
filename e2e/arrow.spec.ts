import { test, expect } from '@playwright/test'

test('arrow URL renders the board with the arrow overlay', async ({ page }) => {
  await page.goto('/play?variant=arrow&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  await expect(page.getByTestId('arrow-overlay')).toBeVisible()
  const cells = page.getByRole('gridcell')
  await expect(cells).toHaveCount(81)
})
