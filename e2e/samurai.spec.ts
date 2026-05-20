import { test, expect, type Page, type Locator } from '@playwright/test'

const URL = '/play?variant=samurai&difficulty=easy'
const LANDSCAPE = { width: 1080, height: 810 }
const PORTRAIT = { width: 810, height: 1080 }

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
})

// Find a non-given shared-cell pair (center side + its mirror in a corner).
// Generated banks have ~30 givens per sub-grid; cell-1-1 is often a given,
// so each samurai test that wants to place a digit on a shared cell calls
// this to pick a known-empty one. Maps cruciform overlaps via SAMURAI_LAYOUT.
async function findEmptySharedCell(page: Page): Promise<{
  center: Locator
  corner: Locator
}> {
  const centerGrid = page.getByTestId('samurai-subgrid-0')
  const corners: ReadonlyArray<[number, number, number, number, number]> = [
    [1, 0, 0, 2, 2],
    [2, 0, 2, 2, 0],
    [3, 2, 0, 0, 2],
    [4, 2, 2, 0, 0],
  ]
  for (const [cornerIdx, cbr, cbc, xbr, xbc] of corners) {
    const cornerGrid = page.getByTestId(`samurai-subgrid-${cornerIdx}`)
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const centerR = cbr * 3 + dr
        const centerC = cbc * 3 + dc
        const cell = centerGrid.getByTestId(`cell-${centerR}-${centerC}`)
        if ((await cell.getAttribute('data-given')) === 'false') {
          const cornerR = xbr * 3 + dr
          const cornerC = xbc * 3 + dc
          return {
            center: cell,
            corner: cornerGrid.getByTestId(`cell-${cornerR}-${cornerC}`),
          }
        }
      }
    }
  }
  throw new Error('no empty shared cell across the four cruciform overlaps')
}

// Find an empty (non-given) center cell that's a classic peer of the
// shared anchor (row, col). Searches row → column → box in order, since
// any of those will trigger a conflict if the same digit lands in both.
async function findEmptyCenterPeerCell(
  page: Page,
  row: number,
  col: number,
): Promise<Locator> {
  const centerGrid = page.getByTestId('samurai-subgrid-0')
  const isEmpty = async (r: number, c: number): Promise<boolean> => {
    if (r === row && c === col) return false
    const cell = centerGrid.getByTestId(`cell-${r}-${c}`)
    return (await cell.getAttribute('data-given')) === 'false'
  }
  for (let c = 0; c < 9; c++) {
    if (await isEmpty(row, c)) return centerGrid.getByTestId(`cell-${row}-${c}`)
  }
  for (let r = 0; r < 9; r++) {
    if (await isEmpty(r, col)) return centerGrid.getByTestId(`cell-${r}-${col}`)
  }
  const boxR = Math.floor(row / 3) * 3
  const boxC = Math.floor(col / 3) * 3
  for (let r = boxR; r < boxR + 3; r++) {
    for (let c = boxC; c < boxC + 3; c++) {
      if (await isEmpty(r, c)) return centerGrid.getByTestId(`cell-${r}-${c}`)
    }
  }
  throw new Error(`no empty peer of center (${row},${col}) found`)
}

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

test('tapping a shared cell highlights it in both center and the corner', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const { center, corner } = await findEmptySharedCell(page)
  await center.click()
  await expect(center).toHaveAttribute('data-selected', 'true')
  await expect(corner).toHaveAttribute('data-selected', 'true')
})

test('keyboard digit places in both shared cells', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const { center, corner } = await findEmptySharedCell(page)
  await center.click()
  await page.keyboard.press('7')
  await expect(center).toHaveAttribute('aria-label', /entered 7/)
  await expect(corner).toHaveAttribute('aria-label', /entered 7/)
})

test('Backspace clears both sides of a shared placement', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const { center, corner } = await findEmptySharedCell(page)
  await center.click()
  await page.keyboard.press('7')
  await page.keyboard.press('Backspace')
  await expect(center).toHaveAttribute('aria-label', /empty/)
  await expect(corner).toHaveAttribute('aria-label', /empty/)
})

test('undo reverses a shared placement', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const { center, corner } = await findEmptySharedCell(page)
  await center.click()
  await page.keyboard.press('7')
  await page.keyboard.press('Control+z')
  await expect(center).toHaveAttribute('aria-label', /empty/)
  await expect(corner).toHaveAttribute('aria-label', /empty/)
})

test('conflict in a shared cell appears in both center and its corner', async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const { center: shared, corner } = await findEmptySharedCell(page)
  // Pick a same-row partner cell to provoke a row conflict. Parse the
  // shared cell's testid to find its row.
  const sharedTestId = await shared.getAttribute('data-testid')
  const parsed = /^cell-(\d+)-(\d+)$/.exec(sharedTestId ?? '')
  if (!parsed) throw new Error(`shared cell testid malformed: ${sharedTestId}`)
  const sharedRow = parseInt(parsed[1]!, 10)
  const sharedCol = parseInt(parsed[2]!, 10)
  const partner = await findEmptyCenterPeerCell(page, sharedRow, sharedCol)
  await shared.click()
  await page.keyboard.press('5')
  await expect(shared).toHaveAttribute('aria-label', /entered 5/)
  await partner.click()
  await expect(partner).toHaveAttribute('data-selected', 'true')
  await page.keyboard.press('5')
  await expect(partner).toHaveAttribute('aria-label', /entered 5/)
  await expect(shared).toHaveAttribute('data-conflict', 'true')
  await expect(corner).toHaveAttribute('data-conflict', 'true')
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

test('real bank puzzle shows visible given cells', async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const givens = await page.locator('[data-given="true"]').count()
  expect(givens).toBeGreaterThan(50)
})

test('given cell rejects user input', async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const givenCell = page.locator('[data-given="true"]').first()
  const labelBefore = await givenCell.getAttribute('aria-label')
  await givenCell.click()
  await page.keyboard.press('9')
  await expect(givenCell).toHaveAttribute('aria-label', labelBefore!)
})
