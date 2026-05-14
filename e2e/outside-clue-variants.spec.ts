import { test, expect } from '@playwright/test'

const VARIANTS = ['little-killer', 'sandwich', 'skyscraper'] as const

for (const variant of VARIANTS) {
  test(`${variant} URL renders the board with outside clues`, async ({ page }) => {
    await page.goto(`/play?variant=${variant}&difficulty=easy`)
    await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
    await expect(page.getByTestId('outside-clue-overlay')).toBeVisible()
    const cells = page.getByRole('gridcell')
    await expect(cells).toHaveCount(81)
  })
}
