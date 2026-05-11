import { launch as launchChrome } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const URL = process.env.LIGHTHOUSE_URL ?? 'http://localhost:4173'
const THRESHOLDS = {
  performance: 80,
  accessibility: 80,
  'best-practices': 80,
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* keep polling */
    }
    await sleep(500)
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`)
}

async function run() {
  const previewArg = process.env.LIGHTHOUSE_SKIP_PREVIEW
  let preview
  if (!previewArg) {
    console.log('starting vite preview on :4173 ...')
    preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
      stdio: 'inherit',
      shell: true,
    })
    await waitForServer(URL)
  }

  const chrome = await launchChrome({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  })

  try {
    console.log('running lighthouse against', URL, '(chrome port', chrome.port + ')')
    let result
    try {
      result = await lighthouse(
        URL,
        {
          port: chrome.port,
          output: 'json',
          logLevel: 'info',
          onlyCategories: ['performance', 'accessibility', 'best-practices'],
        },
      )
    } catch (e) {
      console.error('lighthouse() threw:', e)
      throw e
    }
    if (!result) throw new Error('Lighthouse returned no result')

    const cats = result.lhr.categories
    const scores = Object.fromEntries(
      Object.entries(cats).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)]),
    )

    console.log('\nLighthouse scores:')
    for (const [k, v] of Object.entries(scores)) console.log(`  ${k.padEnd(16)} ${v}`)

    let failed = false
    for (const [k, threshold] of Object.entries(THRESHOLDS)) {
      const score = scores[k] ?? 0
      if (score < threshold) {
        console.error(`FAIL: ${k} = ${score} (threshold ${threshold})`)
        failed = true
      }
    }
    if (failed) process.exitCode = 1
    else console.log('\nAll thresholds met.')
  } finally {
    try {
      await chrome.kill()
    } catch (e) {
      // Windows tmp-dir cleanup may EPERM; harmless after measurements
      if ((e && e.code) !== 'EPERM') console.warn('chrome.kill warning:', e?.message ?? e)
    }
    if (preview) {
      preview.kill()
    }
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
