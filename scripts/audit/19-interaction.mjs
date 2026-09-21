#!/usr/bin/env node
/**
 * 19-interaction.mjs
 *
 * A local Playwright instance (not the shared MCP browser) that covers the
 * BX checks `09-a11y-tree` does not: BX1 (hydration), BX4 (escape /
 * activation), BX5 (light/dark structural diff), BX7 (form round-trip).
 * BX2/BX3 (Tab order, focus ring) live in `09-a11y-tree.mjs`'s interactive
 * census; BX6 (console errors) stays `12-console-errors.mjs` — neither is
 * duplicated here (`.claude/skills/audit-component/references/layer-2-
 * browser-checklists.md` §BX).
 *
 * Like BX2/BX3, BX4/BX5/BX7 apply reduced motion plus an injected
 * `transition: none; animation: none` style (document + every shadow root,
 * re-injected after each state-changing interaction) before sampling —
 * Phase 0 results, plan `2026-09-21-audit-component-depths.md`.
 *
 * Usage:
 *   yarn sp.dev.watch
 *   node scripts/audit/19-interaction.mjs mud-modal --json
 *   node scripts/audit/19-interaction.mjs --all --json
 */
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import { DEFAULT_PORT, isStorybookReachable, storyUrl } from './lib/storybook-helpers.mjs';
import { launchBrowser, PLAYWRIGHT_INSTALL_HINT } from './lib/browser-context.mjs';
import { applyNoMotionStyle } from './09-a11y-tree.mjs';
import { extractContractFromTsx } from './14-component-contract.mjs';
import { analyzeStoriesFile } from './05-story-exports.mjs';

const TOOL = 'interaction';

const USAGE = defaultUsage(
  '19-interaction',
  'Local-Playwright BX checks not covered elsewhere: BX1 hydration, BX4 escape/activation, BX5 light/dark structural diff, BX7 form round-trip.',
  [
    '',
    'Extra options:',
    '  --port <N>          Storybook port (default: 6007)',
    '  --story-id <id>     Specific story id to audit (default: first Default-like export)',
  ],
);

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      'port': { type: 'string', default: String(DEFAULT_PORT) },
      'story-id': { type: 'string' },
    },
  });
  const t0 = Date.now();
  const port = Number(args.extras.port);
  const baseUrl = `http://localhost:${port}`;

  if (!(await isStorybookReachable({ port }))) {
    process.stderr.write(`${TOOL}: Storybook is not reachable on port ${port}. Start it with \`yarn sp.dev.watch\`.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const targets = await resolveTargets(args);
  if (!targets.length) {
    if (args.changed) {
      await emit(
        buildResult({
          tool: TOOL,
          target: 'changed',
          findings: [],
          meta: { durationMs: Date.now() - t0, componentsScanned: 0 },
        }),
        args,
      );
      process.exit(0);
    }
    process.stderr.write(`${TOOL}: no components matched.\n`);
    process.exit(EXIT_INTERNAL);
  }

  let perComponent;
  try {
    perComponent = await runAll(targets, { baseUrl, storyId: args.extras['story-id'] ?? null });
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
    result.meta.checks = perComponent[0].checks;
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Run every target through one shared browser instance (cheaper than one
 * launch per component). Exported for tests via dependency injection of a
 * fake `browser`.
 */
export async function runAll(targets, { baseUrl, storyId }) {
  const { browser, close } = await launchBrowser({ headless: true });
  try {
    const out = [];
    for (const target of targets) {
      out.push(await analyzeComponent(target, { browser, baseUrl, storyId }));
    }
    return out;
  } finally {
    await close();
  }
}

/**
 * Visit a component's primary story and run BX1/BX4/BX5/BX7. Returns
 * `{ findings, checks, componentName }`. Side-effecting (browser + network) —
 * the judgment over captured data (`judgeBx1Hydration`, `judgeBx4Escape`,
 * `judgeBx5StructuralDiff`, `judgeBx7FormRoundTrip`) is unit-testable
 * without a browser.
 */
export async function analyzeComponent(target, { browser, baseUrl, storyId }) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      checks: null,
      componentName: target.name ?? null,
    };
  }

  const resolvedStoryId = storyId ?? pickDefaultStoryId(target);
  if (!resolvedStoryId) {
    return {
      findings: [
        finding({
          severity: 'warning',
          code: 'INTERACTION-NO-STORY',
          file: relativeToRepo(target.paths.stories),
          message: `Could not infer a story id for ${target.name}. Pass --story-id explicitly.`,
        }),
      ],
      checks: null,
      componentName: target.name,
    };
  }

  const { contract } = target.exists.tsx ? extractContractFromTsx(target.paths.tsx, target.name) : { contract: null };

  const url = storyUrl({ storyId: resolvedStoryId, baseUrl });
  const findings = [];
  const checks = {};

  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await applyNoMotionStyle(page);

    // BX1 — hydration + first paint. Gates everything else: BX1 failing
    // means there is no point running BX4/BX5/BX7 against a dead page.
    const bx1Data = await captureHydration(page, target.name);
    checks.bx1 = bx1Data;
    const bx1Finding = judgeBx1Hydration(bx1Data);
    if (bx1Finding) {
      findings.push(finding(bx1Finding));
      return { findings, checks, componentName: target.name };
    }

    // BX4 — escape / activation (conditional: OVERLAY archetype or an
    // open/close/toggle @Method).
    if (isBx4Applicable(contract)) {
      const bx4Data = await runBx4(page, target.name, contract);
      checks.bx4 = bx4Data;
      const bx4Finding = judgeBx4Escape(bx4Data);
      if (bx4Finding) findings.push(finding(bx4Finding));
      await applyNoMotionStyle(page); // re-inject: BX4 may have rendered new shadow content.
    }

    // BX5 — light + dark structural diff.
    const bx5Data = await captureStructuralDiff(page, target.name);
    checks.bx5 = bx5Data;
    const bx5Finding = judgeBx5StructuralDiff(bx5Data);
    if (bx5Finding) findings.push(finding(bx5Finding));

    // BX7 — form submission round-trip (conditional: FORM archetype only).
    if (isBx7Applicable(contract)) {
      const bx7Data = await runBx7(page, target.name);
      checks.bx7 = bx7Data;
      const bx7Finding = judgeBx7FormRoundTrip(bx7Data);
      if (bx7Finding) findings.push(finding(bx7Finding));
    }
  } finally {
    await context.close();
  }

  return { findings, checks, componentName: target.name };
}

// ─── BX1 — hydration ────────────────────────────────────────────────────────

async function captureHydration(page, componentName) {
  await page.waitForSelector(componentName, { timeout: 10000 }).catch(() => null);
  await page.waitForTimeout(250);
  return page.evaluate(name => {
    const host = document.querySelector(name);
    if (!host) return { found: false, hydrated: false, childCount: 0 };
    const childCount = host.children.length + (host.shadowRoot?.children.length ?? 0);
    return { found: true, hydrated: host.classList.contains('hydrated'), childCount };
  }, componentName);
}

/** PASS: found, hydrated, ≥1 child node. Pure — exported for tests. */
export function judgeBx1Hydration(data) {
  if (!data?.found) {
    return {
      severity: 'error',
      code: 'INTERACTION-BX1-NOT-FOUND',
      message: 'Component host not found in the DOM — no point running BX4/BX5/BX7.',
    };
  }
  if (!data.hydrated || data.childCount < 1) {
    return {
      severity: 'error',
      code: 'INTERACTION-BX1-NOT-HYDRATED',
      message: `Host is missing the "hydrated" class or has no children (hydrated=${data.hydrated}, childCount=${data.childCount}) — audit blocked.`,
    };
  }
  return null;
}

// ─── BX4 — escape / activation ─────────────────────────────────────────────

/** Applicable when the archetype is OVERLAY, or an open/close/toggle @Method exists. Pure. */
export function isBx4Applicable(contract) {
  if (!contract) return false;
  if (contract.archetype?.value === 'OVERLAY') return true;
  return (contract.methods ?? []).some(m => /^(open|close|toggle)$/i.test(m.name));
}

async function runBx4(page, componentName, contract) {
  // Prefer a method whose name CONTAINS "open" (Stencil components in this
  // codebase name it `openModal`/`open`, never exactly `open` as a method —
  // `open` here is always the @Prop). Falls back to setting the prop
  // directly, which still reaches an `@Watch('open')` handler the same way
  // a consumer flipping the attribute would.
  const openMethod = (contract.methods ?? []).find(m => /open/i.test(m.name))?.name ?? null;
  await page.evaluate(
    ({ name, method }) => {
      const host = document.querySelector(name);
      if (!host) return;
      if (method && typeof host[method] === 'function') host[method]();
      else host.open = true;
    },
    { name: componentName, method: openMethod },
  );
  await page.waitForTimeout(350);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);

  return page.evaluate(name => {
    const host = document.querySelector(name);
    // `open` is the same @Prop this check used to open the overlay — its
    // host is frequently `display: contents` regardless of open state (the
    // real show/hide lives on an inner <dialog>/panel), so a computed-
    // display check on the HOST false-positived here (live Storybook run,
    // mud-modal, 2026-09-21: `display: 'contents'` both open and closed).
    // `host.open` is the source of truth.
    const stillOpen = host ? host.open === true : false;
    const active = document.activeElement;
    // This check opens the overlay via prop injection, not a real trigger
    // click, so there is no genuine "trigger element" to compare focus
    // against (live Storybook run, mud-modal, 2026-09-21: comparing tag
    // names against a null pre-open activeElement was unstable run to run).
    // What IS testable without a trigger: focus must not be left stranded
    // INSIDE the now-closed overlay (WCAG 2.1.2's actual failure mode).
    const focusTrappedInClosedOverlay =
      !!active && !!host && (active === host || host.contains(active) || !!host.shadowRoot?.contains(active));
    return { stillOpen, focusTrappedInClosedOverlay };
  }, componentName);
}

/** PASS: overlay closes AND focus is not left stranded inside it. Pure — exported for tests. */
export function judgeBx4Escape(data) {
  if (!data) return null;
  if (data.stillOpen) {
    return {
      severity: 'error',
      code: 'INTERACTION-BX4-ESCAPE-NO-CLOSE',
      message: 'Escape did not close the overlay (WCAG 2.1.2 — no keyboard trap).',
    };
  }
  if (data.focusTrappedInClosedOverlay) {
    return {
      severity: 'error',
      code: 'INTERACTION-BX4-FOCUS-TRAPPED',
      message:
        'Escape closed the overlay but focus is still inside it — nothing outside the overlay can receive keyboard input.',
    };
  }
  return null;
}

// ─── BX5 — light/dark structural diff ──────────────────────────────────────

// `page.evaluate` serializes its callback and runs it inside the browser —
// it cannot close over a Node.js-scope helper, so the signature walker is
// inlined in every `evaluate()` call below rather than shared as an outer
// function (a live Storybook run against mud-button, 2026-09-21, caught this
// exact mistake: `elementSignature is not defined` inside the page).
const ELEMENT_SIGNATURE_FN = name => {
  const host = document.querySelector(name);
  if (!host) return { count: 0, tags: [] };
  const tags = [];
  const visit = el => {
    tags.push(el.tagName.toLowerCase());
    for (const child of el.children) visit(child);
    if (el.shadowRoot) for (const child of el.shadowRoot.children) visit(child);
  };
  visit(host);
  return { count: tags.length, tags: tags.sort() };
};

async function captureStructuralDiff(page, componentName) {
  const light = await page.evaluate(ELEMENT_SIGNATURE_FN, componentName);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
  await page.waitForTimeout(250);
  const dark = await page.evaluate(ELEMENT_SIGNATURE_FN, componentName);
  return { light, dark };
}

/** PASS: identical element tree (count + tag multiset) across themes. Pure — exported for tests. */
export function judgeBx5StructuralDiff({ light, dark } = {}) {
  if (!light || !dark) return null;
  if (light.count === dark.count && light.tags.join(',') === dark.tags.join(',')) return null;
  return {
    severity: 'error',
    code: 'INTERACTION-BX5-STRUCTURAL-DIFF',
    message: `Light/dark element tree differs (light: ${light.count} elements, dark: ${dark.count} elements) — dark mode lost or gained an element.`,
  };
}

// ─── BX7 — form submission round-trip ──────────────────────────────────────

/** Applicable only for the FORM archetype. Pure. */
export function isBx7Applicable(contract) {
  return contract?.archetype?.value === 'FORM';
}

async function runBx7(page, componentName) {
  return page.evaluate(name => {
    const host = document.querySelector(name);
    if (!host) return { found: false };
    const calls = [];
    // ElementInternals is created inside the component's constructor, so we
    // cannot grab this host's own instance from outside — patch the
    // prototype's setFormValue instead and count every call's argc.
    const proto = window.ElementInternals?.prototype;
    const original = proto?.setFormValue;
    if (proto && original) {
      proto.setFormValue = function (...args) {
        calls.push(args.length);
        return original.apply(this, args);
      };
    }

    const form = document.createElement('form');
    document.body.appendChild(form);
    form.appendChild(host); // moves the existing (already-hydrated) host into the injected form
    if (host.value !== undefined) host.value = 'audit-value';
    else if (host.setAttribute) host.setAttribute('value', 'audit-value');

    const data = new FormData(form);
    const name2 = host.getAttribute('name') || host.name || '';
    const entry = name2 ? data.get(name2) : null;

    if (proto && original) proto.setFormValue = original;

    return {
      found: true,
      formDataKey: name2,
      formDataHasKey: name2 ? data.has(name2) : false,
      formDataValue: entry,
      setFormValueCallArgCounts: calls,
    };
  }, componentName);
}

/**
 * PASS: FormData carries the expected key, and every `setFormValue` call
 * used two arguments (name, state) — never one. Pure — exported for tests.
 */
export function judgeBx7FormRoundTrip(data) {
  if (!data?.found) return null;
  if (!data.formDataHasKey) {
    return {
      severity: 'error',
      code: 'INTERACTION-BX7-MISSING-FORMDATA-KEY',
      message: `FormData has no entry for "${data.formDataKey}" after submission.`,
    };
  }
  const oneArgCalls = (data.setFormValueCallArgCounts ?? []).filter(n => n === 1);
  if (oneArgCalls.length > 0) {
    return {
      severity: 'error',
      code: 'INTERACTION-BX7-SETFORMVALUE-ONE-ARG',
      message: `internals.setFormValue was called with 1 argument ${oneArgCalls.length} time(s) — must always pass (value, state).`,
    };
  }
  return null;
}

function pickDefaultStoryId(target) {
  if (target.exists?.stories) {
    const { stories } = analyzeStoriesFile(target.paths.stories, target.name);
    const def = stories.find(s => /default/i.test(s.name)) ?? stories[0];
    return def?.storyId ?? null;
  }
  return null;
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
