import { test, expect } from '@playwright/test'

const VARIANTS = ['palindrome', 'renban', 'german-whispers'] as const

for (const variant of VARIANTS) {
  test(`${variant} URL renders the board with the path overlay`, async ({ page }) => {
    await page.goto(`/play?variant=${variant}&difficulty=easy`)
    await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
    await expect(page.getByTestId('path-overlay')).toBeVisible()
    const cells = page.getByRole('gridcell')
    await expect(cells).toHaveCount(81)
  })
}
