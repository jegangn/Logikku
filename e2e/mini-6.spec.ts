import { test, expect } from '@playwright/test'

test('mini-6 URL renders a 6x6 grid', async ({ page }) => {
  await page.goto('/play?variant=mini-6&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  const cells = page.getByRole('gridcell')
  await expect(cells).toHaveCount(36)
})

test('mini-6 input pad shows only six digit buttons', async ({ page }) => {
  await page.goto('/play?variant=mini-6&difficulty=easy')
  await expect(page.getByTestId('input-pad')).toBeVisible()
  for (let d = 1; d <= 6; d++) {
    await expect(page.getByTestId(`digit-${d}`)).toBeVisible()
  }
  await expect(page.getByTestId('digit-7')).toHaveCount(0)
  await expect(page.getByTestId('digit-9')).toHaveCount(0)
})
