## Scope

Governs Layer 2 of the `audit-component` skill's three-layer architecture:
the AI-driven MCP browser checks that scripts cannot adapt to per-component
(keyboard nav, focus traps, form validation, light/dark structural diff).
Three sections, run in order — §BX mandatory, §CX archetype-specific, §DX
discretionary. Load this file when the Fast Path orchestrator sets
`envelope.meta.layer2Required === true` (Step 2 of the Fast Path), or when
running the manual Wave 3 fallback and Layer 2 applies. See
[`../SKILL.md`](../SKILL.md) for the audit's overall architecture and when
Layer 2 is skipped.

---

## Layer 2 — AI MCP browser checks (BX mandatory + CX archetypal + DX discretionary)

This is the **adaptive** layer that scripts cannot cover. It runs once L1 is done,
locally only (skipped when `meta.layer2Required === false`). Three sections,
parsed in order: **BX → CX → DX**. AI tracks per-section results in the
Check Matrix at the end of the report.

**Pre-conditions:**
- L1 envelope in hand (read `meta.contract.archetype.value` to pick the CX block).
- Storybook reachable on `:6007` (Step 0 already ensured this).
- MCP Playwright (`mcp__playwright__browser_*`) available. If the first
  `browser_navigate` fails, mark all BX rows ⏭️ with reason `mcp-unavailable`
  and verdict `Review — Layer 2 deferred`. Do NOT silently skip.

**Browser session policy:** open ONE session via `browser_navigate` for BX1
and reuse it across BX2–BX7 + CX + DX. Re-navigate only when changing story.

### §BX — Mandatory Browser Checklist

6 mandatory items + 1 conditional. Earlier items gate later ones — if BX1 fails
(no hydration), do NOT continue; mark BX2–BX7 ⏭️ with reason `BX1 gate`.

```text
BX1 — Hydration + first paint
  mcp__playwright__browser_navigate({ url: storyUrl(componentName, 'default') })
  mcp__playwright__browser_wait_for({ time: 1 })
  mcp__playwright__browser_snapshot()
  PASS: snapshot contains mud-<name> with class `hydrated` and ≥1 child node
  FAIL: BLOCK (verdict "Block — incomplete audit"; no point running BX2–BX7)
  Fallback: if no Default story exists, navigate to the FIRST story id from
            envelope.findingsByTool['story-exports'].

BX2 — Tab order reaches every focusable element
  Walk the interactive census from L1 (envelope.findingsByTool['a11y-tree'][...]
  meta-snapshot.light.interactive[]). For each element:
    mcp__playwright__browser_press_key({ key: 'Tab' })
    mcp__playwright__browser_evaluate({ function: "() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id, role: document.activeElement?.getAttribute('role') })" })
  PASS: every census element receives focus in DOM order; Shift+Tab walks back
  FAIL: CRITICAL — keyboard trap, skipped element, or wrong order (WCAG 2.1.1)
  N/A: archetype === CONTAINER AND census.length === 0

BX3 — Focus-visible ring on every focusable element
  For each focused element from BX2:
    mcp__playwright__browser_evaluate({ function: "() => { const s = getComputedStyle(document.activeElement); return { outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, boxShadow: s.boxShadow }; }" })
  PASS: outlineWidth !== '0px' OR boxShadow contains a focus token (non-'none')
  FAIL: CRITICAL — invisible focus (WCAG 2.4.7)
  N/A: same as BX2

BX4 — Escape / activation (conditional)
  Runs only when archetype ∈ {OVERLAY} OR contract has @Method matching /^(open|close|toggle)$/
  - Open the overlay (set prop via browser_evaluate or click trigger)
  - mcp__playwright__browser_press_key({ key: 'Escape' })
  - browser_snapshot() and verify:
      • overlay no longer visible (open prop flipped OR display:none)
      • focus returned to the trigger element
  FAIL: CRITICAL (WCAG 2.1.2 — no keyboard trap)
  Skip: archetype not in list → row renders as ➖ N/A

BX5 — Light + dark structural diff
  Snapshot light:
    mcp__playwright__browser_snapshot({ filename: 'bx5-light.snapshot.yml' })
  Toggle dark:
    mcp__playwright__browser_evaluate({ function: "() => { document.documentElement.dataset.theme = 'dark'; return new Promise(r => requestAnimationFrame(() => r(true))); }" })
  Snapshot dark, then compare DOM structure (element count + tag set), NOT pixels
  PASS: identical element tree across themes
  FAIL: HIGH — dark mode loses an element OR throws a console error
  (Pixel-level diff is pixel-perfect-verifier's job; this is the cheap gate.)

BX6 — Console-error sweep
  mcp__playwright__browser_console_messages({ level: 'error' })
  PASS: zero errors across BX1–BX5
  FAIL: any error → escalate severity of all BX failures to CRITICAL
        (a console error during a checked action means the component is
         silently broken in that scenario)

BX7 — Form submission round-trip (conditional: archetype === FORM only)
  mcp__playwright__browser_evaluate({ function: "/* inject <form>; set value via component API; dispatch submit; read FormData */" })
  PASS: FormData carries the expected key + value; internals.setFormValue
        called with TWO args (name, state) — never just one
  FAIL: CRITICAL — missing key, wrong value, or 1-arg setFormValue
  Skip: archetype !== FORM → ➖ N/A
```

**BX exit rules**

- All applicable BX items MUST be done (✅ / ❌) or marked ⏭️ with explicit reason.
- If any BX item is skipped without `--fast` / `--ci` / `mcp-unavailable` reason → verdict = **"Block — incomplete audit"**.
- If BX6 reports an error AND any other BX failed → all BX failures upgrade to **CRITICAL**.

### §CX — Archetype-specific checklist

Read `contract.archetype.value` from `envelope.findingsByTool['component-contract'][...meta.contract]` (or from the script-14 stand-alone envelope under `meta.contract.archetype`). Run **only the row for that archetype**.

If `archetype.confidence === 'low'`: AI MUST flag this in the matrix as INFO and may switch to a different CX block if observation contradicts the heuristic (note the override in the report).

| Archetype | CX1 | CX2 | CX3 | CX4 |
|---|---|---|---|---|
| **FORM** | `internals.validity` reflects required/pattern (set invalid input, read `aria-invalid` + validity state) | `formResetCallback` resets value + `setValidity({})` (trigger reset on parent form) | `formStateRestoreCallback` serialize → restore → assert equal (dump + restore via API) | Label association: `aria-labelledby` resolves to existing element OR `<label for=>` matches host id |
| **STATUS** | `aria-live` correct for severity: `polite` for status/loading, `assertive` for alert | Animation respects `prefers-reduced-motion` (toggle media query via `browser_evaluate`, re-check `animation-duration`) | Dismiss path (if any): close button has accessible name AND Esc closes | ➖ N/A |
| **OVERLAY** | Focus trap inside when open (Tab from last focusable cycles to first, not outside) — CRITICAL on fail | Backdrop click closes (if `closeOnBackdrop` prop or similar) | `aria-modal="true"` AND `role ∈ {dialog, alertdialog}` on the rendered overlay | Body scroll locked while open (read `document.body.style.overflow`) |
| **ACTION** | Click handler fires the `@Event()` from script 14 (attach listener via `browser_evaluate`, click, assert) | Disabled state blocks BOTH click AND keyboard (Space/Enter) | Loading state (if prop) disables interaction AND sets `aria-busy="true"` | Icon-only variant has `aria-label` (cross-ref script-09 finding) |
| **CONTAINER** | Slotted content layout doesn't overflow at 320px viewport (`browser_resize`, snapshot, check clipping) | Light + dark token usage parity (cross-ref `tokens.validate` envelope — every token defined in one theme is defined in the other) | `:empty` slot rendering correct (clear slot content via `browser_evaluate`, snapshot for graceful empty state) | ➖ N/A |

**CX exit rules**

- CX must run all applicable checks for the matched archetype. Skipped CX → verdict = **"Review — partial"** (UNLESS BX failed first, in which case "Block").
- CX failures default to **HIGH** severity; OVERLAY CX1 (focus trap) is **CRITICAL** because a missing focus trap is a compound a11y/security defect.

### §DX — Discretionary observations (AI initiative)

Always **INFO** in the matrix; never blocks. AI adds these based on what it observes:

- `prefers-reduced-motion`: toggle media query, verify animations honor it.
- Document direction RTL: set `dir='rtl'` via `browser_evaluate`, re-snapshot, eyeball mirror issues.
- Viewport stress: `mcp__playwright__browser_resize` to 320 / 768 / 1280, snapshot at each.
- High-contrast mode: toggle `forced-colors` media query (if supported), snapshot.
- **AI ad-hoc**: any story or interaction the AI deems worth verifying beyond BX/CX — e.g., "Stories include a `LongLabel` variant; I verified text-overflow behavior at narrow widths." Log each ad-hoc DX explicitly in the report so reviewers see what was covered.
