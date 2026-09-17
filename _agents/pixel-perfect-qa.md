# Pixel-Perfect QA

## Scope

Figma vs Storybook verification. **Every component MUST pass this before completion.**

The procedure lives in the `pixel-perfect` skill — [`.claude/skills/pixel-perfect/SKILL.md`](../.claude/skills/pixel-perfect/SKILL.md) — which Claude Code loads on demand. This file keeps the project rules the skill applies; it does not repeat the steps.

## The loop

1. Preflight — Storybook on 6007, `npx playwright install chromium-headless-shell` once, `FIGMA_TOKEN` for references, the official Figma MCP for design extraction
2. Extract every variant and state from the Figma component set
3. Write the Figma state manifest — `src/components/<name>/test/<name>.figma.json` — then `node scripts/audit/figma-refs.mjs <name> --check` (uncovered variants, gone nodes, stale references)
4. Export references — `node scripts/audit/figma-refs.mjs <name>`
5. Exact style parity — `node scripts/audit/15-style-parity.mjs <name> --json`
6. Screenshot diff — `node scripts/audit/11-pixel-diff-states.mjs <name> --json`
7. Fix token → CSS → TSX, re-run 5–6 (targeted rebuilds: `yarn tokens.build` ~5s, Stencil watch ~2–5s, story HMR ~1s)
8. Report per the skill template

`pixel-perfect-verifier` runs steps 1–6 read-only for orchestrators.

## Tolerances

**Zero tolerance** — computed values, checked by `15-style-parity`: colours, border radius, spacing, dimensions, borders, shadows, opacity, typography (font size, weight, family, `lineHeight`).

**Rendering tolerance** — glyph pixels only, judged on the diff image: kerning ±2px, glyph baseline ±1px, anti-aliasing ±0.5px. A computed `lineHeight` that differs from Figma is a zero-tolerance mismatch, not rendering.

**Pixel diff** thresholds: `DEFAULT_PASS` / `DEFAULT_WARN` in `scripts/audit/lib/image-diff.mjs` (PASS below the first, WARNING below the second — inspect the diff image — FAIL at or above it). Masked pixels are left out of the percentage.

Never round a Figma value and never hardcode one in CSS — trace it to a token (`AGENTS.md` rules 2 and 5).

## States to cover

The manifest needs one state per Figma state the component has:

| State | How the manifest triggers it |
| --- | --- |
| Default | fixture (`html`) |
| Hover | `interaction: { "type": "hover" }` |
| Focus | `interaction: { "type": "focus" }` — keyboard focus, matches `:focus-visible` |
| Active / pressed | `interaction: { "type": "press" }` |
| Open view (menu, month picker) | `interaction: [{ "type": "click" }, …]` |
| Disabled / invalid / selected | fixture attributes |
| Dark theme | `"theme": "dark"` with a reference exported from the dark Figma frame |
| Breakpoints | fixture width or `viewport` |
| Elements the design does not have | `expect: [{ "target": "…", "absent": true }]` |
| Mock data (dates, avatars) | `mask: [selector]` — reported (`PIXEL-MASKED`), not hidden |
| Variant deliberately not covered | `figma.skip: [{ "node": "…", "reason": "…" }]` |

## Responsive (molecules and organisms)

Add manifest states at the Figma breakpoints (mobile 375, tablet 768, desktop 1440 unless the design says otherwise). Verify: no horizontal scroll, no overflow, proper stacking, text ≥ 14px on mobile.

## Accessibility alongside fidelity

Colour contrast ≥ 4.5:1 for text, visible focus indicators, touch targets ≥ 44×44px — see `accessibility-compliance`. When a Figma value fails WCAG 2.1 AA, report it as a design question rather than shipping either silently.
