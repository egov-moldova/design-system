## Scope

The browser-side judgment of the `audit-component` skill: where each fixed browser assertion
(BX) now lives, the archetype checks (CX) the session judges, and the DX ids each `deep` leg
closes. Load it when running the session's own `audit-component` leg or writing a leg brief.
The procedure, the leg table and the `ai-findings.json` contract are in
[`../SKILL.md`](../SKILL.md).

---

## §BX — scripted, not judged

BX1–BX7 are fixed assertions, so scripts run them in their own local Playwright browser (the
shared MCP browser is never used for them). They are verdict rows at `standard`+; the model does
not repeat them.

| Id | Assertion | Script · codes |
| --- | --- | --- |
| BX1 | Hydration + first paint | `19` · `INTERACTION-BX1-NOT-FOUND`, `INTERACTION-BX1-NOT-HYDRATED` |
| BX2 | Tab reaches every census element, in order | `09` · `A11Y-BX2-TAB-ORDER-GAP` |
| BX3 | Visible focus indicator on every Tab stop | `09` · `A11Y-BX3-FOCUS-RING-INVISIBLE` |
| BX4 | Escape closes, focus not trapped (OVERLAY, or an `open` / `close` / `toggle` method) | `19` · `INTERACTION-BX4-ESCAPE-NO-CLOSE`, `INTERACTION-BX4-FOCUS-TRAPPED` |
| BX5 | Light and dark render the same element tree | `19` · `INTERACTION-BX5-STRUCTURAL-DIFF` |
| BX6 | No console error | `12` |
| BX7 | Form round-trip, two-argument `setFormValue` (FORM) | `19` · `INTERACTION-BX7-MISSING-FORMDATA-KEY`, `INTERACTION-BX7-SETFORMVALUE-ONE-ARG` |

A BX finding is corrected through its `verify:` command in the fix brief, never re-checked by hand.

## §CX — archetype checks (the advisory CX leg, ids CX1–CX4)

Read the archetype from `yarn audit:contract <mud-name> --json` → `meta.contract.archetype`
(`value`, `confidence`). Judge **only that archetype's row**. With `confidence: "low"`, you may
judge a different row when the rendered component contradicts the heuristic; say so in the
finding's `message`. Browser work uses this worktree's Storybook port (`.audit-storybook.json`);
confirm the page URL names it before reading any value.

| Archetype | CX1 | CX2 | CX3 | CX4 |
|---|---|---|---|---|
| **FORM** | `internals.validity` and `aria-invalid` + `aria-describedby` reflect required / pattern on invalid input | `formResetCallback` resets the value and `setValidity({})` | `formStateRestoreCallback`: serialize → restore → equal | Label resolves: `aria-labelledby` target exists, or `<label for>` matches |
| **STATUS** | `aria-live` / role fit the severity: `polite` / `status` for status and loading, `assertive` / `alert` for alerts | Animation honours `prefers-reduced-motion` | Dismiss control has an accessible name and Escape closes | N/A |
| **OVERLAY** | Focus trapped inside while open | Backdrop click closes, when the API offers it | `aria-modal="true"` and role `dialog` / `alertdialog` | Body scroll locked while open |
| **ACTION** | Click and Enter / Space fire the contract's `@Event()` | Disabled blocks click and keyboard | Loading (if a prop) blocks interaction and sets `aria-busy="true"` | Icon-only variant has an accessible name |
| **CONTAINER** | Slotted content does not overflow at 320 px | Every token defined in one theme is defined in the other | Empty slot renders a graceful empty state | N/A |

Severity: a failed CX check is `"severity": "error"`, OVERLAY CX1 included; like every AI
finding it is advisory at every depth and does not change the state (Decision 12). A check that cannot be decided from the component alone (the design is silent) is a
decision: `question` + `options`, never a guess. An N/A cell still appears in `idsJudged`.

## §DX — what each `deep` leg judges

Each id below is closed by one leg's `ai-findings.json`. Put the id's line in that leg's brief.

| Id | Leg | Judges |
| --- | --- | --- |
| `DX-stencil-manual` | `stencil-compliance` (session) | Every `manual` row of the [Rule index](../../stencil-compliance/SKILL.md#rule-index) against the source |
| `DX-wcag` | `a11y-verifier` | Full WCAG 2.1 AA: roles and redundant ARIA, keyboard operation including Shift+Tab, non-text contrast 3:1 for controls and focus rings (SC 1.4.11 — script `10` does not evaluate it), disabled state distinguishable, no colour-only information |
| `DX-media` | `a11y-verifier` | `prefers-reduced-motion`, `forced-colors`, 320 px viewport, `dir="rtl"` — each rendered and judged, none optional |
| `DX-figma-themes` | `pixel-perfect-verifier` | Every manifest state in both themes, beyond what `11` / `15` already graded ([`pixel-perfect`](../../pixel-perfect/SKILL.md)) |
| `DX-security` | `audit-component` (session) | Checklist below |

**DX-security checklist** (source review; `02` already covers inline styles and `innerHTML`):
- no dynamic code execution (string-evaluating constructors or timers);
- no URL loaded or navigated to without an allowlist or sanitisation;
- slotted or attribute content that reaches markup is validated;
- no secrets, tokens or personal data in props, events or logs;
- no `document.cookie` / `localStorage` / `sessionStorage` access in component code;
- event payloads expose only their documented public shape, never internal state.
