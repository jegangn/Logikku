import { test, expect } from '@playwright/test'

test('a wrong number counts a mistake and turns the cell red', async ({ page }) => {
  await page.goto('/play?variant=classic&difficulty=easy')
  await page.waitForURL(/puzzleId=/)
  await expect(page.getByTestId('status-mistakes')).toContainText('0/3')

  // Pick an empty cell and a digit already given in its row — guaranteed wrong.
  const pick = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('[data-testid^="cell-"]')].map((el) => ({
      r: Number(el.getAttribute('data-cell-r')),
      c: Number(el.getAttribute('data-cell-c')),
      given: el.getAttribute('data-given') === 'true',
      text: (el.textContent || '').trim(),
    }))
    const empty = cells.find((x) => !x.given && x.text === '')!
    const rowGiven = cells.find((x) => x.r === empty.r && x.given && /^[1-9]$/.test(x.text))!
    return { r: empty.r, c: empty.c, digit: rowGiven.text }
  })

  await page.getByTestId(`cell-${pick.r}-${pick.c}`).click()
  await page.locator(`button[data-digit="${pick.digit}"]`).click()

  await expect(page.getByTestId('status-mistakes')).toContainText('1/3')
  await expect(page.getByTestId(`cell-${pick.r}-${pick.c}`)).toHaveAttribute('data-conflict', 'true')
})
