import { test, expect } from '@playwright/test'

test('mid-game state survives a reload', async ({ page }) => {
  await page.goto('/play?variant=classic&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  await page.waitForURL(/puzzleId=/)
  const url = page.url()

  let emptyCell = null
  for (let r = 0; r < 9 && !emptyCell; r++) {
    for (let c = 0; c < 9 && !emptyCell; c++) {
      const target = page.getByTestId(`cell-${r}-${c}`)
      const given = await target.getAttribute('data-given')
      if (given === 'false') emptyCell = { target, r, c }
    }
  }
  await emptyCell!.target.click()
  await page.keyboard.press('5')
  await expect(emptyCell!.target.locator('text')).toContainText('5')

  await page.waitForTimeout(700)

  await page.goto(url)
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  await expect(
    page.getByTestId(`cell-${emptyCell!.r}-${emptyCell!.c}`).locator('text'),
  ).toContainText('5')
})

test('undo / redo work via the toolbar buttons', async ({ page }) => {
  await page.goto('/play?variant=classic&difficulty=easy')
  await page.waitForURL(/puzzleId=/)

  let emptyCell = null
  for (let r = 0; r < 9 && !emptyCell; r++) {
    for (let c = 0; c < 9 && !emptyCell; c++) {
      const target = page.getByTestId(`cell-${r}-${c}`)
      const given = await target.getAttribute('data-given')
      if (given === 'false') emptyCell = target
    }
  }

  await emptyCell!.click()
  await page.keyboard.press('5')
  await expect(emptyCell!.locator('text')).toContainText('5')

  await page.getByTestId('undo-btn').click()
  await expect(emptyCell!.locator('text')).toHaveCount(0)

  await page.getByTestId('redo-btn').click()
  await expect(emptyCell!.locator('text')).toContainText('5')
})

test('home shows a Continue card after an in-progress game', async ({ page }) => {
  await page.goto('/play?variant=classic&difficulty=easy')
  await page.waitForURL(/puzzleId=/)
  let emptyCell = null
  for (let r = 0; r < 9 && !emptyCell; r++) {
    for (let c = 0; c < 9 && !emptyCell; c++) {
      const target = page.getByTestId(`cell-${r}-${c}`)
      const given = await target.getAttribute('data-given')
      if (given === 'false') emptyCell = target
    }
  }
  await emptyCell!.click()
  await page.keyboard.press('5')
  await page.waitForTimeout(700)

  await page.goto('/')
  await expect(page.getByTestId('continue-card')).toBeVisible()
})
