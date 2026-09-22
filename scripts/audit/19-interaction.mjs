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

/**
 * `meta.checks` entry for a BX id that does not apply to this component —
 * recorded with its reason rather than omitted, so a reader can tell "ran,
 * nothing found" apart from "did not apply here".
 */
function notApplicable(reason) {
  return { status: 'not-applicable', reason };
}

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
          noTarget: true,
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
    // open/close/toggle @Method). Not applicable to every component — record
    // that in `checks.bx4` rather than omitting the key, so a reader can
    // tell "ran, nothing found" apart from "did not apply here".
    if (isBx4Applicable(contract)) {
      const bx4Data = await runBx4(page, target.name, contract);
      if (bx4Data.opened === false) {
        // S12: an overlay method that ran but produced no rendered change is a
        // missing input (the open path could not be exercised), never a
        // not-applicable component that happens to declare a popup surface.
        if (bx4Data.declaresPopup) {
          checks.bx4 = { status: 'incomplete', reason: 'the open method/prop produced no rendered change' };
          findings.push(
            finding({
              severity: 'warning',
              code: 'INTERACTION-BX4-NOT-OPENED',
              message:
                'Component declares an overlay/popup surface but the open method/prop produced no rendered change.',
              noTarget: true,
            }),
          );
        } else {
          checks.bx4 = notApplicable('open method/prop produced no rendered change and no popup surface is declared');
        }
      } else {
        checks.bx4 = bx4Data;
        const bx4Finding = judgeBx4Escape(bx4Data);
        if (bx4Finding) findings.push(finding(bx4Finding));
      }
      await applyNoMotionStyle(page); // re-inject: BX4 may have rendered new shadow content.
    } else {
      checks.bx4 = notApplicable('component is not OVERLAY archetype and has no open/close/toggle @Method');
    }

    // BX5 — light + dark structural diff.
    const bx5Data = await captureStructuralDiff(page, target.name);
    checks.bx5 = bx5Data;
    const bx5Finding = judgeBx5StructuralDiff(bx5Data);
    if (bx5Finding) findings.push(finding(bx5Finding));

    // BX7 — form submission round-trip (conditional: FORM archetype only).
    // A further "no resolvable name" not-applicable case is decided live,
    // inside runBx7, once the story's actual DOM state is known.
    if (isBx7Applicable(contract)) {
      const bx7Data = await runBx7(page, target.name, { isCheckable: isCheckableControl(contract) });
      checks.bx7 = bx7Data.applicable === false ? notApplicable(bx7Data.reason) : bx7Data;
      const bx7Finding = judgeBx7FormRoundTrip(bx7Data);
      if (bx7Finding) findings.push(finding(bx7Finding));
    } else {
      checks.bx7 = notApplicable('component archetype is not FORM');
    }
  } finally {
    await context.close();
  }

  return { findings, checks, componentName: target.name };
}

// ─── BX1 — hydration ────────────────────────────────────────────────────────

/**
 * Count of rendered children, excluding the audit's own injected
 * `[data-audit-no-motion]` style tag (`applyNoMotionStyle`, 09-a11y-tree.mjs)
 * — before this (S12), that tag inflated `childCount` by one for every host
 * whose shadow root it was injected into, so a component rendering nothing
 * else still "hydrated" with a non-zero count. Pure — exported for tests.
 * `nodes` is the list of `{ noMotionMark }` descriptors `captureHydration`
 * collects in the browser (light + shadow children); the browser-side
 * `page.evaluate` only describes each node, it never counts or filters.
 */
export function countRenderedChildren(nodes) {
  return (nodes ?? []).filter(n => !n?.noMotionMark).length;
}

async function captureHydration(page, componentName) {
  await page.waitForSelector(componentName, { timeout: 10000 }).catch(() => null);
  await page.waitForTimeout(250);
  return page.evaluate(name => {
    const host = document.querySelector(name);
    if (!host) return { found: false, hydrated: false, nodes: [] };
    const describe = el => ({ noMotionMark: el.hasAttribute('data-audit-no-motion') });
    const nodes = [...host.children, ...(host.shadowRoot?.children ?? [])].map(describe);
    return { found: true, hydrated: host.classList.contains('hydrated'), nodes };
  }, componentName);
}

/** PASS: found, hydrated, ≥1 rendered child node. Pure — exported for tests. */
export function judgeBx1Hydration(data) {
  if (!data?.found) {
    return {
      severity: 'error',
      code: 'INTERACTION-BX1-NOT-FOUND',
      message: 'Component host not found in the DOM — no point running BX4/BX5/BX7.',
    };
  }
  const childCount = countRenderedChildren(data.nodes);
  if (!data.hydrated || childCount < 1) {
    return {
      severity: 'error',
      code: 'INTERACTION-BX1-NOT-HYDRATED',
      message: `Host is missing the "hydrated" class or has no rendered children (hydrated=${data.hydrated}, childCount=${childCount}) — audit blocked.`,
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

// The evaluate-side walk needs computed style (visibility/display) and
// `hidden`/`aria-hidden`, which only exist in the browser — it can only
// describe the tree, never judge it (same constraint as ELEMENT_SIGNATURE_FN
// above: inlined, no closure over a Node.js helper). `judgeBx4Opened` below is
// the pure comparison over what this returns.
const VISIBLE_SIGNATURE_FN = name => {
  const host = document.querySelector(name);
  if (!host) return { tags: [], ariaExpanded: null };
  const isVisible = el => {
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };
  const tags = [];
  const visit = el => {
    if (!isVisible(el)) return;
    tags.push(el.tagName.toLowerCase());
    for (const child of el.children) visit(child);
    if (el.shadowRoot) for (const child of el.shadowRoot.children) visit(child);
  };
  for (const child of host.children) visit(child);
  if (host.shadowRoot) for (const child of host.shadowRoot.children) visit(child);
  const ariaExpandedAttr = host.getAttribute('aria-expanded');
  return { tags: tags.sort(), ariaExpanded: ariaExpandedAttr === null ? null : ariaExpandedAttr === 'true' };
};

/**
 * Whether an overlay actually opened, judged from a rendered change — never
 * the host's `open` @Prop, which the audit itself set to trigger the attempt
 * (S12: the old check trusted `host.open` and never looked at the DOM).
 * `before`/`after` are `{ tags, ariaExpanded }` from `VISIBLE_SIGNATURE_FN`.
 * True when the visible shadow+light tag list differs, or `aria-expanded`
 * flips from not-`true` to `true`. Pure — exported for tests.
 */
export function judgeBx4Opened(before, after) {
  if (!before || !after) return false;
  const beforeSig = (before.tags ?? []).join(',');
  const afterSig = (after.tags ?? []).join(',');
  if (beforeSig !== afterSig) return true;
  return before.ariaExpanded !== true && after.ariaExpanded === true;
}

/**
 * True when the contract or the live DOM declares an overlay/popup surface —
 * a `dialog`/`popover`/`aria-haspopup`/`aria-modal` marker. `dom` is
 * `{ hasDialog, hasPopover, hasAriaHaspopup, hasAriaModal }`, captured
 * alongside the visible-tree signature. `contract` is accepted for parity
 * with the other judge functions and future archetype-based signals; today
 * only the DOM markers decide. Pure — exported for tests.
 */
export function declaresPopup(contract, dom) {
  return Boolean(dom?.hasDialog || dom?.hasPopover || dom?.hasAriaHaspopup || dom?.hasAriaModal);
}

async function capturePopupMarkers(page, componentName) {
  return page.evaluate(name => {
    const host = document.querySelector(name);
    if (!host) return { hasDialog: false, hasPopover: false, hasAriaHaspopup: false, hasAriaModal: false };
    const root = host.shadowRoot ?? host;
    const has = sel => !!root.querySelector(sel) || host.matches(sel);
    return {
      hasDialog: has('dialog, [role="dialog"], [role="alertdialog"]'),
      hasPopover: has('[popover]'),
      hasAriaHaspopup: has('[aria-haspopup]'),
      hasAriaModal: has('[aria-modal="true"]'),
    };
  }, componentName);
}

async function runBx4(page, componentName, contract) {
  // Prefer a method whose name CONTAINS "open" (Stencil components in this
  // codebase name it `openModal`/`open`, never exactly `open` as a method —
  // `open` here is always the @Prop). Falls back to setting the prop
  // directly, which still reaches an `@Watch('open')` handler the same way
  // a consumer flipping the attribute would. A method call always passes a
  // boolean `true` (S12) — this codebase's open methods take one
  // (`setOpen(open: boolean)`), and calling with no argument silently opens
  // nothing for those.
  const openMethod = (contract.methods ?? []).find(m => /open/i.test(m.name))?.name ?? null;

  const before = await page.evaluate(VISIBLE_SIGNATURE_FN, componentName);

  await page.evaluate(
    ({ name, method }) => {
      const host = document.querySelector(name);
      if (!host) return;
      if (method && typeof host[method] === 'function') host[method](true);
      else host.open = true;
    },
    { name: componentName, method: openMethod },
  );
  await page.waitForTimeout(350);

  const afterOpen = await page.evaluate(VISIBLE_SIGNATURE_FN, componentName);
  const opened = judgeBx4Opened(before, afterOpen);

  if (!opened) {
    const dom = await capturePopupMarkers(page, componentName);
    return { opened: false, declaresPopup: declaresPopup(contract, dom) };
  }

  // Capture the open panel/dialog node BEFORE Escape closes it, so the
  // post-Escape check can tell "focus is stranded inside the closed panel"
  // (a real trap) apart from "focus correctly returned to a trigger that
  // lives inside the host" (e.g. the button that opens the overlay, when it
  // is slotted content) — both land `document.activeElement` inside the
  // host, but only the first is WCAG 2.1.2's failure mode.
  await page.evaluate(name => {
    const host = document.querySelector(name);
    if (!host) {
      window.__auditBx4Panel = null;
      return;
    }
    const root = host.shadowRoot ?? host;
    window.__auditBx4Panel =
      root.querySelector('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]') ?? null;
  }, componentName);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);

  const afterEscape = await page.evaluate(VISIBLE_SIGNATURE_FN, componentName);
  const focusTrappedInClosedOverlay = await page.evaluate(() => {
    const active = document.activeElement;
    const panel = window.__auditBx4Panel;
    delete window.__auditBx4Panel;
    // Only the panel/dialog content itself is a trap. Focus elsewhere inside
    // the host (e.g. a trigger button) is the correct, expected restore
    // target and is never flagged.
    return !!active && !!panel && (active === panel || panel.contains(active));
  });

  // Still open, judged the same rendered-change way as the initial open —
  // never `host.open` (frequently `display: contents` regardless of state;
  // live Storybook run, mud-modal, 2026-09-21).
  const stillOpen = judgeBx4Opened(before, afterEscape);
  return { opened: true, stillOpen, focusTrappedInClosedOverlay };
}

/** PASS: overlay closes AND focus is not left stranded inside it. Pure — exported for tests. */
export function judgeBx4Escape(data) {
  if (!data || data.opened === false) return null;
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

/**
 * A checkable control (`mud-checkbox`/`mud-switch`/`mud-radio`) only reaches
 * `internals.setFormValue` from its `@Watch('checked')` handler — setting
 * `host.value` alone never submits (`src/components/mud-checkbox/mud-checkbox.tsx:210-213`).
 * Detected structurally (a `checked` @Prop), not by name, so it generalizes
 * to any future checkable archetype. Pure — exported for tests.
 */
export function isCheckableControl(contract) {
  return (contract?.props ?? []).some(p => p.name === 'checked');
}

async function runBx7(page, componentName, { isCheckable = false } = {}) {
  return page.evaluate(
    ({ name, isCheckable }) => {
      const host = document.querySelector(name);
      if (!host) return { found: false, applicable: false, reason: 'component host not found' };

      // BX7 needs a key to read back out of FormData. A story that sets no
      // `name` (attribute or property) probes an empty string, which every
      // component "fails" identically — that is not a finding about the
      // component, so it is reported not-applicable instead.
      const resolvedName = host.getAttribute('name') || host.name || '';
      if (!resolvedName) {
        return {
          found: true,
          applicable: false,
          reason: 'story sets no resolvable "name" (attribute or property) on the host',
        };
      }

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
      // Checkable controls submit only when `checked` — set it before
      // reading FormData (see isCheckableControl above).
      const expectedValue = 'audit-value';
      if (isCheckable) host.checked = true;
      if (host.value !== undefined) host.value = expectedValue;
      else if (host.setAttribute) host.setAttribute('value', expectedValue);

      const data = new FormData(form);
      const entry = data.get(resolvedName);

      if (proto && original) proto.setFormValue = original;

      return {
        found: true,
        applicable: true,
        formDataKey: resolvedName,
        formDataHasKey: data.has(resolvedName),
        formDataValue: entry,
        expectedValue,
        setFormValueCallArgCounts: calls,
      };
    },
    { name: componentName, isCheckable },
  );
}

/**
 * True when the submitted FormData value does not match the value the audit
 * set (S12: before this, BX7 only checked the FormData KEY existed, never its
 * value — a component silently submitting the wrong value passed). Pure —
 * exported for tests.
 */
export function judgeBx7(submitted, expected) {
  return submitted !== expected;
}

/**
 * PASS: FormData carries the expected key with the expected value, and every
 * `setFormValue` call used two arguments (name, state) — never one.
 * `applicable: false` (no resolvable name) is not a finding. Pure —
 * exported for tests.
 */
export function judgeBx7FormRoundTrip(data) {
  if (!data?.found) return null;
  if (data.applicable === false) return null;
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
  if ('expectedValue' in data && judgeBx7(data.formDataValue, data.expectedValue)) {
    return {
      severity: 'error',
      code: 'INTERACTION-BX7-VALUE-MISMATCH',
      message: `FormData value for "${data.formDataKey}" is ${JSON.stringify(data.formDataValue)}, expected ${JSON.stringify(data.expectedValue)}.`,
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
export { notApplicable };
