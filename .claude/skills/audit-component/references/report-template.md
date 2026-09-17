## Scope

Governs the Final Report of the `audit-component` skill: the machine-readable
Check Matrix and the human-readable narrative (categorized issues,
cross-script synthesis, recommendations, verdict rules) that close out an
audit. Load this file when Layer 3 (cross-layer synthesis) is producing the
report, after Wave 3 / Layer 2 / the Security & Performance Spot-Check have
run. See [`../SKILL.md`](../SKILL.md) for the audit's overall architecture
and where this report fits in the execution model.

---

## Final Report

The report has two complementary parts: a **machine-readable matrix** (every
check + status, generated mostly from `findingsByTool`) and the
**human-readable narrative** (categorized issues + recommendations) that
follows. The matrix lets the user see at a glance which dimensions passed and
which need attention; the narrative explains the "why" and what to do.

```text
## Audit Report: <componentName>
**Flags**: <list active flags, e.g. --deep, --e2e, --ci>
**Storybook**: <reused | started | skipped (--fast) | skipped (not running)>
**Orchestrator**: <run-all.mjs ran in Xms | unavailable, manual fallback used>
**Archetype**: <FORM | STATUS | OVERLAY | ACTION | CONTAINER> (source: <heuristic|override>, confidence: <high|medium|low>)
**Layer 2**: <executed | skipped (--ci) | skipped (--fast) | skipped (mcp-unavailable)>

### Check Matrix

Symbols: ✅ pass · ⚠️ warnings only · ❌ errors · ⏭️ skipped · ➖ N/A
Columns: E | W | I — E = Errors (critical, blocking) W = Warnings (recommendations) I = Information/Observations (non-blocking)

| # | Category                         | Status | E | W | I | Source             |
|---|----------------------------------|--------|---|---|---|--------------------|
| 01 | Component structure             |  ✅    | 0 | 0 | 0 | script 01          |
| 02 | Stencil anti-patterns           |  ❌    | 2 | 3 | 0 | script 02          |
| 03 | Git hygiene                     |  ✅    | 0 | 0 | 1 | script 03          |
| 04 | JSDoc completeness              |  ⚠️    | 0 | 4 | 0 | script 04          |
| 05 | Story exports / coverage        |  ⚠️    | 0 | 1 | 0 | script 05          |
| 06 | Unit-test coverage              |  ✅    | 0 | 0 | 0 | script 06          |
| 07 | Integration usage               |  ✅    | 0 | 0 | 2 | script 07          |
| 08 | Bundle size                     |  ✅    | 0 | 0 | 0 | script 08          |
| 09 | Accessibility tree (light+dark) |  ⚠️    | 0 | 2 | 0 | script 09 + AI ARIA |
| 10 | Contrast pairs (light+dark)     |  ❌    | 1 | 0 | 0 | script 10          |
| 11 | Pixel diff vs Figma             |  ⏭️    | – | – | – | no Figma state manifest |
| 12 | Console errors                  |  ✅    | 0 | 0 | 0 | script 12          |
| 13 | Token diff                      |  ✅    | 0 | 0 | 0 | script 13          |
| 14 | Component contract              |  ✅    | 0 | 0 | 0 | script 14          |
| 15 | Style parity vs Figma           |  ⏭️    | – | – | – | no Figma state manifest |
| BX1 | L2: Hydration + first paint    |  ✅    | – | – | – | MCP browser_snapshot |
| BX2 | L2: Tab order on focusables    |  ✅    | – | – | – | MCP browser_press_key |
| BX3 | L2: Focus-visible ring         |  ✅    | – | – | – | MCP browser_evaluate |
| BX4 | L2: Escape / activation         |  ➖    | – | – | – | archetype not OVERLAY |
| BX5 | L2: Light + dark structural    |  ✅    | – | – | – | MCP snapshot ×2 |
| BX6 | L2: Console error sweep         |  ✅    | – | – | – | MCP browser_console_messages |
| BX7 | L2: Form submission round-trip  |  ➖    | – | – | – | archetype !== FORM |
| CX  | L2: Archetype-specific (<TYPE>)|  ✅    | – | – | – | see CX sub-bullets |
| DX  | L2: Discretionary observations |  ✅    | – | – | – | informational |
| —  | TypeScript strict (AI)          |  ✅    | – | – | – | yarn lint          |
| —  | CSS architecture pattern (AI)   |  ✅    | – | – | – | manual review      |
| —  | Form-associated callbacks (AI)  |  ➖    | – | – | – | non-form component |
| —  | Security & performance (AI)     |  ✅    | – | – | – | spot-check         |
| —  | Deep Stencil pass (if --deep)   |  ⏭️    | – | – | – | flag absent        |
| —  | E2E coverage (if --e2e)         |  ⏭️    | – | – | – | flag absent        |

**CX sub-rows** (rendered inline under the CX row, one per check that ran for the matched archetype):
- CX1 ...
- CX2 ...
- CX3 ...
- CX4 ... (or ➖ N/A)

**Roll-up**: ✅ X · ⚠️ Y · ❌ Z · ⏭️ N skipped · ➖ M N/A
**Verdict**: <Ready to merge | Review — partial | Block — critical fixes required | Block — incomplete audit>

### Summary
- Total checks: <X> · Pass: <a> · Warning: <b> · Fail: <c> · Skipped: <d>
- Highest severity: <Critical | High | Medium | Low | None>

### Critical Issues (must fix before merge)
1. <code> in <file:line> — <message> — fix: <hint>

### High Issues (fix before merge)
1. ...

### Medium Issues (fix soon)
1. ...

### Low Issues (nice to have)
1. ...

### Cross-Script Synthesis
- <e.g. "Element <button class='primary'> fails both 09 (no accessible name)
   and 10 (contrast 3.8:1 < 4.5:1) in dark mode" — single defect, two
   citations, escalated to Critical>

### Deep Stencil Audit (if --deep)
- Section 1 @Component: ...
- Section 2 @Prop: ...
- ... (see `stencil-compliance/SKILL.md`'s Rule index)

### E2E Audit (if --e2e)
- Test file present: yes/no
- Tests passing: X/Y
- ...

### Recommendations
1. ...

### Pipeline timing
- Orchestrator wall-clock: ~Xms (from `meta.totalDurationMs`)
- AI-judgment phase:       ~Ys
- Total report time:       ~Zs
```

**Rules for the matrix**

- Drive every L1 numbered row (01–15) from `findingsByTool[<name>]` — counts come from the per-script `summary` block.
- L2 rows (BX1–BX7, CX, DX) come from the AI session record — ✅ if the MCP call succeeded and the assertion passed; ❌ if assertion failed; ⏭️ if step was attempted and aborted (with reason); ➖ if step was N/A for the archetype.
- Status mapping for L1:
  - `❌` if `summary.errors > 0`
  - `⚠️` if `summary.errors === 0 && summary.warnings > 0`
  - `✅` if `summary.errors === 0 && summary.warnings === 0`
  - `⏭️` if the script was filtered out (`--no-browser`, `--ci`, `--skip`, missing prerequisite like `--figma-dir`)
- AI-only rows (no script equivalent) use `–` for count columns and state the source as `manual review`, `yarn lint`, etc.
- Always emit the matrix even when the orchestrator was unavailable — populate from manual Wave 1–3 results + whatever L2 was attempted.

**Verdict rules** (the verdict line at the top — apply in order, first matching rule wins):

1. **"Block — critical fixes required"** — ANY of: L1 row `❌` (errors), L2 BX row `❌`, L2 CX row `❌`. Reason wins regardless of completeness state.
2. **"Block — incomplete audit"** — L1 clean BUT any BX row is ⏭️ for a non-flag reason (e.g., `mcp-unavailable` without `--fast`/`--ci`/`env.CI`).
3. **"Review — partial"** — L1 clean + all BX ✅/➖ but some CX checks skipped or warning-level.
4. **"Ready to merge"** — L1 clean (no ❌) + all BX ✅/➖ + all applicable CX ✅.

The verdict ALWAYS prioritizes real Layer-1 errors over Layer-2 completeness — an incomplete L2 cannot mask a script-level fail.

Present the report. **Do NOT auto-fix** — wait for the user to choose which issues to address.
