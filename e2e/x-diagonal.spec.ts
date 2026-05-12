import { test, expect } from '@playwright/test'

test('x-diagonal URL renders the board with the diagonal overlay', async ({ page }) => {
  await page.goto('/play?variant=x-diagonal&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  await expect(page.getByTestId('x-diagonal-overlay')).toBeVisible()
  const cells = page.getByRole('gridcell')
  await expect(cells).toHaveCount(81)
})

test('x-diagonal conflict detection respects the diagonals', async ({ page }) => {
  await page.goto('/play?variant=x-diagonal&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()

  let firstDiagCell: { r: number; c: number } | null = null
  let secondDiagCell: { r: number; c: number } | null = null
  for (let i = 0; i < 9 && (!firstDiagCell || !secondDiagCell); i++) {
    const target = page.getByTestId(`cell-${i}-${i}`)
    const given = await target.getAttribute('data-given')
    if (given === 'false') {
      if (!firstDiagCell) firstDiagCell = { r: i, c: i }
      else if (!secondDiagCell) secondDiagCell = { r: i, c: i }
    }
  }
  test.skip(
    !firstDiagCell || !secondDiagCell,
    'sample puzzle had fewer than 2 empty cells on the NW-SE diagonal',
  )

  await page.getByTestId(`cell-${firstDiagCell!.r}-${firstDiagCell!.c}`).click()
  await page.keyboard.press('4')
  await page.getByTestId(`cell-${secondDiagCell!.r}-${secondDiagCell!.c}`).click()
  await page.keyboard.press('4')

  await expect(
    page.getByTestId(`cell-${firstDiagCell!.r}-${firstDiagCell!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
  await expect(
    page.getByTestId(`cell-${secondDiagCell!.r}-${secondDiagCell!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
})
