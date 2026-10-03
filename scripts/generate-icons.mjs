import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const svg = await readFile('public/icon.svg', 'utf8')
const browser = await chromium.launch()
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
    await page.setContent('<style>body{margin:0}</style>' + svg.replace('<svg ', `<svg width="${size}" height="${size}" `))
    await page.locator('svg').screenshot({ path: path.join('public', `icon-${size}.png`), omitBackground: true })
    await page.close()
  }
} finally { await browser.close() }
