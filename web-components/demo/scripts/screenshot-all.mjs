#!/usr/bin/env node
// Screenshots every demo page at 1280x900 (full-page) into AUDIT_OUT (default C:\Users\Dan\AppData\Local\Temp\demo-shots).
// Used for one-shot visual review after layout containment changes.

import { chromium } from 'playwright';
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = resolve(__dirname, '..', 'pages');
const BASE = process.env.AUDIT_BASE || 'http://localhost:5174';
const OUT = process.env.AUDIT_OUT || 'C:\\Users\\Dan\\AppData\\Local\\Temp\\demo-shots';
const VIEWPORT = (() => {
  const v = (process.env.AUDIT_VIEWPORT || '1280x900').split('x').map(Number);
  return { width: v[0], height: v[1] };
})();

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

function collectPages() {
  const out = [];
  for (const cat of readdirSync(PAGES_DIR, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    for (const f of readdirSync(resolve(PAGES_DIR, cat.name))) {
      if (f.endsWith('.html')) out.push({ cat: cat.name, file: f, url: `/pages/${cat.name}/${f}` });
    }
  }
  return out.sort((a, b) => a.url.localeCompare(b.url));
}

(async () => {
  const pages = collectPages();
  console.log(`screenshot-all: ${pages.length} pages → ${OUT} @ ${VIEWPORT.width}x${VIEWPORT.height}`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  const SLICE_HEIGHT = 1200; // stay well under the 2000px many-image API limit even after batching
  for (const p of pages) {
    const base = `${p.cat}__${p.file.replace('.html', '')}`;
    try {
      await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(200);
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const slices = Math.max(1, Math.ceil(total / SLICE_HEIGHT));
      for (let i = 0; i < slices; i++) {
        const y = i * SLICE_HEIGHT;
        const height = Math.min(SLICE_HEIGHT, total - y);
        await page.evaluate(([yy]) => window.scrollTo(0, yy), [y]);
        await page.waitForTimeout(50);
        await page.screenshot({
          path: join(OUT, `${base}__${String(i + 1).padStart(2, '0')}.png`),
          clip: { x: 0, y, width: VIEWPORT.width, height },
          fullPage: true, // needed so clip can reach below the viewport
        });
      }
      console.log(`  ✓ ${base} (${slices} slice${slices > 1 ? 's' : ''}, total ${total}px)`);
    } catch (e) {
      console.log(`  ✗ ${base} — ${e.message}`);
    }
  }
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
