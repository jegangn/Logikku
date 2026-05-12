import { test, expect } from '@playwright/test'

test('anti-knight URL renders and flags a knight-move duplicate', async ({ page }) => {
  await page.goto('/play?variant=anti-knight&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()

  // Find two empty cells separated by a knight move.
  let aCell: { r: number; c: number } | null = null
  let bCell: { r: number; c: number } | null = null
  outer: for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const target = page.getByTestId(`cell-${r}-${c}`)
      if ((await target.getAttribute('data-given')) !== 'false') continue
      for (const [dr, dc] of [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ] as const) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) continue
        const peer = page.getByTestId(`cell-${nr}-${nc}`)
        if ((await peer.getAttribute('data-given')) !== 'false') continue
        aCell = { r, c }
        bCell = { r: nr, c: nc }
        break outer
      }
    }
  }
  test.skip(!aCell || !bCell, 'sample puzzle had no empty knight-pair')

  await page.getByTestId(`cell-${aCell!.r}-${aCell!.c}`).click()
  await page.keyboard.press('4')
  await page.getByTestId(`cell-${bCell!.r}-${bCell!.c}`).click()
  await page.keyboard.press('4')

  await expect(
    page.getByTestId(`cell-${aCell!.r}-${aCell!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
  await expect(
    page.getByTestId(`cell-${bCell!.r}-${bCell!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
})

test('anti-king URL renders and flags a diagonal-adjacent duplicate', async ({ page }) => {
  await page.goto('/play?variant=anti-king&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()

  let aCell: { r: number; c: number } | null = null
  let bCell: { r: number; c: number } | null = null
  outer: for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const target = page.getByTestId(`cell-${r}-${c}`)
      if ((await target.getAttribute('data-given')) !== 'false') continue
      for (const [dr, dc] of [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ] as const) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) continue
        const peer = page.getByTestId(`cell-${nr}-${nc}`)
        if ((await peer.getAttribute('data-given')) !== 'false') continue
        aCell = { r, c }
        bCell = { r: nr, c: nc }
        break outer
      }
    }
  }
  test.skip(!aCell || !bCell, 'sample puzzle had no empty diagonal-pair')

  await page.getByTestId(`cell-${aCell!.r}-${aCell!.c}`).click()
  await page.keyboard.press('7')
  await page.getByTestId(`cell-${bCell!.r}-${bCell!.c}`).click()
  await page.keyboard.press('7')

  await expect(
    page.getByTestId(`cell-${aCell!.r}-${aCell!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
  await expect(
    page.getByTestId(`cell-${bCell!.r}-${bCell!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
})

test('non-consecutive URL renders and flags consecutive orthogonal pair', async ({ page }) => {
  await page.goto('/play?variant=non-consecutive&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()

  let aCell: { r: number; c: number } | null = null
  let bCell: { r: number; c: number } | null = null
  outer: for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 8; c++) {
      const left = page.getByTestId(`cell-${r}-${c}`)
      const right = page.getByTestId(`cell-${r}-${c + 1}`)
      if ((await left.getAttribute('data-given')) !== 'false') continue
      if ((await right.getAttribute('data-given')) !== 'false') continue
      aCell = { r, c }
      bCell = { r, c: c + 1 }
      break outer
    }
  }
  test.skip(!aCell || !bCell, 'sample puzzle had no horizontal empty pair')

  await page.getByTestId(`cell-${aCell!.r}-${aCell!.c}`).click()
  await page.keyboard.press('5')
  await page.getByTestId(`cell-${bCell!.r}-${bCell!.c}`).click()
  await page.keyboard.press('6')

  await expect(
    page.getByTestId(`cell-${aCell!.r}-${aCell!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
  await expect(
    page.getByTestId(`cell-${bCell!.r}-${bCell!.c}`),
  ).toHaveAttribute('data-conflict', 'true')
})
