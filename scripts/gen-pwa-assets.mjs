import sharp from 'sharp'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const pub = resolve(root, 'public')
const splashDir = resolve(pub, 'splash')

const iconSvg = await readFile(resolve(pub, 'icon.svg'))

async function rasterize(size, outPath, opts = {}) {
  const { padding = 0, bg = null } = opts
  const inner = size - padding * 2
  let svg = sharp(iconSvg, { density: 600 }).resize(inner, inner)
  if (bg) {
    svg = svg.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: bg,
    })
  } else if (padding > 0) {
    svg = svg.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
  }
  await svg.png().toFile(outPath)
  console.log('  wrote', outPath)
}

await mkdir(pub, { recursive: true })
await mkdir(splashDir, { recursive: true })

console.log('icons:')
await rasterize(64, resolve(pub, 'pwa-64x64.png'))
await rasterize(192, resolve(pub, 'pwa-192x192.png'))
await rasterize(512, resolve(pub, 'pwa-512x512.png'))
await rasterize(1024, resolve(pub, 'pwa-1024x1024.png'))
await rasterize(180, resolve(pub, 'apple-touch-icon.png'))

console.log('maskable (inset 12%):')
await rasterize(192, resolve(pub, 'maskable-icon-192.png'), {
  padding: Math.round(192 * 0.12),
  bg: '#7a5be8',
})
await rasterize(512, resolve(pub, 'maskable-icon-512.png'), {
  padding: Math.round(512 * 0.12),
  bg: '#7a5be8',
})

const splashSizes = [
  { w: 2048, h: 2732, name: 'ipad-12.9-portrait' },
  { w: 2732, h: 2048, name: 'ipad-12.9-landscape' },
  { w: 1668, h: 2388, name: 'ipad-11-portrait' },
  { w: 2388, h: 1668, name: 'ipad-11-landscape' },
  { w: 1640, h: 2360, name: 'ipad-air-portrait' },
  { w: 2360, h: 1640, name: 'ipad-air-landscape' },
  { w: 1620, h: 2160, name: 'ipad-10.2-portrait' },
  { w: 2160, h: 1620, name: 'ipad-10.2-landscape' },
  { w: 1536, h: 2048, name: 'ipad-9.7-portrait' },
  { w: 2048, h: 1536, name: 'ipad-9.7-landscape' },
]

async function makeSplash(w, h, outPath) {
  const iconPx = Math.round(Math.min(w, h) * 0.36)
  const iconBuf = await sharp(iconSvg, { density: 600 })
    .resize(iconPx, iconPx)
    .png()
    .toBuffer()
  const gradient = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f1020"/>
          <stop offset="100%" stop-color="#0b0d14"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
    </svg>`,
  )
  await sharp(gradient)
    .composite([{ input: iconBuf, gravity: 'center' }])
    .png()
    .toFile(outPath)
  console.log('  wrote', outPath)
}

console.log('iOS splash screens:')
for (const s of splashSizes) {
  await makeSplash(s.w, s.h, resolve(splashDir, `${s.name}.png`))
}

console.log('favicon.ico (legacy, 48px PNG-encoded):')
const ico = await sharp(iconSvg, { density: 600 }).resize(48, 48).png().toBuffer()
await writeFile(resolve(pub, 'favicon-48.png'), ico)

console.log('done')
