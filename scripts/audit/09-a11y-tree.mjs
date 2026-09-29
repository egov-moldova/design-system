#!/usr/bin/env node
/**
 * 09-a11y-tree.mjs
 *
 * Visits a `mud-*` component story (light + dark) and collects two pieces of
 * structured data the a11y-verifier agent currently extracts manually:
 *
 *   1. The accessibility snapshot tree (`page.accessibility.snapshot()`)
 *   2. A census of every interactive element with role / accessible name /
 *      focus-visible status, walked via `page.evaluate` + querySelectorAll.
 *
 * The script ONLY collects data — it never interprets ARIA correctness
 * (e.g. "is aria-label appropriate here?"). That judgment stays with AI.
 *
 * Replaces AI work in:
 *   - `.claude/agents/a11y-verifier.md` Step 2 (navigate + snapshot)
 *   - `.claude/agents/a11y-verifier.md` Step 3 (element-by-element ARIA scan)
 *   - `.claude/agents/a11y-verifier.md` Step 5 (ARIA validation data gathering)
 *
 * Usage:
 *   yarn sp.dev.watch
 *   node scripts/audit/09-a11y-tree.mjs mud-button --json
 *   node scripts/audit/09-a11y-tree.mjs mud-button --story-id components-button--default --json
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

const TOOL = 'a11y-tree';

const USAGE = defaultUsage(
  '09-a11y-tree',
  'Capture the accessibility tree + interactive-element census for a Storybook story (light + dark).',
  [
    '',
    'Extra options:',
    '  --port <N>          Storybook port (default: 6007)',
    '  --story-id <id>     Specific story id to audit (default: first Default-like export)',
    '  --skip-dark         Skip the dark-mode pass (faster)',
  ],
);

// Tag names we consider "interactive" by default. Custom mud-* elements are
// added on top by the per-component name match.
const INTERACTIVE_TAGS = ['button', 'a', 'input', 'select', 'textarea', 'details', 'summary'];

// Roles we consider interactive regardless of tag.
const INTERACTIVE_ROLES = [
  'button',
  'link',
  'textbox',
  'combobox',
  'checkbox',
  'radio',
  'switch',
  'tab',
  'menuitem',
  'option',
  'slider',
  'spinbutton',
  'searchbox',
];

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
    result.meta.snapshot = perComponent[0].snapshot;
    result.meta.checks = perComponent[0].checks;
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Visit a single component's primary story; collect tree + element census for
 * both themes (light, dark).
 */
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
      snapshot: null,
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
          code: 'A11Y-NO-STORY',
          file: relativeToRepo(target.paths.stories),
          message: `Could not infer a story id for ${target.name}. Pass --story-id explicitly.`,
          noTarget: true,
        }),
      ],
      snapshot: null,
      checks: null,
      componentName: target.name,
    };
  }

  const url = storyUrl({ storyId: resolvedStoryId, baseUrl });

  const light = await collectForTheme(url, target.name, 'light');
  const dark = skipDark ? null : await collectForTheme(url, target.name, 'dark');

  const findings = [];
  const checks = {};

  // Quality safeguard: flag obviously missing accessible names, but stop short
  // of interpreting ARIA correctness — that's AI's job.
  for (const theme of [light, dark].filter(Boolean)) {
    for (const el of theme.interactive) {
      if (!el.accessibleName || el.accessibleName.trim() === '') {
        findings.push(
          finding({
            severity: 'warning',
            code: 'A11Y-MISSING-ACCESSIBLE-NAME',
            message: `${theme.theme}: <${el.tag}> at index ${el.index} has no accessible name (role=${el.role ?? 'none'}).`,
          }),
        );
      }
    }

    // BX2 — every interactive element EXPECTED to take a Tab stop is
    // reachable by Tab. `computeExpectedTabStops` drops the census entries
    // that correctly take none: the `origin: 'host'` boundary marker
    // (a shadow host is not itself focusable unless it opts into
    // `delegatesFocus`, and even then focus lands on its inner control —
    // what `walkTabOrder`'s deep-active-element walk reports), `disabled` /
    // `tabindex="-1"` elements (including roving-tabindex members), an `<a>`
    // with no `href`, and every radio in a `name` group except the one the
    // group would actually focus. Live-Storybook run against mud-button,
    // 2026-09-21: the host-origin case alone fired on 5/5 runs before that
    // filter, 0/5 after.
    const expected = computeExpectedTabStops(theme.interactive);
    const bx2 = expected.length === 0 ? null : judgeTabOrder(expected, theme.tabWalk);
    if (bx2) findings.push(finding({ ...bx2, message: `${theme.theme}: ${bx2.message}` }));
    checks[`bx2-${theme.theme}`] = bx2StatusFor(expected, bx2);

    // BX3 — every element the Tab walk actually focused has a visible focus ring.
    let bx3Failed = false;
    for (const step of theme.tabWalk) {
      const bx3 = judgeFocusRingVisible(step);
      if (bx3) {
        bx3Failed = true;
        findings.push(finding({ ...bx3, message: `${theme.theme}: ${bx3.message}` }));
      }
    }
    checks[`bx3-${theme.theme}`] = bx3StatusFor(theme.tabWalk, bx3Failed);
  }

  return {
    findings,
    snapshot: { storyId: resolvedStoryId, light, dark },
    checks,
    componentName: target.name,
  };
}

/**
 * Visit `url` with theme applied; return { theme, tree, interactive }.
 * Performs network + browser side effects.
 *
 * Both the tree and the interactive census are scoped to the audited
 * component's subtree (host + light DOM + own shadow root). Without this
 * scoping the tree was empty for shadow-root components and the census
 * leaked Storybook chrome / tooling overlay elements (e.g. Agentation MCP).
 *
 * The tree is built by a manual DOM walker in `page.evaluate()` rather than
 * via `page.accessibility.snapshot()` because that API was removed in
 * Playwright 1.50+. The walker produces a compatible-ish `{ role, name,
 * children }` shape from ARIA-relevant attributes.
 */
async function collectForTheme(url, componentName, theme) {
  return withPage({
    url,
    waitUntil: 'load',
    action: async page => {
      // Wait for the component to hydrate before measuring; otherwise the
      // shadow root may not be populated yet.
      await page.waitForSelector(`${componentName}.hydrated`, { timeout: 10000 }).catch(() => null);
      await page.waitForTimeout(250);
      if (theme === 'dark') {
        await setTheme(page, 'dark');
        await page.waitForTimeout(250);
      }

      const { tree, interactive } = await page.evaluate(
        ctx => {
          const hosts = Array.from(document.querySelectorAll(ctx.componentName));
          const interactiveSel = [...ctx.tags, ...ctx.roles.map(r => `[role="${r}"]`)].join(',');

          // ─ Accessibility tree walker (subtree only) ─────────────────────
          const implicitRole = el => {
            const tag = el.tagName.toLowerCase();
            switch (tag) {
              case 'a':
                return el.hasAttribute('href') ? 'link' : null;
              case 'button':
                return 'button';
              case 'input': {
                const type = (el.getAttribute('type') || 'text').toLowerCase();
                if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
                if (type === 'checkbox') return 'checkbox';
                if (type === 'radio') return 'radio';
                if (type === 'range') return 'slider';
                if (type === 'search') return 'searchbox';
                return 'textbox';
              }
              case 'select':
                return 'combobox';
              case 'textarea':
                return 'textbox';
              case 'nav':
                return 'navigation';
              case 'main':
                return 'main';
              case 'header':
                return 'banner';
              case 'footer':
                return 'contentinfo';
              case 'aside':
                return 'complementary';
              case 'section':
                return 'region';
              case 'img':
                return 'img';
              case 'ul':
              case 'ol':
                return 'list';
              case 'li':
                return 'listitem';
              default:
                return null;
            }
          };
          const accessibleName = el => {
            const aLabel = el.getAttribute('aria-label');
            if (aLabel) return aLabel.trim();
            const labelledBy = el.getAttribute('aria-labelledby');
            if (labelledBy) {
              const refs = labelledBy
                .split(/\s+/)
                .map(id => el.ownerDocument.getElementById(id)?.textContent?.trim())
                .filter(Boolean);
              if (refs.length) return refs.join(' ');
            }
            // Form-control labels
            if (el.labels && el.labels.length) {
              return Array.from(el.labels)
                .map(l => l.textContent.trim())
                .filter(Boolean)
                .join(' ');
            }
            const txt = el.textContent && el.textContent.trim();
            return txt ? txt.slice(0, 80) : '';
          };
          const walk = (el, depth = 0) => {
            if (depth > 20) return null; // cycle / runaway guard
            const role = el.getAttribute('role') || implicitRole(el);
            const node = {
              role: role || el.tagName.toLowerCase(),
              name: accessibleName(el),
              children: [],
            };
            // Walk light children + assigned-slot content + shadow descendants of THIS host,
            // but stop at nested custom elements (their shadow roots are out of scope).
            const stepInto = child => {
              if (!child || child.nodeType !== 1) return;
              if (child.tagName.includes('-') && child !== el && child.tagName.toLowerCase() !== ctx.componentName) {
                // Treat nested custom element as a leaf — still record it.
                node.children.push({ role: child.tagName.toLowerCase(), name: accessibleName(child), children: [] });
                return;
              }
              const sub = walk(child, depth + 1);
              if (sub) node.children.push(sub);
            };
            for (const child of el.children) stepInto(child);
            if (el.shadowRoot && depth === 0) {
              // Only descend the audited host's own shadow root.
              for (const child of el.shadowRoot.children) stepInto(child);
            }
            return node;
          };
          const tree =
            hosts.length === 1 ? walk(hosts[0]) : { role: 'multi', name: '', children: hosts.map(h => walk(h)) };

          // ─ Interactive element census (scoped to subtree) ────────────────
          const collected = [];
          for (const host of hosts) {
            collected.push({ el: host, origin: 'host' });
            for (const el of host.querySelectorAll(interactiveSel)) {
              collected.push({ el, origin: 'light' });
            }
            if (host.shadowRoot) {
              for (const el of host.shadowRoot.querySelectorAll(interactiveSel)) {
                collected.push({ el, origin: 'shadow' });
              }
            }
          }
          const interactive = collected.map(({ el, origin }, index) => {
            const styles = window.getComputedStyle(el);
            return {
              index,
              tag: el.tagName.toLowerCase(),
              origin,
              role: el.getAttribute('role') || null,
              accessibleName: accessibleName(el),
              ariaAttributes: Array.from(el.attributes)
                .filter(a => a.name.startsWith('aria-'))
                .map(a => `${a.name}="${a.value}"`),
              outlineWidth: styles.outlineWidth,
              outlineStyle: styles.outlineStyle,
              outlineColor: styles.outlineColor,
              // BX2 exclusion data (computeExpectedTabStops) — a control that
              // correctly takes no Tab stop, or one of a group where only one
              // member does. `visible` covers a closed overlay's inner
              // content (e.g. `mud-modal`'s default-closed story): present
              // in the DOM, correctly untabbable while closed. `checkVisibility()`
              // (not a `styles.display` read of the element's OWN computed
              // style) is required here — an element inside a `display:
              // none` ANCESTOR (a closed native `<dialog>`) reports its own
              // `display` unaffected; only a rendered-tree-aware check sees
              // the ancestor collapse it. Live Storybook run, mud-modal
              // default (closed) story, 2026-09-22: the own-style read
              // reported `visible: true` for the inner button.
              visible: el.checkVisibility
                ? el.checkVisibility()
                : styles.display !== 'none' && styles.visibility !== 'hidden',
              disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
              tabIndexAttr: el.getAttribute('tabindex'),
              hasHref: el.tagName.toLowerCase() === 'a' ? el.hasAttribute('href') : null,
              inputType:
                el.tagName.toLowerCase() === 'input' ? (el.getAttribute('type') || 'text').toLowerCase() : null,
              groupName: el.getAttribute('name') || null,
              checkedState: 'checked' in el ? !!el.checked : el.getAttribute('aria-checked') === 'true',
            };
          });

          return { tree, interactive };
        },
        { componentName, tags: INTERACTIVE_TAGS, roles: INTERACTIVE_ROLES },
      );

      // BX2 + BX3 — Tab-walk the component and sample the focus ring at each
      // stop. Reduced motion + an injected `transition: none; animation:
      // none` (document + every shadow root) MUST land before this sampling
      // or the ring is caught mid-transition (Phase 0 results: 4 of 5 runs
      // differed without it, 5 of 5 identical with it).
      await applyNoMotionStyle(page);
      // Start the walk from just before the component, not from the page
      // top: a focusable element earlier on the page (e.g. the `<input
      // name="email">` in some stories) otherwise consumes Tab presses
      // before the walk ever reaches the component, and the old
      // `census.length + 2` cap ran out before leaving it.
      await focusJustBeforeComponent(page, componentName);
      const tabWalk = await walkTabOrder(page, componentName, interactive.length);
      await removeTabSentinel(page);

      return { theme, tree, interactive, tabWalk };
    },
  });
}

/**
 * Inject `transition: none !important; animation: none !important;` into the
 * document AND every shadow root reachable from it (Phase 0 results —
 * without this the focus ring is sampled mid-transition), plus
 * `emulateMedia({ reducedMotion: 'reduce' })`. Idempotent — marks each root
 * it has already touched, so it is safe to call again after an interaction
 * that may have rendered new shadow content.
 */
export async function applyNoMotionStyle(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const CSS_TEXT = '*, *::before, *::after { transition: none !important; animation: none !important; }';
    const MARK = 'data-audit-no-motion';
    const inject = root => {
      if (root.querySelector?.(`style[${MARK}]`)) return;
      const style = document.createElement('style');
      style.setAttribute(MARK, '');
      style.textContent = CSS_TEXT;
      (root.head ?? root).appendChild(style);
    };
    const visit = root => {
      inject(root);
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) visit(el.shadowRoot);
      }
    };
    visit(document);
  });
}

/**
 * Insert an invisible sentinel button immediately before the component host
 * and focus it, so the next Tab press is the FIRST one the component can
 * receive. Without this the walk starts at the page top, and a focusable
 * element earlier in the DOM (e.g. an `<input name="email">` elsewhere in
 * the story) silently consumes Tab presses meant for the component — Phase 3
 * live run against `mud-button`'s stories.
 */
export async function focusJustBeforeComponent(page, componentName) {
  await page.evaluate(name => {
    const host = document.querySelector(name);
    if (!host?.parentNode) return;
    const sentinel = document.createElement('button');
    sentinel.setAttribute('data-audit-tab-sentinel', '');
    sentinel.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;';
    host.parentNode.insertBefore(sentinel, host);
    sentinel.focus();
  }, componentName);
}

/** Remove the sentinel `focusJustBeforeComponent` inserted. */
export async function removeTabSentinel(page) {
  await page.evaluate(() => {
    document.querySelector('[data-audit-tab-sentinel]')?.remove();
  });
}

/**
 * Press Tab and, at each stop, record the deep-active element's tag/role and
 * focus-ring computed style. The walk is bounded by element identity and by
 * the component boundary, never by a fixed press count that can run out
 * before leaving the component:
 *   - stops when Tab does not move focus at all (last press was a no-op);
 *   - stops when focus lands on an element already visited (a cycle —
 *     e.g. Tab wrapped back to the sentinel);
 *   - stops when focus LEAVES the component's subtree (host, light DOM or
 *     shadow DOM) — this is what makes leading-page focusables harmless once
 *     the walk starts at the component (`focusJustBeforeComponent`).
 * `maxPresses` is a generous safety cap only, never the primary bound.
 * Pure side-effecting (keyboard + DOM reads) — the judgment over this data
 * (`judgeTabOrder`, `judgeFocusRingVisible`) is unit-testable without a
 * browser.
 */
export async function walkTabOrder(page, componentName, expectedStops) {
  const maxPresses = Math.max(expectedStops, 0) + 10;
  const steps = [];
  await page.evaluate(() => {
    window.__auditTabVisited = new Set();
  });
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press('Tab');
    // Some components toggle their focus-ring class from a JS `focus`
    // listener rather than pure `:focus-visible` CSS, so the ring can land a
    // frame after the keypress. Live Storybook run, mud-checkbox,
    // 2026-09-21: without this wait, 2 of 5 runs sampled before the class
    // landed and reported `boxShadow: 'none'` (false BX3 positive,
    // non-reproducible run to run).
    await page.waitForTimeout(100);
    const step = await page.evaluate(async name => {
      // A story can render more than one instance of the audited component
      // (e.g. mud-button's form-submit story: a Submit AND a Reset button).
      // The census aggregates every instance, so the walk must too — using
      // only the FIRST match here made focus look like it had "left the
      // component" the moment it reached the second instance, ending the
      // walk one stop early (live Storybook run, mud-button's
      // form-submit story, 2026-09-22).
      const hosts = Array.from(document.querySelectorAll(name));
      const deepActiveElement = root => {
        let el = root.activeElement;
        while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
        return el;
      };
      const el = deepActiveElement(document);
      if (!el || el === document.body) return { done: true };

      const insideComponent = hosts.some(host => host === el || host.contains(el) || !!host.shadowRoot?.contains(el));
      if (!insideComponent) return { done: true }; // focus left every instance — end of the reachable set.

      if (window.__auditTabVisited.has(el)) return { done: true }; // cycle (e.g. wrapped back to the sentinel).
      window.__auditTabVisited.add(el);

      // BX3's ring lives on "the focused element, or an element that
      // visibly changes as a RESULT of this focus" — never any element in
      // the subtree that merely happens to carry a ring already (an
      // elevation shadow on the host, a hidden popover). Compare each
      // candidate's ring style focused vs. blurred and keep only the ones
      // that actually differ.
      const isVisible = node => {
        if (!node || node.nodeType !== 1) return false;
        // `checkVisibility()` accounts for a `display: none` ANCESTOR (a
        // closed overlay) collapsing this node — a plain own-style
        // `display`/`visibility` read does not (same fix as the census's
        // `visible` field above).
        if (node.checkVisibility) return node.checkVisibility();
        const s = getComputedStyle(node);
        return s.display !== 'none' && s.visibility !== 'hidden';
      };
      const ringOf = node => {
        const s = getComputedStyle(node);
        return { outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle, boxShadow: s.boxShadow };
      };
      const hasVisibleRing = r =>
        (r.outlineWidth !== '0px' && r.outlineStyle !== 'none') || (r.boxShadow && r.boxShadow !== 'none');

      // Candidates: every VISIBLE element in the focused element's nearest
      // shadow-host subtree (light + shadow) — the ring is frequently drawn
      // on a sibling of the focused element, not an ancestor (e.g.
      // `mud-radio`: `:host(.is-focused) .visual` toggles a class-driven
      // sibling, not the `<input>` itself or anything above it). The subtree
      // scope matches the pre-fix search; what changed is the FILTER: only
      // an element whose ring actually differs focused-vs-blurred, and only
      // a visible one, counts — a decorative host shadow or a hidden
      // popover carries a ring that never changes with focus, so it is
      // never a candidate.
      const root = el.getRootNode()?.host ?? el;
      const candidates = [];
      const collect = node => {
        if (!isVisible(node)) return;
        candidates.push(node);
        for (const child of node.children) collect(child);
        if (node.shadowRoot) for (const child of node.shadowRoot.children) collect(child);
      };
      collect(root);
      if (!candidates.includes(el) && isVisible(el)) candidates.unshift(el);
      const focused = candidates.map(n => ({ node: n, ring: ringOf(n) }));
      el.blur();
      // Some components toggle the ring's class from a JS `blur` listener
      // (the same latency BX3's outer 100ms wait exists for on the focus
      // side — `mud-radio`'s `:host(.is-focused) .visual` is `@State`-driven
      // and its removal lands a frame after `blur()`, not synchronously with
      // it), so read the blurred style only after giving that a moment to land.
      await new Promise(resolve => setTimeout(resolve, 100));
      const blurred = candidates.map(ringOf);
      el.focus(); // restore focus so the next Tab press continues from a sane state.

      let ring = null;
      for (let idx = 0; idx < focused.length; idx++) {
        const { ring: focusedRing } = focused[idx];
        const blurredRing = blurred[idx];
        const changed =
          focusedRing.outlineWidth !== blurredRing.outlineWidth ||
          focusedRing.outlineStyle !== blurredRing.outlineStyle ||
          focusedRing.boxShadow !== blurredRing.boxShadow;
        if (changed && hasVisibleRing(focusedRing)) {
          ring = focusedRing;
          break;
        }
      }
      ring = ring ?? { outlineWidth: '0px', outlineStyle: 'none', boxShadow: 'none' };

      return {
        done: false,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        accessibleName: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 80),
        ...ring,
      };
    }, componentName);
    if (step.done) break;
    delete step.done;
    steps.push(step);
  }
  return steps;
}

/**
 * BX2 exclusion filter: drops census entries that correctly take no Tab
 * stop — the `origin: 'host'` boundary marker, a hidden element
 * (`display: none` / `visibility: hidden` — e.g. a closed overlay's inner
 * content, present in the DOM but untabbable while closed), `disabled` /
 * `aria-disabled` elements, `tabindex="-1"` elements (covers
 * roving-tabindex group members), an `<a>` with no `href`, and every
 * radio-like element in a `name` group except the one the group would
 * actually focus (the checked one, or the first when none is checked —
 * mirrors native `<input type="radio">` grouping, and `mud-radio` renders a
 * real one per instance). Pure — exported for tests.
 */
export function computeExpectedTabStops(census) {
  const list = Array.isArray(census) ? census : [];
  // `mud-radio` renders a native `<input type="radio">` inside its shadow
  // root with no explicit `role` attribute (implicit role only) — match on
  // the input's `type`, plus an explicit `role="radio"` for any component
  // that takes the ARIA-widget route instead.
  const isRadio = el => el.role === 'radio' || (el.tag === 'input' && el.inputType === 'radio');

  const groups = new Map();
  for (const el of list) {
    if (!isRadio(el)) continue;
    const key = el.groupName ?? '__unnamed__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(el);
  }
  const radioExpected = new Set();
  for (const group of groups.values()) {
    const chosen = group.find(el => el.checkedState) ?? group[0];
    if (chosen) radioExpected.add(chosen);
  }

  return list.filter(el => {
    if (el.origin === 'host') return false;
    if (el.visible === false) return false;
    if (el.disabled) return false;
    if (el.tabIndexAttr === '-1') return false;
    if (el.tag === 'a' && el.hasHref === false) return false;
    if (isRadio(el) && !radioExpected.has(el)) return false;
    return true;
  });
}

/**
 * BX2 — every interactive census element must be reachable by Tab. Compared
 * as a (tag, role) multiset rather than strict index order: the census walk
 * (host → light → shadow) and the DOM's actual Tab order are two different,
 * both-legitimate traversals of the same subtree, so index equality would
 * false-positive on any component whose visual tab order isn't host-first.
 * Pure — exported for tests.
 */
export function judgeTabOrder(census, tabWalk) {
  if (!Array.isArray(census) || census.length === 0) return null; // N/A — nothing to reach.
  const walked = new Map();
  for (const step of tabWalk ?? []) {
    const key = `${step.tag}|${step.role ?? ''}`;
    walked.set(key, (walked.get(key) ?? 0) + 1);
  }
  const missing = [];
  const seen = new Map();
  for (const el of census) {
    const key = `${el.tag}|${el.role ?? ''}`;
    const already = seen.get(key) ?? 0;
    seen.set(key, already + 1);
    if (already >= (walked.get(key) ?? 0)) missing.push(el);
  }
  if (missing.length === 0) return null;
  return {
    severity: 'error',
    code: 'A11Y-BX2-TAB-ORDER-GAP',
    message: `${missing.length} census element(s) never received focus via Tab: ${missing
      .map(el => `<${el.tag}>${el.role ? ` role=${el.role}` : ''}`)
      .join(', ')} (WCAG 2.1.1).`,
  };
}

/**
 * BX3 — a Tab stop must have a visible focus indicator: a non-zero outline,
 * or a box-shadow that isn't `none`. Pure — exported for tests.
 */
export function judgeFocusRingVisible(step) {
  if (!step) return null;
  const hasOutline = step.outlineWidth && step.outlineWidth !== '0px' && step.outlineStyle !== 'none';
  const hasBoxShadowRing = step.boxShadow && step.boxShadow !== 'none';
  if (hasOutline || hasBoxShadowRing) return null;
  return {
    severity: 'error',
    code: 'A11Y-BX3-FOCUS-RING-INVISIBLE',
    message: `<${step.tag}>${step.role ? ` role=${step.role}` : ''} has no visible focus ring (outlineWidth=${step.outlineWidth}, boxShadow=${step.boxShadow}) (WCAG 2.4.7).`,
  };
}

/**
 * R6: BX2's `checks[bx2-<theme>]` assembly, extracted so it is unit-tested
 * without a browser. Pure. `bx2` is `judgeTabOrder`'s result (or `null` when
 * it never ran because `expected` is empty).
 */
export function bx2StatusFor(expected, bx2) {
  return expected.length === 0
    ? { status: 'not-applicable', reason: 'no interactive element is expected to take a Tab stop' }
    : { status: bx2 ? 'fail' : 'ok' };
}

/**
 * R6: BX3's `checks[bx3-<theme>]` assembly, extracted so it is unit-tested
 * without a browser. Pure.
 */
export function bx3StatusFor(tabWalk, bx3Failed) {
  return tabWalk.length === 0
    ? { status: 'not-applicable', reason: 'the Tab walk produced no stops inside the component' }
    : { status: bx3Failed ? 'fail' : 'ok' };
}

function pickDefaultStoryId(target) {
  if (target.exists?.stories) {
    const { stories } = analyzeStoriesFile(target.paths.stories, target.name);
    const def = stories.find(s => /default/i.test(s.name)) ?? stories[0];
    return def?.storyId ?? null;
  }
  return inferStoryId(`Components/${pascal(target.bare)}`, 'Default');
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

export { TOOL, INTERACTIVE_TAGS, INTERACTIVE_ROLES, pickDefaultStoryId };
