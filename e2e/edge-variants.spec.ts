import { test, expect } from '@playwright/test'

for (const variant of ['kropki', 'xv', 'greater-than'] as const) {
  test(`${variant} URL renders the board with edge-mark overlay`, async ({ page }) => {
    await page.goto(`/play?variant=${variant}&difficulty=easy`)
    await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
    const cells = page.getByRole('gridcell')
    await expect(cells).toHaveCount(81)
    await expect(page.getByTestId('edge-mark-overlay')).toBeVisible()
  })
}
