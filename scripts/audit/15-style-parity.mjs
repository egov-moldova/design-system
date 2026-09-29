#!/usr/bin/env node
/**
 * 15-style-parity.mjs ★ QUALITY-CRITICAL
 *
 * Checks the computed styles of a rendered `mud-*` component against the exact
 * values its Figma nodes specify. Reads the `expect` blocks of the component's
 * Figma state manifest (`src/components/<name>/test/<name>.figma.json`), renders
 * each state the same way `11-pixel-diff-states` does (fixture, theme, clock,
 * hover / focus / press), and compares every property after normalisation:
 *
 *   colours     #F5F5F5 ≡ rgb(245, 245, 245); alpha kept (#0000001f)
 *   lengths     12px ≡ 12 (tolerance --tolerance, default 0.01px)
 *   box-shadow  layer by layer, colour position independent
 *   fontFamily  first family, case/quote insensitive
 *   boxWidth / boxHeight   the border-box from getBoundingClientRect()
 *   textContent            trimmed text, e.g. a year-range header
 *
 * `absent: true` entries are negative evidence: the Figma node has no such
 * element, so a match is reported as STYLE-UNEXPECTED-ELEMENT.
 *
 * Why this exists next to the pixel diff: a screenshot diff reports "3.1% of
 * pixels differ" — it cannot say that a focus ring is 4px instead of 3px, a
 * border renders 1px instead of 1.5px, or a hover colour is #E8F0FB instead of
 * #F5F5F5. Those are zero-tolerance values in `_agents/pixel-perfect-qa.md`,
 * and this script checks them exactly, with the Figma node cited per failure.
 *
 * Usage:
 *   yarn sp.dev.watch
 *   node scripts/audit/15-style-parity.mjs mud-date-picker --json
 */
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { TOKENS_COMPONENTS_ROOT, resolveComponentPaths, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { DEFAULT_PORT, isStorybookReachable } from './lib/storybook-helpers.mjs';
import { launchBrowser, PLAYWRIGHT_INSTALL_HINT, PLAYWRIGHT_BROWSER_HINT } from './lib/browser-context.mjs';
import { expectedStyles, isDesignNone, loadManifest, manifestPathFor, resolveState } from './lib/figma-manifest.mjs';
import { openState } from './lib/state-page.mjs';
import { compareStyleValue } from './lib/style-values.mjs';
import { attributeTokens, formatTokens, referencedTokens } from './lib/token-match.mjs';

const TOOL = 'style-parity';

const USAGE = defaultUsage(
  '15-style-parity',
  'Compare computed styles of each manifest state with the values its Figma node specifies.',
  [
    '',
    'Extra options:',
    '  --port <N>          Storybook port (default: 6007)',
    '  --manifest <file>   Figma state manifest (default: src/components/<name>/test/<name>.figma.json)',
    '  --tolerance <px>    Allowed numeric difference for lengths (default: 0.01)',
    '  --scale <N>         Device scale factor (default: manifest figma.scale, else 2) — sub-pixel borders',
    '                      such as 1.5px only render at their real width when scale ≥ 2',
  ],
);

/** Props read from the element itself instead of getComputedStyle(). */
export const PSEUDO_PROPS = ['boxWidth', 'boxHeight', 'textContent'];

/**
 * Result of an `absent` expectation: negative evidence, so a match is the
 * failure. Pure — exported for tests.
 * @returns {{ check: object, message: string|null }}
 */
export function absenceResult(exp, count, stateName) {
  const check = { target: exp.target, node: exp.node, absent: true, pass: count === 0, count };
  const message =
    count > 0 ? `${stateName}: rendered ${count} × ${exp.target}, which Figma ${exp.node} does not have` : null;
  return { check, message };
}

/**
 * Compare one `expect` entry's styles with the values read from the page.
 * Pure — exported for tests.
 * @returns {Array<{ prop, expected, actual, pass }>}
 */
export function compareExpectation(styles, actualValues, { tolerance = 0.01 } = {}) {
  return Object.entries(styles).map(([prop, expected]) => {
    const cmp = compareStyleValue(prop, expected, actualValues[prop], { tolerance });
    return { prop, expected: cmp.expected, actual: cmp.actual, pass: cmp.pass };
  });
}

async function readStyles(page, selector, props) {
  const locator = page.locator(selector).first();
  if ((await locator.count()) === 0) return null;
  return locator.evaluate(
    (el, { props, pseudo }) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const out = {};
      for (const p of props) {
        if (p === pseudo[0]) out[p] = `${rect.width}px`;
        else if (p === pseudo[1]) out[p] = `${rect.height}px`;
        else if (p === pseudo[2]) out[p] = (el.textContent ?? '').trim();
        else out[p] = cs[p];
      }
      return out;
    },
    { props, pseudo: PSEUDO_PROPS },
  );
}

/**
 * The STYLE-MISMATCH finding for one failing check. `expected` / `actual` /
 * `source` are structured so the fix brief can print them without parsing the
 * message; with a committed `override`, the expected value and its source are
 * the override's. Pure — exported for tests.
 */
export function mismatchFinding({ state, exp, check, tokens = null, manifestRel }) {
  const source = exp.override
    ? `override (${exp.override.reason}; decided by ${exp.override.decidedBy}) over Figma ${exp.node}`
    : `Figma ${exp.node}`;
  return {
    ...finding({
      severity: 'error',
      code: 'STYLE-MISMATCH',
      file: manifestRel,
      message: `${state} › ${exp.target} › ${check.prop}: ${source} = ${check.expected}, rendered ${check.actual}${formatTokens(tokens)}`,
    }),
    expected: { value: check.expected, source },
    actual: check.actual,
  };
}

/** Tokens for one failing, non-pseudo check; null otherwise. Pure — exported for tests. */
export function mismatchTokens(check, exp, actualValues, vars, opts = {}) {
  if (check.pass || PSEUDO_PROPS.includes(check.prop)) return null;
  return attributeTokens(check.prop, exp.styles[check.prop], actualValues[check.prop], vars, opts);
}

/** Component names that own tokens (`tokens/core/components/<name>.tokens.json`), used to scope token matches. */
export function componentTokenNames() {
  if (!existsSync(TOKENS_COMPONENTS_ROOT)) return [];
  return readdirSync(TOKENS_COMPONENTS_ROOT)
    .filter(f => f.endsWith('.tokens.json'))
    .map(f => f.slice(0, -'.tokens.json'.length));
}

/**
 * The component that renders a target: the innermost `mud-*` element the
 * selector names, else the manifest's component. A checkbox inside a table row
 * is styled by mud-checkbox's CSS, so its tokens are mud-checkbox's. Pure.
 */
export function targetComponent(selector, fallback) {
  const tags = [...String(selector).matchAll(/(?:^|[\s>+~(,])(mud-[a-z0-9-]+)(?![a-z0-9-])/g)].map(m => m[1]);
  return tags.length ? tags[tags.length - 1] : fallback;
}

const ownTokenCache = new Map();

/** Tokens the component's own CSS references; null when that CSS cannot be found (matches stay unscoped). */
function ownTokensFor(componentName) {
  if (!ownTokenCache.has(componentName)) {
    const resolved = resolveComponentPaths(componentName, { allowSubComponent: true });
    const css = resolved.found && resolved.exists.css ? readFileSync(resolved.paths.css, 'utf8') : null;
    ownTokenCache.set(componentName, css === null ? null : referencedTokens(css));
  }
  return ownTokenCache.get(componentName);
}

/** Every custom property the element sees, resolved. Read only when a check fails. */
async function readCustomProperties(page, selector) {
  return page
    .locator(selector)
    .first()
    .evaluate(el => {
      const cs = getComputedStyle(el);
      const out = {};
      for (let i = 0; i < cs.length; i++) {
        if (cs[i].startsWith('--')) out[cs[i]] = cs.getPropertyValue(cs[i]).trim();
      }
      return out;
    });
}

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      port: { type: 'string', default: String(DEFAULT_PORT) },
      manifest: { type: 'string' },
      tolerance: { type: 'string', default: '0.01' },
      scale: { type: 'string' },
    },
  });
  if (args.all || args.changed) {
    process.stderr.write(`${TOOL}: pass one component name — each component has its own manifest.\n`);
    process.exit(EXIT_INTERNAL);
  }
  const t0 = Date.now();
  const port = Number(args.extras.port);
  const baseUrl = `http://localhost:${port}`;
  const tolerance = Number(args.extras.tolerance);

  const target = resolveComponentPaths(args.component);
  if (!target.found) {
    process.stderr.write(`${TOOL}: component "${args.component}" not found.\n`);
    process.exit(EXIT_INTERNAL);
  }
  const manifestPath = args.extras.manifest ? resolve(args.extras.manifest) : manifestPathFor(target.name);
  const manifestRel = relativeToRepo(manifestPath);
  if (!existsSync(manifestPath)) {
    // A component without a manifest has not been set up for Figma
    // verification yet — a warning with a JSON envelope, not a crash, so
    // run-all and audit-production can report it like any other finding.
    const result = buildResult({
      tool: TOOL,
      target: target.name,
      findings: [
        finding({
          severity: 'warning',
          code: 'STYLE-NO-MANIFEST',
          file: manifestRel,
          message: `No Figma state manifest for ${target.name}; nothing to verify.`,
          fix: 'Create it following .claude/skills/pixel-perfect/SKILL.md (step 2).',
        }),
      ],
      meta: { durationMs: Date.now() - t0, manifest: manifestRel },
    });
    await emit(result, args);
    process.exit(exitCodeFromSummary(result.summary));
  }
  const { manifest, errors } = loadManifest(manifestPath);
  if (!manifest || errors.length) {
    const result = buildResult({
      tool: TOOL,
      target: target.name,
      findings: errors.map(message =>
        finding({ severity: 'error', code: 'STYLE-MANIFEST-INVALID', file: manifestRel, message }),
      ),
      meta: { durationMs: Date.now() - t0, manifest: manifestRel },
    });
    await emit(result, args);
    process.exit(exitCodeFromSummary(result.summary));
  }
  if (isDesignNone(manifest)) {
    // A declared "no design" is a recorded decision, not a finding: nothing to verify.
    const { reason, decidedBy } = manifest.figma;
    const result = buildResult({
      tool: TOOL,
      target: target.name,
      findings: [],
      meta: { durationMs: Date.now() - t0, manifest: manifestRel, design: { design: 'none', reason, decidedBy } },
    });
    await emit(result, args);
    process.exit(exitCodeFromSummary(result.summary));
  }
  if (!(await isStorybookReachable({ port }))) {
    process.stderr.write(`${TOOL}: Storybook not reachable on port ${port}. Start it with \`yarn sp.dev.watch\`.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const scale = Number(args.extras.scale ?? manifest.figma?.scale ?? 2);
  const findings = [];
  const states = [];
  let checked = 0;
  let browserHandle;
  let failure;
  const components = componentTokenNames();
  try {
    browserHandle = await launchBrowser();
    for (const raw of manifest.states) {
      const state = resolveState(manifest, raw, target.name);
      if (state.expect.length === 0) continue;
      const stateResult = { name: state.name, node: state.node, theme: state.theme, checks: [] };
      let session;
      try {
        session = await openState(browserHandle.browser, state, { baseUrl, scale });
        // One read per element: ~2,800 properties cross the browser boundary each time.
        const varsByTarget = new Map();
        for (const exp of state.expect) {
          if (exp.absent) {
            checked++;
            const count = await session.page.locator(exp.target).count();
            const { check, message } = absenceResult(exp, count, state.name);
            stateResult.checks.push(check);
            if (message) {
              findings.push(
                finding({
                  severity: 'error',
                  code: 'STYLE-UNEXPECTED-ELEMENT',
                  file: manifestRel,
                  message,
                  fix: 'An element with no design behind it: remove it, or get it added to Figma and update the manifest.',
                }),
              );
            }
            continue;
          }
          const styles = expectedStyles(exp);
          const actual = await readStyles(session.page, exp.target, Object.keys(styles));
          if (!actual) {
            findings.push(
              finding({
                severity: 'error',
                code: 'STYLE-TARGET-NOT-FOUND',
                file: manifestRel,
                message: `${state.name}: selector matched nothing — ${exp.target}`,
                fix: 'The element is missing from the render, or the selector is stale. Missing elements are drift; fix the component or the manifest.',
              }),
            );
            stateResult.checks.push({ target: exp.target, node: exp.node, missing: true });
            continue;
          }
          const checks = compareExpectation(styles, actual, { tolerance });
          const needsVars = checks.some(c => !c.pass && !PSEUDO_PROPS.includes(c.prop));
          if (needsVars && !varsByTarget.has(exp.target)) {
            varsByTarget.set(exp.target, await readCustomProperties(session.page, exp.target));
          }
          const vars = varsByTarget.get(exp.target) ?? {};
          const scope = { tolerance, own: ownTokensFor(targetComponent(exp.target, target.name)), components };
          for (const check of checks) {
            checked++;
            const tokens = mismatchTokens(check, { ...exp, styles }, actual, vars, scope);
            stateResult.checks.push({ target: exp.target, node: exp.node, ...check, ...(tokens ?? {}) });
            if (!check.pass) findings.push(mismatchFinding({ state: state.name, exp, check, tokens, manifestRel }));
          }
        }
      } catch (err) {
        findings.push(
          finding({
            severity: 'error',
            code: 'STYLE-STATE-FAILED',
            file: manifestRel,
            message: `${state.name}: ${err.message}`,
          }),
        );
      } finally {
        await session?.release();
      }
      states.push(stateResult);
    }
  } catch (err) {
    failure = err;
  } finally {
    await browserHandle?.close();
  }
  if (failure) {
    process.stderr.write(`${TOOL}: ${failure.message}\n`);
    process.exit(EXIT_INTERNAL);
  }

  const result = buildResult({
    tool: TOOL,
    target: target.name,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      manifest: manifestRel,
      scale,
      tolerance,
      propertiesChecked: checked,
      propertiesFailed: findings.filter(f => f.code === 'STYLE-MISMATCH').length,
      states,
    },
  });
  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    if (err.message === PLAYWRIGHT_INSTALL_HINT || err.message === PLAYWRIGHT_BROWSER_HINT) {
      process.stderr.write(`${TOOL}: ${err.message}\n`);
    } else {
      process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    }
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
