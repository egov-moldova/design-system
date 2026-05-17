#!/usr/bin/env node
/**
 * 10-contrast-pairs.mjs
 *
 * Visits a `cor-*` story (light + dark), measures the computed foreground /
 * background / border colors of every interactive element, and reports the
 * WCAG 2.1 AA contrast ratio for each foreground-vs-background pair.
 *
 * The WCAG algorithm matches `scripts/audit-token-contrast.mjs` exactly
 * (relative luminance, alpha compositing, ratio formula). The difference is
 * the data source: this script reads runtime computed colors from the live
 * component, not from the token files.
 *
 * Replaces AI work in:
 *   - `.claude/agents/a11y-verifier.md` Step 6 (light + dark contrast checks)
 *   - `.claude/agents/audit-production.md` Phase 3.3 (component-runtime contrast)
 *
 * Thresholds (WCAG 2.1 AA):
 *   - normal text:    4.5:1
 *   - large text:     3:1  (≥18pt or ≥14pt bold)
 *   - UI components:  3:1  (icons, borders, focus rings)
 *   - disabled:       exempt (per SC 1.4.3)
 *
 * Usage:
 *   yarn sp.dev.watch
 *   node scripts/audit/10-contrast-pairs.mjs cor-button --json
 *   node scripts/audit/10-contrast-pairs.mjs cor-input --story-id atoms-input--default --json
 */
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import { DEFAULT_PORT, isStorybookReachable, storyUrl, inferStoryId } from './lib/storybook-helpers.mjs';
import { withPage, setTheme, PLAYWRIGHT_INSTALL_HINT } from './lib/browser-context.mjs';
import { analyzeStoriesFile } from './05-story-exports.mjs';
import { INTERACTIVE_TAGS, INTERACTIVE_ROLES } from './09-a11y-tree.mjs';

const TOOL = 'contrast-pairs';

const USAGE = defaultUsage(
  '10-contrast-pairs',
  'Measure WCAG 2.1 AA color contrast for every interactive element on a Storybook story (light + dark).',
  [
    '',
    'Extra options:',
    '  --port <N>          Storybook port (default: 6007)',
    '  --story-id <id>     Specific story id (default: Default-like export)',
    '  --skip-dark         Skip the dark-mode pass',
  ],
);

// ─── WCAG 2.1 contrast math (pure, exported for tests) ────────────────────

/**
 * Parse `rgb(r, g, b)` / `rgba(r, g, b, a)` / `#rrggbb` / `#rgb` into
 * { r, g, b, a } with channels 0..255 and alpha 0..1.
 */
export function parseColor(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();

  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3)
      h = h
        .split('')
        .map(c => c + c)
        .join('');
    if (h.length === 4)
      h = h
        .split('')
        .map(c => c + c)
        .join('');
    if (h.length === 6) h = h + 'ff';
    if (h.length !== 8) return null;
    const n = parseInt(h, 16);
    return {
      r: (n >>> 24) & 0xff,
      g: (n >>> 16) & 0xff,
      b: (n >>> 8) & 0xff,
      a: (n & 0xff) / 255,
    };
  }

  const rgb = s.match(/^rgba?\(\s*([0-9.]+)\s*[, ]\s*([0-9.]+)\s*[, ]\s*([0-9.]+)\s*(?:[,/]\s*([0-9.]+%?)\s*)?\)$/i);
  if (rgb) {
    let alpha = 1;
    if (rgb[4] !== undefined) {
      alpha = rgb[4].endsWith('%') ? Number(rgb[4].slice(0, -1)) / 100 : Number(rgb[4]);
    }
    return {
      r: Math.round(Number(rgb[1])),
      g: Math.round(Number(rgb[2])),
      b: Math.round(Number(rgb[3])),
      a: alpha,
    };
  }
  return null;
}

export function relativeLuminance({ r, g, b }) {
  const lin = c => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function compositeOver(fg, bg) {
  if (fg.a >= 1) return fg;
  return {
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
    a: 1,
  };
}

/**
 * Compute the WCAG 2.1 contrast ratio between a foreground color (which may be
 * transparent) and a background. The foreground is composited over the
 * background to handle alpha, matching the WCAG algorithm and what
 * scripts/audit-token-contrast.mjs does.
 *
 * Returns a number (typically 1.0..21.0) rounded to two decimals, or null if
 * either color was unparseable.
 */
export function contrastRatio(fgInput, bgInput) {
  const fgRaw = typeof fgInput === 'string' ? parseColor(fgInput) : fgInput;
  const bgRaw = typeof bgInput === 'string' ? parseColor(bgInput) : bgInput;
  if (!fgRaw || !bgRaw) return null;
  const bg = bgRaw.a < 1 ? { ...bgRaw, a: 1 } : bgRaw;
  const fg = compositeOver(fgRaw, bg);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Classify a pair by WCAG 2.1 AA thresholds.
 *   normal text   : 4.5:1  (anything below = fail)
 *   large text    : 3:1
 *   UI component  : 3:1
 *   disabled      : exempt (treated as pass)
 *
 * Caller passes `kind` from runtime context (e.g. inferred from font size
 * + role). Defaults to 'normal' which is the strictest rule.
 */
export function classifyContrast(ratio, kind = 'normal', { disabled = false } = {}) {
  if (disabled) return { kind, ratio, threshold: null, pass: true, exempt: true };
  if (ratio === null || ratio === undefined) {
    return { kind, ratio: null, threshold: null, pass: false, error: 'unmeasurable' };
  }
  const threshold = kind === 'large' || kind === 'ui' ? 3 : 4.5;
  return { kind, ratio, threshold, pass: ratio >= threshold };
}

// ─── Main flow (browser side effects) ─────────────────────────────────────

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      'port': { type: 'string', default: String(DEFAULT_PORT) },
      'story-id': { type: 'string' },
      'skip-dark': { type: 'boolean', default: false },
    },
  });
  const t0 = Date.now();
  const port = Number(args.extras.port);
  const baseUrl = `http://localhost:${port}`;

  if (!(await isStorybookReachable({ port }))) {
    process.stderr.write(`${TOOL}: Storybook not reachable on port ${port}.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const targets = await resolveTargets(args);
  if (!targets.length) {
    if (args.changed) {
      await emit(
        buildResult({ tool: TOOL, target: 'changed', findings: [], meta: { durationMs: Date.now() - t0 } }),
        args,
      );
      process.exit(0);
    }
    process.stderr.write(`${TOOL}: no components matched.\n`);
    process.exit(EXIT_INTERNAL);
  }

  let perComponent;
  try {
    perComponent = await Promise.all(
      targets.map(t =>
        analyzeComponent(t, {
          baseUrl,
          storyId: args.extras['story-id'] ?? null,
          skipDark: args.extras['skip-dark'],
        }),
      ),
    );
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n`);
    process.exit(EXIT_INTERNAL);
  }

  const findings = perComponent.flatMap(c => c.findings);
  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: { durationMs: Date.now() - t0, componentsScanned: targets.length, baseUrl },
  });

  if (!args.all && !args.changed && perComponent.length === 1) {
    result.meta.pairs = perComponent[0].pairs;
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

export async function analyzeComponent(target, { baseUrl, storyId = null, skipDark = false } = {}) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      pairs: null,
      componentName: target.name ?? null,
    };
  }

  const resolvedStoryId = storyId ?? pickDefaultStoryId(target);
  if (!resolvedStoryId) {
    return {
      findings: [
        finding({
          severity: 'warning',
          code: 'CONTRAST-NO-STORY',
          message: `No story id resolvable for ${target.name}; pass --story-id.`,
        }),
      ],
      pairs: null,
      componentName: target.name,
    };
  }

  const url = storyUrl({ storyId: resolvedStoryId, baseUrl });

  const lightSamples = await measureSamples(url, target.name, 'light');
  const darkSamples = skipDark ? [] : await measureSamples(url, target.name, 'dark');

  const pairs = [...lightSamples, ...darkSamples].map(s => buildPair(s));

  const findings = [];
  for (const p of pairs) {
    if (!p.pass && !p.exempt) {
      findings.push(
        finding({
          severity: 'error',
          code: 'CONTRAST-BELOW-THRESHOLD',
          file: relativeToRepo(target.paths.tsx),
          message: `${p.theme} <${p.tag}> [${p.kind}]: contrast ${p.ratio}:1 (threshold ${p.threshold}:1). fg=${p.fg} bg=${p.bg}.`,
          fix: 'Adjust the token mapping so foreground and background pass WCAG 2.1 AA.',
        }),
      );
    }
  }

  return { findings, pairs, componentName: target.name };
}

/**
 * Combine a runtime color sample with the WCAG classification. Pure — exported
 * for tests.
 */
export function buildPair(sample) {
  const ratio = contrastRatio(sample.fg, sample.bg);
  const cls = classifyContrast(ratio, sample.kind, { disabled: sample.disabled });
  return { ...sample, ratio: cls.ratio, threshold: cls.threshold, pass: cls.pass, exempt: !!cls.exempt };
}

async function measureSamples(url, componentName, theme) {
  return withPage({
    url,
    waitUntil: 'load',
    action: async page => {
      await page.waitForTimeout(750);
      if (theme === 'dark') {
        await setTheme(page, 'dark');
        await page.waitForTimeout(250);
      }
      const samples = await page.evaluate(
        ctx => {
          const sel = [ctx.componentName, ...ctx.tags, ...ctx.roles.map(r => `[role="${r}"]`)].join(',');
          const els = Array.from(document.querySelectorAll(sel));
          return els.map((el, index) => {
            const styles = window.getComputedStyle(el);
            const fontSize = parseFloat(styles.fontSize) || 16;
            const fontWeight = Number(styles.fontWeight) || 400;
            const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700); // 18pt / 14pt bold
            const isDisabled = el.matches(':disabled, [aria-disabled="true"], [disabled]');
            const tag = el.tagName.toLowerCase();
            const isInteractive =
              ctx.tags.includes(tag) || ctx.roles.includes(el.getAttribute('role') || '') || tag === ctx.componentName;
            // Kind heuristic: text vs UI. The component element itself is "ui".
            const kind = isLargeText ? 'large' : tag === ctx.componentName ? 'ui' : 'normal';
            return {
              index,
              tag,
              role: el.getAttribute('role') || null,
              fg: styles.color,
              bg: styles.backgroundColor,
              borderColor: styles.borderTopColor,
              disabled: isDisabled,
              interactive: isInteractive,
              kind,
            };
          });
        },
        { componentName, tags: INTERACTIVE_TAGS, roles: INTERACTIVE_ROLES },
      );
      return samples.map(s => ({ ...s, theme }));
    },
  });
}

function pickDefaultStoryId(target) {
  if (target.exists?.stories) {
    const { stories } = analyzeStoriesFile(target.paths.stories, target.name);
    const def = stories.find(s => /default/i.test(s.name)) ?? stories[0];
    return def?.storyId ?? null;
  }
  return inferStoryId(`Atoms/${pascal(target.bare)}`, 'Default');
}

function pascal(s) {
  return s
    .split('-')
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

async function resolveTargets(args) {
  if (args.all) return listAllComponents().map(c => resolveComponentPaths(c.name));
  if (args.changed) return listChangedComponents().map(n => resolveComponentPaths(n));
  return [resolveComponentPaths(args.component)];
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    if (err.message === PLAYWRIGHT_INSTALL_HINT) {
      process.stderr.write(`${TOOL}: ${err.message}\n`);
    } else {
      process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    }
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
