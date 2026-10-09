#!/usr/bin/env node
// Ad-hoc Playwright audit for demo MPA layout containment.
// Walks every page, every viewport in --viewports, every `.row` and reports
// child-overflow, sibling-overlap, wrap, and main horizontal-scroll.

import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = resolve(__dirname, '..', 'pages');
const BASE = process.env.AUDIT_BASE || 'http://localhost:5174';
const VIEWPORTS = (process.env.AUDIT_VIEWPORTS || '1280x900').split(',').map(v => {
  const [w, h] = v.split('x').map(Number);
  return { width: w, height: h };
});

function collectPages() {
  const out = [];
  for (const cat of readdirSync(PAGES_DIR, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    for (const f of readdirSync(resolve(PAGES_DIR, cat.name))) {
      if (f.endsWith('.html')) out.push(`/pages/${cat.name}/${f}`);
    }
  }
  return out.sort();
}

const auditScript = () => {
  const rows = [];
  const seen = new Set();
  for (const row of document.querySelectorAll(
    '.demo-main .row, .demo-main .row--auto-fit, .demo-main .stack, .demo-main .grid',
  )) {
    if (seen.has(row)) continue;
    seen.add(row);
    const h3 =
      row.closest('.subsection')?.querySelector('h3')?.textContent?.trim() ||
      row.closest('.component-section')?.querySelector('h2')?.textContent?.trim() ||
      '(no heading)';
    const rRect = row.getBoundingClientRect();
    const childRects = [...row.children].map(c => ({ el: c, r: c.getBoundingClientRect() }));
    const issues = [];

    // Child overflow vs row
    childRects.forEach(({ el, r }, i) => {
      if (r.right > rRect.right + 1)
        issues.push({ type: 'child-overflow-right', child: i, by: Math.round(r.right - rRect.right) });
      if (r.left < rRect.left - 1)
        issues.push({ type: 'child-overflow-left', child: i, by: Math.round(rRect.left - r.left) });
    });

    // Sibling overlap (same top y, x ranges intersect)
    for (let i = 0; i < childRects.length; i++) {
      for (let j = i + 1; j < childRects.length; j++) {
        const a = childRects[i].r,
          b = childRects[j].r;
        if (Math.round(a.top) === Math.round(b.top) && a.left < b.right - 1 && a.right > b.left + 1) {
          issues.push({
            type: 'sibling-overlap',
            a: i,
            b: j,
            overlap: Math.round(Math.min(a.right, b.right) - Math.max(a.left, b.left)),
          });
        }
      }
    }

    // Wrap detection: group children into visual lines by y-range overlap (avoids
    // false positives when align-items: center yields different tops for items of
    // differing heights — they still share a visual line if their y-ranges intersect).
    const isFlex = row.classList.contains('row') && !row.classList.contains('row--auto-fit');
    if (isFlex) {
      const sorted = childRects.map(c => c.r).sort((a, b) => a.top - b.top);
      const lines = [];
      for (const r of sorted) {
        const line = lines[lines.length - 1];
        if (line && r.top < line.bottom - 2) {
          line.bottom = Math.max(line.bottom, r.bottom);
        } else {
          lines.push({ top: r.top, bottom: r.bottom });
        }
      }
      if (lines.length > 1) {
        issues.push({ type: 'wrap', lines: lines.length, children: childRects.length });
      }
    }

    if (issues.length) {
      rows.push({ heading: h3, container: row.className, childCount: childRects.length, issues });
    }
  }

  const main = document.querySelector('.demo-main');
  const mainOverflow =
    main && main.scrollWidth > main.clientWidth + 1
      ? { type: 'horizontal-scroll', by: main.scrollWidth - main.clientWidth }
      : null;

  return { rows, mainOverflow, totalRows: document.querySelectorAll('.demo-main .row').length };
};

(async () => {
  const pages = collectPages();
  console.log(`audit-layout: ${pages.length} pages × ${VIEWPORTS.length} viewports against ${BASE}`);
  const browser = await chromium.launch();
  const report = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    for (const url of pages) {
      try {
        await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(150); // settle custom elements
        const result = await page.evaluate(auditScript);
        if (result.rows.length || result.mainOverflow) {
          report.push({ url, viewport: `${vp.width}x${vp.height}`, ...result });
        }
      } catch (e) {
        report.push({ url, viewport: `${vp.width}x${vp.height}`, error: e.message });
      }
    }
    await ctx.close();
  }
  await browser.close();

  console.log('\n========== REPORT ==========');
  if (!report.length) {
    console.log('✅ No layout violations found.');
  } else {
    for (const r of report) {
      console.log(`\n📄 ${r.url} @ ${r.viewport}`);
      if (r.error) {
        console.log(`  ERROR: ${r.error}`);
        continue;
      }
      if (r.mainOverflow) console.log(`  ⚠️  main scrollWidth overflow: +${r.mainOverflow.by}px`);
      for (const row of r.rows) {
        console.log(`  • [${row.container}] "${row.heading}" (${row.childCount} children)`);
        for (const iss of row.issues) {
          console.log(`     - ${iss.type}: ${JSON.stringify(iss)}`);
        }
      }
    }
  }
  console.log(`\n${report.length} pages with violations / ${pages.length} total`);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
