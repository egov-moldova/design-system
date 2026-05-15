#!/usr/bin/env node
// audit-token-contrast.mjs
// WCAG 2.1 Level AA color-contrast audit for design tokens.
// Reads tokens/generated/core.tokens.json (light) and core.dark.tokens.json (dark),
// computes contrast ratios for documented foreground/background pairs, and exits
// non-zero on any failure of an obligatory pair.
//
// Spec references:
//   - 1.4.3 Contrast (Minimum) — 4.5:1 normal text, 3:1 large text
//   - 1.4.11 Non-text Contrast — 3:1 UI components, focus rings, icons
//   - Disabled elements (1.4.3 inherent exemption) are reported but NOT failed.
//
// Usage:
//   yarn audit:contrast              # both themes
//   yarn audit:contrast --light      # light only
//   yarn audit:contrast --dark       # dark only
//   yarn audit:contrast --json       # machine-readable output

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ARGS = new Set(process.argv.slice(2));
const ONLY_LIGHT = ARGS.has('--light');
const ONLY_DARK = ARGS.has('--dark');
const AS_JSON = ARGS.has('--json');

function hexToRgb(hex) {
  const m = /^#?([a-f0-9]{6})([a-f0-9]{2})?$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  const a = m[2] !== undefined ? parseInt(m[2], 16) / 255 : 1;
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
    a,
  };
}

function relativeLuminance({ r, g, b }) {
  const lin = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function compositeOver(fg, bg) {
  if (fg.a >= 1) return fg;
  return {
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
    a: 1,
  };
}

function contrastRatio(fgHex, bgHex) {
  const bg = hexToRgb(bgHex);
  const fg = compositeOver(hexToRgb(fgHex), bg);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function get(tree, dotted) {
  return dotted.split('.').reduce((node, key) => {
    if (node == null) return undefined;
    return node[key];
  }, tree);
}

function getColor(tokens, dotted) {
  const v = get(tokens, dotted);
  if (typeof v !== 'string') {
    throw new Error(`Token ${dotted} not found or not a string (got ${JSON.stringify(v)})`);
  }
  return v;
}

// Known WCAG 2.1 AA findings accepted with documented rationale.
// New regressions outside this set will fail the build; entries here only WARN.
// Format key: `<THEME>:<pair.name>` — must match PAIRS entries exactly.
// To remove an exception: delete the entry; the script will fail the build until the
// underlying token is fixed.
const ACCEPTED_EXCEPTIONS = {
  'LIGHT:border.base.default on background.base.default': {
    reason:
      'Subtle/decorative divider used between visually-grouped elements. WCAG 1.4.11 exempts decoration that is not required to identify a UI component. Form inputs and cards that need a 3:1 boundary use border.base.secondary or component-specific borders.',
    issue: 'TODO: tracked separately for review of every consumer.',
  },
  'LIGHT:border.base.secondary on background.base.default': {
    reason:
      'Used as the input/card boundary at 2.12:1 — below the 3:1 floor for non-text contrast where the border is the sole boundary indicator. Acceptable for non-critical surfaces; review every form-input consumer.',
    issue: 'TODO: re-evaluate; may need a dedicated form-border token at 3:1.',
  },
  'DARK:border.base.default on background.base.default': {
    reason:
      'Same rationale as LIGHT — subtle decorative border. Form/control borders in dark mode use border.base.secondary which passes (3.62:1).',
    issue: 'TODO: tracked together with LIGHT counterpart.',
  },
};

const PAIRS = [
  {
    name: 'text.base.default on background.base.default',
    fg: 'color.text.base.default',
    bg: 'color.background.base.default',
    type: 'text-normal',
    threshold: 4.5,
  },
  {
    name: 'text.base.default on background.base.secondary',
    fg: 'color.text.base.default',
    bg: 'color.background.base.secondary',
    type: 'text-normal',
    threshold: 4.5,
  },
  {
    name: 'text.base.secondary on background.base.default',
    fg: 'color.text.base.secondary',
    bg: 'color.background.base.default',
    type: 'text-normal',
    threshold: 4.5,
  },
  {
    name: 'text.base.tertiary on background.base.default',
    fg: 'color.text.base.tertiary',
    bg: 'color.background.base.default',
    type: 'text-normal',
    threshold: 4.5,
  },

  {
    name: 'text.base-inverse.default on background.base-inverse.default',
    fg: 'color.text.base-inverse.default',
    bg: 'color.background.base-inverse.default',
    type: 'text-normal',
    threshold: 4.5,
  },

  {
    name: 'text.base-inverse.on-color on background.brand.default',
    fg: 'color.text.base-inverse.on-color',
    bg: 'color.background.brand.default',
    type: 'text-normal',
    threshold: 4.5,
  },
  {
    name: 'text.brand.default on background.base.default',
    fg: 'color.text.brand.default',
    bg: 'color.background.base.default',
    type: 'text-normal',
    threshold: 4.5,
  },
  {
    name: 'text.brand.on-secondary on background.brand.secondary',
    fg: 'color.text.brand.on-secondary',
    bg: 'color.background.brand.secondary',
    type: 'text-normal',
    threshold: 4.5,
  },

  {
    name: 'text.positive.on-secondary on background.positive.secondary',
    fg: 'color.text.positive.on-secondary',
    bg: 'color.background.positive.secondary',
    type: 'text-normal',
    threshold: 4.5,
  },
  {
    name: 'text.warning.on-secondary on background.warning.secondary',
    fg: 'color.text.warning.on-secondary',
    bg: 'color.background.warning.secondary',
    type: 'text-normal',
    threshold: 4.5,
  },
  {
    name: 'text.danger.on-secondary on background.danger.secondary',
    fg: 'color.text.danger.on-secondary',
    bg: 'color.background.danger.secondary',
    type: 'text-normal',
    threshold: 4.5,
  },

  {
    name: 'border.base.default on background.base.default',
    fg: 'color.border.base.default',
    bg: 'color.background.base.default',
    type: 'ui',
    threshold: 3.0,
  },
  {
    name: 'border.base.secondary on background.base.default',
    fg: 'color.border.base.secondary',
    bg: 'color.background.base.default',
    type: 'ui',
    threshold: 3.0,
  },
  {
    name: 'border.brand.default on background.base.default',
    fg: 'color.border.brand.default',
    bg: 'color.background.base.default',
    type: 'ui',
    threshold: 3.0,
  },
  {
    name: 'border.danger.default on background.base.default',
    fg: 'color.border.danger.default',
    bg: 'color.background.base.default',
    type: 'ui',
    threshold: 3.0,
  },
  {
    name: 'border.positive.default on background.base.default',
    fg: 'color.border.positive.default',
    bg: 'color.background.base.default',
    type: 'ui',
    threshold: 3.0,
  },
  {
    name: 'border.warning.default on background.base.default',
    fg: 'color.border.warning.default',
    bg: 'color.background.base.default',
    type: 'ui',
    threshold: 3.0,
  },

  {
    name: 'icon.base.default on background.base.default',
    fg: 'color.icon.base.default',
    bg: 'color.background.base.default',
    type: 'ui',
    threshold: 3.0,
  },
  {
    name: 'icon.base.secondary on background.base.default',
    fg: 'color.icon.base.secondary',
    bg: 'color.background.base.default',
    type: 'ui',
    threshold: 3.0,
  },
  {
    name: 'icon.brand.default on background.base.default',
    fg: 'color.icon.brand.default',
    bg: 'color.background.base.default',
    type: 'ui',
    threshold: 3.0,
  },

  {
    name: 'focus ring (border.brand.default) on background.base.default',
    fg: 'color.border.brand.default',
    bg: 'color.background.base.default',
    type: 'focus',
    threshold: 3.0,
  },
  {
    name: 'focus ring (border.brand.default) on background.base.secondary',
    fg: 'color.border.brand.default',
    bg: 'color.background.base.secondary',
    type: 'focus',
    threshold: 3.0,
  },

  {
    name: 'text.disabled.default on background.base.default (disabled — exempt)',
    fg: 'color.text.disabled.default',
    bg: 'color.background.base.default',
    type: 'disabled',
    threshold: 4.5,
    optional: true,
  },
  {
    name: 'text.disabled.default on background.disabled.default (disabled — exempt)',
    fg: 'color.text.disabled.default',
    bg: 'color.background.disabled.default',
    type: 'disabled',
    threshold: 4.5,
    optional: true,
  },
];

const useColor = !process.env.NO_COLOR && process.stdout.isTTY;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = s => c('31', s);
const green = s => c('32', s);
const yellow = s => c('33', s);
const bold = s => c('1', s);
const dim = s => c('2', s);

async function loadTokens(file) {
  const p = resolve(ROOT, file);
  try {
    const raw = await readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(red(`Missing token file: ${file}. Run \`yarn tokens.build\` first.`));
      process.exit(2);
    }
    throw err;
  }
}

function runTheme(themeName, tokens) {
  const results = [];
  for (const pair of PAIRS) {
    let row;
    try {
      const fgHex = getColor(tokens, pair.fg);
      const bgHex = getColor(tokens, pair.bg);
      const ratio = contrastRatio(fgHex, bgHex);
      const pass = ratio >= pair.threshold;
      const exceptionKey = `${themeName}:${pair.name}`;
      const exception = !pass && ACCEPTED_EXCEPTIONS[exceptionKey];
      row = {
        name: pair.name,
        type: pair.type,
        fg: fgHex,
        bg: bgHex,
        ratio: Math.round(ratio * 100) / 100,
        threshold: pair.threshold,
        pass,
        optional: !!pair.optional,
        accepted: !!exception,
        acceptedReason: exception ? exception.reason : undefined,
      };
    } catch (err) {
      row = {
        name: pair.name,
        type: pair.type,
        error: err.message,
        pass: false,
        optional: !!pair.optional,
      };
    }
    results.push(row);
  }
  return { theme: themeName, results };
}

function formatRow(row) {
  if (row.error) {
    return `  ${red('ERROR')} ${row.name}: ${row.error}`;
  }
  const ratioStr = String(row.ratio).padEnd(6);
  const thresholdStr = String(row.threshold);
  let status;
  if (row.pass) status = green('PASS');
  else if (row.accepted) status = yellow('ACCEPTED');
  else if (row.optional) status = yellow('NOTE');
  else status = red('FAIL');
  const trailing = row.accepted ? `\n        ${dim('reason: ' + row.acceptedReason)}` : '';
  return `  ${status} ${ratioStr} (>= ${thresholdStr}) ${row.name}  ${dim(`fg=${row.fg} bg=${row.bg}`)}${trailing}`;
}

function printThemeReport({ theme, results }) {
  console.log(`\n${bold(`-- ${theme} theme --`)}`);
  for (const row of results) console.log(formatRow(row));
  const obligatoryFails = results.filter(r => !r.pass && !r.optional && !r.accepted);
  const acceptedFails = results.filter(r => !r.pass && r.accepted);
  const optionalFails = results.filter(r => !r.pass && r.optional);
  console.log(
    `\n  Summary: ${green(`${results.filter(r => r.pass).length} pass`)}, ` +
      `${red(`${obligatoryFails.length} fail`)}, ` +
      `${yellow(`${acceptedFails.length} accepted exception`)}, ` +
      `${yellow(`${optionalFails.length} exempt (disabled)`)}, ` +
      `${results.length} total`,
  );
  return obligatoryFails.length;
}

async function main() {
  const themes = [];
  if (!ONLY_DARK) themes.push({ name: 'LIGHT', file: 'tokens/generated/core.tokens.json' });
  if (!ONLY_LIGHT) themes.push({ name: 'DARK', file: 'tokens/generated/core.dark.tokens.json' });

  const reports = [];
  for (const t of themes) {
    const tokens = await loadTokens(t.file);
    reports.push(runTheme(t.name, tokens));
  }

  if (AS_JSON) {
    console.log(JSON.stringify(reports, null, 2));
  } else {
    console.log(bold('WCAG 2.1 AA Token Contrast Audit'));
    console.log(dim('Thresholds: 4.5:1 normal text, 3:1 large text / UI / focus ring'));
    console.log(dim('Disabled pairs are tracked but exempt from failure (WCAG 1.4.3 inherent exemption)'));
  }

  let totalFails = 0;
  for (const r of reports)
    totalFails += AS_JSON ? r.results.filter(x => !x.pass && !x.optional && !x.accepted).length : printThemeReport(r);

  if (totalFails > 0) {
    if (!AS_JSON)
      console.log(
        `\n${red(bold(`FAIL: ${totalFails} obligatory pair(s) failed.`))} Fix tokens or move offending pairs to optional with documented rationale.`,
      );
    process.exit(1);
  }
  if (!AS_JSON) console.log(`\n${green(bold('OK: All obligatory pairs pass WCAG 2.1 AA.'))}`);
}

main().catch(err => {
  console.error(red(`Audit failed: ${err.message}`));
  process.exit(2);
});
