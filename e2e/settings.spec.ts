import { test, expect } from '@playwright/test'

test('settings page toggles theme between light and dark', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  await page.getByTestId('theme-light').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByTestId('theme-dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('backup downloads a JSON file', async ({ page }) => {
  await page.goto('/play?variant=classic&difficulty=easy')
  await page.waitForURL(/puzzleId=/)
  let target = null
  for (let r = 0; r < 9 && !target; r++) {
    for (let c = 0; c < 9 && !target; c++) {
      const cell = page.getByTestId(`cell-${r}-${c}`)
      const given = await cell.getAttribute('data-given')
      if (given === 'false') target = cell
    }
  }
  await target!.click()
  await page.keyboard.press('5')
  await page.waitForTimeout(300)

  await page.goto('/settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('action-backup').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^logikku-backup-\d{4}-\d{2}-\d{2}\.json$/)
})

test('home shows stats and settings links', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('link-stats')).toBeVisible()
  await expect(page.getByTestId('link-settings')).toBeVisible()
  await page.getByTestId('link-stats').click()
  await expect(page).toHaveURL(/\/stats/)
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible()
})
