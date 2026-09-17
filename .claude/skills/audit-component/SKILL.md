---
name: audit-component
description: Use when auditing a single `mud-*` Stencil component for production readiness. Runs a 3-wave audit (Discovery → Static Analysis → Browser Verification) covering structure, TypeScript, design tokens, CSS architecture, Stencil decorators, lifecycle, host management, stories, tests, accessibility, security, and performance. Accepts flags `--deep` (invoke companion skills end-to-end), `--e2e` (include E2E test audit), `--fast` (skip browser wave for pre-commit). Returns a categorized report; never auto-fixes.
---

# audit-component — Skill

Audit a single `mud-*` Stencil component end-to-end. This skill encapsulates the logic previously in `/audit-component` slash command so it can be invoked from any orchestrator agent (`new-component`, `refactor-component`, `migrate-component`, `custom-component`, `audit-production`).

## Three-Layer Architecture (read this first)

The audit runs in three layers. Each layer has a distinct responsibility, runtime, and skip rule. Lower layers capture deterministic data; higher layers interpret it.

| Layer | What runs | When | Skips if |
|---|---|---|---|
| **L1 — Deterministic scripts** | `run-all.mjs` orchestrates scripts 01–15 in 3 parallel waves (A static · B build · C browser). Pure I/O + math; byte-identical output across runs. | local + CI | Wave C only: `--no-browser` or `--ci` or `process.env.CI` |
| **L2 — AI MCP browser checks** | Mandatory BX checklist + archetype-specific CX + discretionary DX. Drives MCP Playwright (`mcp__playwright__browser_*`) to verify keyboard nav, focus traps, form validation, light/dark structural diff — things scripts cannot adapt to per-component. | local only | `--fast` OR `ciDetected` OR MCP unavailable |
| **L3 — Cross-layer synthesis** | AI correlates L1 + L2 findings, escalates severity, emits the Check Matrix + Verdict. | local + CI | never |

**Routing flag the orchestrator emits**: `envelope.meta.layer2Required`. AI MUST run L2 when this is `true` (and skip when `false`). `envelope.meta.ciDetected` surfaces the CI state to dashboards.

## Inputs

- `componentName` (required): `mud-<name>` — folder name in `src/components/` or `src/hidden/`
- Optional flags:
  - `--deep` — also invoke [`stencil-compliance`](../stencil-compliance/SKILL.md)'s [Run contract](../stencil-compliance/SKILL.md#run-contract) + [`accessibility-compliance`](../accessibility-compliance/SKILL.md) deep audit (via `/audit-accessibility`)
  - `--e2e` — include Phase 5b E2E test audit (default: unit-only). For future when E2E tests are mandated.
  - `--fast` — skip Wave 3 (browser scripts) AND skip L2. Used by `pre-pr-check` for sub-30s pre-commit pass.
  - `--ci` — skip Wave C AND skip L2 (auto-set when `process.env.CI` is truthy).

## When to invoke

| Caller | Why |
|--------|-----|
| User via `/audit-component @mud-x` | Pre-PR audit on a specific component |
| `new-component` agent (after Core Build) | Block scaffolding-to-ready transition |
| `refactor-component` agent | Verify refactor didn't break invariants |
| `migrate-component` agent | Required for `src/hidden/` → `src/components/` graduation |
| `audit-production` agent (Phase 1) | Delegates structural/decorator checks |

## Execution Model

```
Wave 1 — Discovery (parallel I/O)
   ├─ Read all component files (TSX/CSS/types/enums/constants/stories/spec)
   ├─ Read tokens/core/components/<name>.tokens.json
   ├─ Read reference impls (mud-button, mud-input)
   ├─ Grep anti-patterns (CSS + TSX)
   ├─ Bash: yarn lint
   ├─ Bash: yarn tokens.build (must complete before Wave 2 token verification)
   └─ Bash: check Storybook port 6007
                          │
                          ▼
Wave 2 — Static Analysis (reasoning over Wave 1 data)
   ├─ Structural audit (file presence, member order, naming)
   ├─ TypeScript strict mode audit
   ├─ Stencil decorator audit (delegates to stencil-compliance)
   ├─ Lifecycle cleanup audit (NEW)
   ├─ Reactivity mutation audit (NEW)
   ├─ Token compliance (DTCG, root key, naming convention)
   ├─ CSS architecture pattern (A: slotted / B: internal DOM)
   ├─ Story coverage check
   └─ Test coverage check (unit by default; e2e gated on --e2e)
                          │
                          ▼
Wave 3 — Browser Verification (skipped if --fast)
   ├─ Navigate to story
   ├─ Snapshot accessibility tree
   ├─ Evaluate computed styles (light + dark)
   ├─ Console warnings check
   └─ yarn audit:contrast (parallel with browser calls)
                          │
                          ▼
Optional Deep Pass (if --deep)
   ├─ stencil-compliance Run contract (see stencil-compliance/SKILL.md#run-contract)
   └─ Invoke /audit-accessibility (full 9-step WCAG audit)
                          │
                          ▼
                    Final Report
```

---

## Fast Path (preferred when scripts are in place)

**Before running any of the manual grep / read steps below, dispatch the local
audit orchestrator.** It runs the same checks deterministically in parallel,
producing a JSON envelope you can read in one shot.

### Step 0 — Storybook orchestration (BEFORE invoking the orchestrator)

The orchestrator's Wave C (a11y tree, contrast pairs, console errors,
optional pixel diff) requires Storybook on port 6007. **The AI agent is
responsible for ensuring it is running** — do NOT assume the human will
start it in another terminal.

```text
1. Probe port 6007 (one of):
     - PowerShell: netstat -ano | findstr :6007
     - Bash:       lsof -i :6007
     - Or call scripts/audit/lib/storybook-helpers.mjs::isStorybookReachable
2. Decision:
     - If --fast flag is set                          → SKIP Wave C, run with --no-browser
     - Else if Storybook IS reachable                 → run full suite (no flag)
     - Else (Storybook NOT reachable, --fast not set) → start `yarn sp.dev.watch`
       in background, poll until reachable (~10s), THEN run full suite
3. Never silently skip Wave C because Storybook is missing. Either start it
   or explicitly use --fast / --no-browser and report that browser checks
   were skipped in the final summary (`Storybook: skipped (not running)`).
```

### Step 1 — Run the orchestrator (Layer 1)

```bash
# Default (full audit): runs Wave A + B + C in parallel inside each wave.
# Pre-condition: Storybook on :6007 (Step 0 ensured this).
node scripts/audit/run-all.mjs <componentName> --json

# --fast / pre-commit speed path: skip browser-driven scripts AND Layer 2.
node scripts/audit/run-all.mjs <componentName> --no-browser --json

# CI mode: same as --no-browser PLUS sets meta.ciDetected for downstream tools.
# Auto-triggered when env.CI is truthy.
node scripts/audit/run-all.mjs <componentName> --ci --json
```

### Step 2 — Run Layer 2 (MCP browser checks) — local only

If `envelope.meta.layer2Required === true`, AI MUST execute Layer 2 — see
[`references/layer-2-browser-checklists.md`](references/layer-2-browser-checklists.md):
- §BX — Mandatory browser checklist (BX1–BX7).
- §CX — Archetype-specific checklist — dispatch on `envelope.findingsByTool['component-contract'][...].meta.contract.archetype.value`.
- §DX — Discretionary observations (optional, AI-driven).

If `envelope.meta.layer2Required === false` (CI, `--fast`, `--no-browser`): skip L2 entirely and mark all BX/CX/DX rows in the matrix as `⏭️` with reason `layer2-disabled`.

### Step 3 — Cross-layer synthesis (Layer 3)

Always runs. Correlate L1 + L2 findings, escalate severity for compound defects (e.g., "missing accessible name in L1's a11y-tree AND contrast fail in L1's contrast-pairs AND Tab cannot reach the element in L2 BX2 → CRITICAL"), then emit the Check Matrix + Verdict per [`references/report-template.md`](references/report-template.md).

The envelope shape is documented in `scripts/audit/lib/json-output.mjs`
(schemaVersion 1.0.0). Per-script details:

| id | script | covers |
|----|--------|--------|
| 01 | `01-component-structure.mjs` | required + optional files, tokens file, hidden/components location |
| 02 | `02-stencil-antipatterns.mjs` | patterns from anti-patterns.md (inline styles, mutations, lifecycle leak, etc.) |
| 03 | `03-git-hygiene.mjs` | branch naming, conventional commits, forbidden staged paths |
| 04 | `04-jsdoc-completeness.mjs` | component class + per-prop / per-event / per-method JSDoc |
| 05 | `05-story-exports.mjs` | enumerates stories, computes Storybook ids, coverage vs Default/AllVariants/AllSizes/States |
| 06 | `06-test-coverage.mjs` | reads `coverage/coverage-summary.json` per component |
| 07 | `07-integration-usage.mjs` | usage sites across stories/tests/components/web-components |
| 08 | `08-bundle-size.mjs` | dist size + per-chunk attribution |
| 09 | `09-a11y-tree.mjs` | DOM-derived accessibility tree (role/name/children) + interactive-element census, scoped to the audited component's subtree (host + light DOM + own shadow root) — light + dark |
| 10 | `10-contrast-pairs.mjs` | WCAG 2.1 AA contrast on every interactive element (light + dark) |
| 11 | `11-pixel-diff-states.mjs` | Pixelmatch diff vs Figma references for every state of the component's Figma state manifest (story mode when there is none) |
| 12 | `12-console-errors.mjs` | console.error / pageerror per story |
| 13 | `13-token-diff.mjs` | DTCG diff vs Figma export |
| 14 | `14-component-contract.mjs` | full API surface (props/events/methods/slots/formAssociated) |
| 15 | `15-style-parity.mjs` | computed styles vs the exact values the Figma nodes specify, per manifest state; `absent` entries catch elements with no design |

After consuming the envelope, **only the judgment-heavy steps remain for AI**.
The orchestrator hands you raw findings; you still own:

1. **Per-script interpretation** — walk `findingsByTool` (not just `summary`):
   ARIA correctness for the captured a11y tree (09), contrast-failure
   remediation choice (10), architecture review from the contract (14), naming
   critique, edge-case story suggestions (05).
2. **Cross-script synthesis** — correlate findings across tools. Examples:
   - 02 ANTIPATTERN-007-LIFECYCLE-LEAK + 14 missing `disconnectedCallback` ⇒
     same defect, report once with both citations.
   - 09 missing accessible name + 10 contrast failure on same node ⇒ that
     element is doubly-broken; flag as Critical.
   - 05 missing AllVariants/States story + 11 pixel-diff WARNING ⇒
     coverage gap likely hides the regression.
3. **Severity escalation** — script `error` severity is a default; escalate to
   Critical in the report when correlated with security/form-association/data
   loss risk.
4. **Final synthesis** — produce the pass/fail matrix + categorized issue
   lists + recommendations in the format in
   [`references/report-template.md`](references/report-template.md).

The manual detail in Wave 1, [`references/wave-2-static-analysis.md`](references/wave-2-static-analysis.md)
and Wave 3 remains as a fallback when the orchestrator is unavailable (CI
without Node, fresh checkout before `yarn install`, etc.).

---

## References — load on demand

| File | Covers | Load when |
| --- | --- | --- |
| [references/wave-2-static-analysis.md](references/wave-2-static-analysis.md) | Wave 2 static-analysis checks §2.1–§2.10: structural audit, TypeScript strict mode, Stencil decorator delegation, lifecycle cleanup, form-associated callbacks, token compliance, CSS architecture pattern, slot validation, story coverage, test coverage | Running Wave 2 of a full audit, or interpreting the Layer 1 envelope's static-analysis findings |
| [references/layer-2-browser-checklists.md](references/layer-2-browser-checklists.md) | Layer 2 AI MCP browser checks: §BX mandatory checklist (BX1–BX7), §CX archetype-specific checklist, §DX discretionary observations | `envelope.meta.layer2Required === true` (Fast Path Step 2), or the manual Wave 3 fallback needs the adaptive browser checks |
| [references/report-template.md](references/report-template.md) | Final Report skeleton: Check Matrix, matrix rules, verdict rules, Critical/High/Medium/Low issue categories, Cross-Script Synthesis, Recommendations | Producing the Final Report in Layer 3 (cross-layer synthesis), after Wave 3 / Layer 2 / the Security & Performance Spot-Check have run |

---

## Wave 1: Discovery (all parallel)

Dispatch in a SINGLE message with multiple parallel tool calls.

### File Reads (parallel — non-existent files OK to skip silently)

- `src/components/<componentName>/<componentName>.tsx`
- `src/components/<componentName>/<componentName>.css`
- `src/components/<componentName>/<componentName>.types.ts`
- `src/components/<componentName>/<componentName>.enums.ts`
- `src/components/<componentName>/<componentName>.constants.ts`
- `src/components/<componentName>/<componentName>.stories.ts`
- `src/components/<componentName>/test/<componentName>.spec.tsx`
- `src/components/<componentName>/test/<componentName>.e2e.ts` (read but only score if `--e2e`)
- `tokens/core/components/<bareName>.tokens.json` (drop the `mud-` prefix)

### Reference Reads (parallel — for cross-comparison)

- `src/components/mud-button/mud-button.tsx`
- `src/components/mud-text-input/mud-text-input.tsx`

### Anti-Pattern detection

Use Fast Path script `02-stencil-antipatterns.mjs` (CSS + TSX)
run in parallel internally. Reference catalogue:
[`stencil-compliance/references/anti-patterns.md`](../stencil-compliance/references/anti-patterns.md).

Pattern codes consumed from `findingsByTool.antipatterns` are the `code` fields of
`PATTERNS` and `FILE_CHECKS` in
[`02-stencil-antipatterns.mjs`](../../../scripts/audit/02-stencil-antipatterns.mjs); print them with
`node -e "import('./scripts/audit/02-stencil-antipatterns.mjs').then(m => console.log([...m.PATTERNS, ...m.FILE_CHECKS].map(p => p.code).join('\\n')))"`.

`@Method()` async, `!important` and `transition: all` are no longer
`02-stencil-antipatterns.mjs` codes — they are enforced by `yarn lint`
(`@stencil/async-methods`, `declaration-no-important`,
`declaration-property-value-disallowed-list`).

### Bash (parallel)

```bash
yarn lint
```

```bash
yarn tokens.build
```

```powershell
# PowerShell
netstat -ano | findstr :6007
```

```bash
# Unix
lsof -i :6007
```

**Storybook orchestration** — see the Fast Path "Step 0" above. Default
behavior: if Storybook is NOT listening AND `--fast` is not set, the AI MUST
start `yarn sp.dev.watch` in background and wait ~10s for the port to open
before continuing to Wave 3 / browser scripts. Never silently skip browser
checks — either start Storybook, or explicitly mark the run as `--fast` and
note it in the matrix (`Storybook: skipped (not running)`).

---

## Wave 3: Browser Verification (skipped if `--fast`)

Dispatch in a SINGLE message; reuse Storybook session if active.

### 3.1 Navigate

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-mud-<name>--default" })
```

### 3.2 Wait + Snapshot + Console + Contrast (parallel)

```text
mcp__playwright__browser_wait_for({ time: 2 })
mcp__playwright__browser_snapshot()
mcp__playwright__browser_console_messages({ level: "warning" })
```

```bash
yarn audit:contrast
```

### 3.3 Computed Styles (light + dark)

```text
mcp__playwright__browser_evaluate({ function: "() => { const el = document.querySelector('mud-<name>')?.shadowRoot?.querySelector('.target') || document.querySelector('mud-<name>'); const s = window.getComputedStyle(el); return { bg: s.backgroundColor, fg: s.color }; }" })
```

Toggle dark mode and repeat:

```text
mcp__playwright__browser_evaluate({ function: "() => { document.documentElement.dataset.theme = 'dark'; return new Promise(r => requestAnimationFrame(() => r(true))); }" })
```

### 3.4 Accessibility Quick-Check (WCAG 2.1 AA subset)

**Canonical reference:** [`accessibility-compliance`](../accessibility-compliance/SKILL.md). For deep audit run `/audit-accessibility @mud-<name>` (auto-invoked when `--deep`).

**ARIA & semantics** (SC 4.1.2, 4.1.3, 2.5.3):
- Interactive elements have appropriate ARIA roles
- ARIA labels present where visible text is absent
- `aria-disabled="true"` on non-button disabled elements
- No redundant ARIA (e.g., `role="button"` on `<button>`)
- Error states have `aria-invalid="true"` and `aria-describedby`
- Status messages use `role="status"` or `role="alert"` per urgency

**Keyboard navigation** (SC 2.1.1, 2.1.2, 2.4.3, 2.4.7):
- Focusable via Tab
- Focus ring visible: `:focus-visible` styles
- Enter/Space activates
- Escape closes overlays/dropdowns
- No keyboard traps (Shift+Tab also works)

**Visual accessibility** (SC 1.4.1, 1.4.3, 1.4.11):
- Color contrast WCAG 2.1 AA: text 4.5:1 / 3:1 — verified in light AND dark mode
- UI components & focus rings: 3:1 against adjacent colors
- Disabled state distinguishable (opacity/color, not just cursor)
- No information by color alone

---

## Security & Performance Spot-Check

Cross-reference Wave 1 grep results.

**Security** — reject from [`_agents/anti-patterns.md`](../../../_agents/anti-patterns.md):

- Inline styles in TSX (CSP violation)
- `innerHTML` assignment without sanitization (XSS)
- Dynamic code execution constructors
- External URL loading without sanitization
- Missing slot content validation
- Sensitive data in props or events (tokens, passwords, PII)
- Direct `document.cookie` / `localStorage` access in component code
- Event payloads leaking internal state

**Performance**:

- No unnecessary re-renders — `@State()` only for values affecting render
- No heavy computation in `render()`
- `shadow: true` in component decorator
- No DOM queries in loops — cache `querySelector` results
- Event listeners properly scoped (no leaked `window`/`document` listeners — pair with `disconnectedCallback`)
- CSS `transition: all` NOT used
- No large inline SVGs — use `mud-icon`
- No large external dependencies

---

## Notes on Parallelism

- **Wave 1** is pure I/O — Read/Grep/Bash all run in parallel without conflicts. Single message, multiple tool calls.
- **Wave 2** is reasoning over Wave 1 data — no new I/O needed (except `stencil-compliance` Skill invocation if `--deep`).
- **Wave 3** browser calls are sequential within a single MCP Playwright session (one browser instance), but `yarn audit:contrast` runs in parallel via Bash.
- `--fast` flag skips Wave 3 entirely (sub-30s pre-commit pass).
- `--deep` adds `stencil-compliance`'s Run contract (~5s additional) and full `/audit-accessibility` (~30s additional with deep MCP navigation).

---

## Cross-Skill Invocation

Other agents can invoke this skill via the Skill tool:

```text
Skill('audit-component', { args: 'mud-button --fast' })
```

When invoked headlessly, the skill returns the Final Report string. The orchestrator agent decides whether to surface it or act on findings.

## Related References

- [`stencil-compliance/SKILL.md`](../stencil-compliance/SKILL.md) — Stencil rule catalog, see its [Run contract](../stencil-compliance/SKILL.md#run-contract) and [Rule index](../stencil-compliance/SKILL.md#rule-index)
- [`accessibility-compliance/SKILL.md`](../accessibility-compliance/SKILL.md) — WCAG 2.1 AA companion
- [`token-creation/SKILL.md`](../token-creation/SKILL.md) — token-tier rules
- [`src/components/AGENTS.md`](../../../src/components/AGENTS.md) — project-specific component patterns
- [`_agents/anti-patterns.md`](../../../_agents/anti-patterns.md) — project anti-pattern list
