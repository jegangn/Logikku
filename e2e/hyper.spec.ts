import { test, expect } from '@playwright/test'

test('hyper URL renders the board with the four-window overlay', async ({ page }) => {
  await page.goto('/play?variant=hyper&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  await expect(page.getByTestId('hyper-overlay')).toBeVisible()
  const cells = page.getByRole('gridcell')
  await expect(cells).toHaveCount(81)
})

test('hyper conflict detection respects a window', async ({ page }) => {
  await page.goto('/play?variant=hyper&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()

  // Window 1 covers rows 1-3, cols 1-3. Find two empty cells inside it.
  const candidates: Array<{ r: number; c: number }> = []
  for (let r = 1; r <= 3 && candidates.length < 2; r++) {
    for (let c = 1; c <= 3 && candidates.length < 2; c++) {
      const target = page.getByTestId(`cell-${r}-${c}`)
      const given = await target.getAttribute('data-given')
      if (given === 'false') candidates.push({ r, c })
    }
  }
  test.skip(
    candidates.length < 2,
    'sample puzzle had fewer than 2 empty cells in window-1',
  )

  await page.getByTestId(`cell-${candidates[0]!.r}-${candidates[0]!.c}`).click()
  await page.keyboard.press('4')
  await page.getByTestId(`cell-${candidates[1]!.r}-${candidates[1]!.c}`).click()
  await page.keyboard.press('4')

  await expect(
    page.getByTestId(`cell-${candidates[0]!.r}-${candidates[0]!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
  await expect(
    page.getByTestId(`cell-${candidates[1]!.r}-${candidates[1]!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
})
