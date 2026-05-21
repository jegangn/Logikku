import { test, expect } from '@playwright/test'

test('home → classic → easy → play loads the board', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Logikku' })).toBeVisible()
  await page.getByTestId('variant-card-classic').click()
  await expect(page).toHaveURL(/\/variant\/classic/)
  await page.getByTestId('difficulty-easy').click()
  // First play of a variant shows the onboarding wizard; dismiss it.
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page).toHaveURL(/\/play/)
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()
  const cells = page.getByRole('gridcell')
  await expect(cells).toHaveCount(81)
})

test('selecting a cell and entering a digit places the value', async ({ page }) => {
  await page.goto('/play?variant=classic&difficulty=easy')
  await expect(page.getByRole('grid', { name: /sudoku board/i })).toBeVisible()

  let emptyCell = null
  for (let r = 0; r < 9 && !emptyCell; r++) {
    for (let c = 0; c < 9 && !emptyCell; c++) {
      const target = page.getByTestId(`cell-${r}-${c}`)
      const given = await target.getAttribute('data-given')
      if (given === 'false') emptyCell = { target, r, c }
    }
  }
  expect(emptyCell).not.toBeNull()
  await emptyCell!.target.click()
  await expect(emptyCell!.target).toHaveAttribute('data-selected', 'true')
  await page.keyboard.press('5')
  await expect(emptyCell!.target.locator('text')).toContainText('5')
})

test('pencil mode adds pencil marks', async ({ page }) => {
  await page.goto('/play?variant=classic&difficulty=easy')
  let emptyCell = null
  for (let r = 0; r < 9 && !emptyCell; r++) {
    for (let c = 0; c < 9 && !emptyCell; c++) {
      const target = page.getByTestId(`cell-${r}-${c}`)
      const given = await target.getAttribute('data-given')
      if (given === 'false') emptyCell = target
    }
  }
  await emptyCell!.click()
  await page.getByRole('tab', { name: 'Pencil' }).click()
  await page.getByTestId('digit-3').click()
  await expect(emptyCell!.locator('text')).toContainText('3')
})
