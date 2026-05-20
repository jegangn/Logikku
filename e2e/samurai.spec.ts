import { test, expect } from '@playwright/test'

const URL = '/play?variant=samurai&difficulty=easy'
const LANDSCAPE = { width: 1080, height: 810 }
const PORTRAIT = { width: 810, height: 1080 }

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
})

test('samurai cruciform mounts with 5 sub-grids and 405 cells', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  for (let i = 0; i < 5; i++) {
    await expect(page.getByTestId(`samurai-subgrid-${i}`)).toBeVisible()
  }
  await expect(page.getByRole('gridcell')).toHaveCount(405)
  await expect(page.getByText(/Samurai · Easy/)).toBeVisible()
})

test('viewBox is 0 0 630 630', async ({ page }) => {
  await page.goto(URL)
  const svg = page.getByTestId('samurai-board')
  await expect(svg).toHaveAttribute('viewBox', '0 0 630 630')
})

test('tapping center (1,1) highlights both center and NW (7,7)', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const center = page.getByTestId('samurai-subgrid-0').getByTestId('cell-1-1')
  await center.click()
  await expect(center).toHaveAttribute('data-selected', 'true')
  const nw = page.getByTestId('samurai-subgrid-1').getByTestId('cell-7-7')
  await expect(nw).toHaveAttribute('data-selected', 'true')
})

test('keyboard digit places in both shared cells', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const center = page.getByTestId('samurai-subgrid-0').getByTestId('cell-1-1')
  await center.click()
  await page.keyboard.press('7')
  await expect(center).toHaveAttribute('aria-label', /entered 7/)
  const nw = page.getByTestId('samurai-subgrid-1').getByTestId('cell-7-7')
  await expect(nw).toHaveAttribute('aria-label', /entered 7/)
})

test('Backspace clears both sides of a shared placement', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const center = page.getByTestId('samurai-subgrid-0').getByTestId('cell-1-1')
  await center.click()
  await page.keyboard.press('7')
  await page.keyboard.press('Backspace')
  await expect(center).toHaveAttribute('aria-label', /empty/)
  const nw = page.getByTestId('samurai-subgrid-1').getByTestId('cell-7-7')
  await expect(nw).toHaveAttribute('aria-label', /empty/)
})

test('undo reverses a shared placement', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const center = page.getByTestId('samurai-subgrid-0').getByTestId('cell-1-1')
  await center.click()
  await page.keyboard.press('7')
  await page.keyboard.press('Control+z')
  await expect(center).toHaveAttribute('aria-label', /empty/)
  const nw = page.getByTestId('samurai-subgrid-1').getByTestId('cell-7-7')
  await expect(nw).toHaveAttribute('aria-label', /empty/)
})

test('conflict in a shared cell appears in both center and NW', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const center11 = page.getByTestId('samurai-subgrid-0').getByTestId('cell-1-1')
  const center15 = page.getByTestId('samurai-subgrid-0').getByTestId('cell-1-5')
  await center11.click()
  await page.keyboard.press('5')
  await expect(center11).toHaveAttribute('aria-label', /entered 5/)
  await center15.click()
  await expect(center15).toHaveAttribute('data-selected', 'true')
  await page.keyboard.press('5')
  await expect(center15).toHaveAttribute('aria-label', /entered 5/)
  await expect(center11).toHaveAttribute('data-conflict', 'true')
  await expect(
    page.getByTestId('samurai-subgrid-1').getByTestId('cell-7-7'),
  ).toHaveAttribute('data-conflict', 'true')
})

test('portrait orientation swaps cruciform for RotateDevicePrompt', async ({ page }) => {
  await page.setViewportSize(PORTRAIT)
  await page.goto(URL)
  await expect(page.getByTestId('rotate-device-prompt')).toBeVisible()
  await expect(page.getByTestId('samurai-board')).toBeHidden()
  await page.setViewportSize(LANDSCAPE)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  await expect(page.getByTestId('rotate-device-prompt')).toBeHidden()
})

test('landscape screenshot of the cruciform', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  await page.screenshot({
    path: 'e2e/__screenshots__/samurai-landscape.png',
    fullPage: false,
  })
})
