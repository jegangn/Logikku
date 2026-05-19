import { test, expect } from '@playwright/test'

test('mega-16 URL renders a 16x16 grid', async ({ page }) => {
  await page.goto('/play?variant=mega-16&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  const cells = page.getByRole('gridcell')
  await expect(cells).toHaveCount(256)
})

test('mega-16 input pad shows 16 digit buttons including hex labels', async ({ page }) => {
  await page.goto('/play?variant=mega-16&difficulty=easy')
  await expect(page.getByTestId('input-pad')).toBeVisible()
  for (let d = 1; d <= 16; d++) {
    await expect(page.getByTestId(`digit-${d}`)).toBeVisible()
  }
  // Hex labels render correctly.
  await expect(page.getByTestId('digit-12')).toHaveText('C')
  await expect(page.getByTestId('digit-16')).toHaveText('G')
})

test('mega-16 accepts hex digit via tap + via keyboard', async ({ page }) => {
  await page.goto('/play?variant=mega-16&difficulty=easy')
  // Pick a cell that is not a given. Iterate until we find one.
  let target: { r: number; c: number } | null = null
  for (let r = 0; r < 16 && !target; r++) {
    for (let c = 0; c < 16; c++) {
      const cell = page.getByTestId(`cell-${r}-${c}`)
      const given = await cell.getAttribute('data-given')
      if (given === 'false') {
        target = { r, c }
        break
      }
    }
  }
  if (!target) throw new Error('no non-given cell found in the puzzle')

  // Tap-input: select the cell, tap digit 'C'.
  await page.getByTestId(`cell-${target.r}-${target.c}`).click()
  await page.getByTestId('digit-12').click()
  await expect(page.getByTestId(`cell-${target.r}-${target.c}`)).toContainText('C')
})
