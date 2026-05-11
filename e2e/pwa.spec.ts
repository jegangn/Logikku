import { test, expect } from '@playwright/test'

test('manifest is reachable and well-formed', async ({ page }) => {
  const res = await page.request.get('/manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const manifest = await res.json()
  expect(manifest.name).toBe('Logikku')
  expect(manifest.start_url).toBe('/')
  expect(manifest.display).toBe('standalone')
  expect(Array.isArray(manifest.icons)).toBeTruthy()
  expect(manifest.icons.length).toBeGreaterThan(2)
  const sizes = new Set(manifest.icons.map((i: { sizes: string }) => i.sizes))
  expect(sizes.has('192x192')).toBeTruthy()
  expect(sizes.has('512x512')).toBeTruthy()
  const maskable = manifest.icons.filter(
    (i: { purpose?: string }) => i.purpose === 'maskable',
  )
  expect(maskable.length).toBeGreaterThan(0)
})

test('apple-touch-icon and splash assets are served', async ({ page }) => {
  const touchIcon = await page.request.get('/apple-touch-icon.png')
  expect(touchIcon.ok()).toBeTruthy()
  const splash = await page.request.get('/splash/ipad-12.9-portrait.png')
  expect(splash.ok()).toBeTruthy()
})

test('service worker registers on the home page', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit emulator does not enable Service Workers reliably')
  await page.goto('/')
  const supported = await page.evaluate(() => 'serviceWorker' in navigator)
  expect(supported).toBeTruthy()

  let registered = false
  for (let i = 0; i < 30; i++) {
    registered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      return reg !== undefined && reg !== null
    })
    if (registered) break
    await page.waitForTimeout(500)
  }
  expect(registered).toBe(true)
})

test('iPad meta tags are present in the page head', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    'content',
    'yes',
  )
  await expect(
    page.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
  ).toHaveAttribute('content', 'black-translucent')
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/apple-touch-icon.png',
  )
  const startupCount = await page.locator('link[rel="apple-touch-startup-image"]').count()
  expect(startupCount).toBeGreaterThan(4)
})
