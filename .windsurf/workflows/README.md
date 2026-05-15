# Windsurf Workflows — Reference Guide

This directory contains Windsurf slash-command workflows for the `@age/design-system` Stencil.js component library. Each workflow is a step-by-step AI agent script invoked via `/slash-command` in the Cascade chat panel.

> **Figma-First Rule**: Never start `/new-component` or `/modify-component` without a Figma link. Ask for it first.

---

## Workflow Quick Reference

| Slash Command | Description | When to Use | Complexity |
|---|---|---|---|
| `/new-component` | Create a new Stencil component from a Figma design | You have a Figma link and need a net-new component | High |
| `/custom-component` | Create a new Stencil component from user requirements (no Figma) | Utility/internal components with no design file | Medium |
| `/modify-component` | Add a variant, prop, size, or state to an existing component | Planned enhancement to an existing component | Medium |
| `/fix-visual-bug` | Debug and fix a visual regression by tracing token/CSS root cause | Something looks wrong — color, spacing, size off | Medium |
| `/refactor-component` | Align an existing component to latest AGENTS.md patterns | Code smells, outdated patterns, member order violations | Medium |
| `/audit-component` | Health check a component across 12 categories | Before PR, after major changes, or on-demand review | Low |
| `/audit-accessibility` | Deep WCAG 2.2 audit — keyboard, ARIA, contrast, screen reader | Accessibility review before shipping | Medium |
| `/audit-production` | Full 9-phase production readiness gate | Before graduating a component to production | High |
| `/update-tokens` | Create or modify design tokens without touching component code | Token-only changes — color, spacing, typography | Low |
| `/migrate-component` | Graduate a WIP component from `src/hidden/` to `src/components/` | Component is ready to ship | High |
| `/pre-pr-check` | Full pre-PR validation — lint, test, build, git hygiene | Before opening a pull request | Low |

---

## Use Case Decision Guide

```
What do you need to do?
│
├── Create something new
│   ├── Have a Figma link? ──────────────────── /new-component
│   └── No Figma (utility/internal)? ─────────── /custom-component
│
├── Change an existing component
│   ├── Adding a variant/prop/state? ─────────── /modify-component
│   ├── Something looks visually wrong? ─────── /fix-visual-bug
│   └── Code quality / pattern alignment? ────── /refactor-component
│
├── Review / audit
│   ├── Quick health check? ──────────────────── /audit-component
│   ├── Accessibility deep dive? ─────────────── /audit-accessibility
│   └── Full production gate? ─────────────────── /audit-production
│
├── Token-only work
│   └── Add/modify design tokens? ────────────── /update-tokens
│
├── Ship it
│   ├── WIP → production? ────────────────────── /migrate-component
│   └── Ready to open PR? ────────────────────── /pre-pr-check
```

---

## Workflow Details

### `/new-component`

**File**: `new-component.md`

Creates a production-ready Stencil component from a Figma design link. Runs the full pipeline: Figma extraction → component behavior analysis → token creation → TSX/CSS implementation → Storybook stories → pixel-perfect QA loop.

**Flags**:
- Default — stops at inventory review and per-component summary for approval
- `--fast` — auto-proceeds through checkpoints (single atoms/molecules only)

**Steps**: Environment check → Reuse check → Figma extraction → Component behavior exploration → Stencil docs check → Plan → Tokens → Implement → Stories → Pixel-perfect QA → Verification

---

### `/custom-component`

**File**: `custom-component.md`

Creates a component from user-described requirements when no Figma design exists. Clarifies dimensions, colors, states, and behavior before building.

**Steps**: Environment check → Clarify requirements → Reuse check → Stencil docs check → Plan → Tokens → Implement → Stories → User review → Verification

---

### `/modify-component`

**File**: `modify-component.md`

Adds a new variant, size, state, or prop to an existing component following the strict token-first change order. Runs pixel-perfect QA if the change is visual.

**Change types**: Add variant · Add size · Add state · Add prop · Update tokens · Refactor

**Steps**: Classify change → Environment + Figma extraction → Read files → Read tokens → Make changes (token-first order) → Pixel-perfect QA → Verification

---

### `/fix-visual-bug`

**File**: `fix-visual-bug.md`

Diagnoses and fixes visual bugs by tracing root cause through the token → CSS → TSX stack. Invokes `systematic-debugging` skill before touching any code.

**Problem types**: Visual discrepancy · State bug · Responsive bug · Dark mode bug · Interaction bug

**Steps**: Invoke systematic-debugging → Classify problem → Environment check → Figma reference extraction → Screenshot current state → Identify problem via computed styles → Trace root cause → Fix + targeted rebuild → Verify fix → Verification

---

### `/refactor-component`

**File**: `refactor-component.md`

Runs `/audit-component` first, then applies non-breaking improvements in token-first order. Requires explicit approval for any breaking changes.

**Steps**: Run audit → Capture baseline screenshots → Stencil best practices check → Categorize findings → Human approval gate (if breaking) → Apply changes (token-first) → Verify after each group → Visual regression check → Final verification

---

### `/audit-component`

**File**: `audit-component.md`

Comprehensive 12-step audit covering: file structure, TypeScript strict mode, token health, dark mode, token compliance, CSS architecture, TypeScript/Stencil patterns, accessibility, security, performance, story coverage, test coverage.

**Output**: Structured report with Critical / High / Medium / Low issues. Does NOT auto-fix — presents findings for approval.

---

### `/audit-accessibility`

**File**: `audit-accessibility.md`

Deep WCAG 2.2 AA audit using Playwright browser automation. Tests keyboard navigation, ARIA attributes per state, color contrast ratios, focus indicators, and screen reader announcements.

**Output**: Accessibility audit report with PASS/FAIL per category and prioritized recommendations.

---

### `/audit-production`

**File**: `audit-production.md`

Full 9-phase production readiness gate. Covers: code quality, token/CSS architecture, accessibility, Storybook stories, unit + E2E + visual regression tests, performance, security, documentation, git hygiene.

**When to use**: Before marking a component production-ready, before graduating from `src/hidden/`, or as a final pre-merge gate.

---

### `/update-tokens`

**File**: `update-tokens.md`

Lightweight token-only workflow. Creates or modifies `.tokens.json` files, builds tokens, verifies CSS output, and runs the token reference audit. No Stencil rebuild needed for token-only changes.

**Steps**: Environment check → Identify scope → Figma extraction (if link provided) → Create/update token JSON → Build tokens → Verify CSS output → Token reference audit → Visual check → Dark mode (if applicable)

---

### `/migrate-component`

**File**: `migrate-component.md`

Graduates a WIP component from `src/hidden/` to `src/components/`. Runs a full audit, fixes all Critical/High issues, ensures token file, test coverage, and story coverage meet minimums, then moves the files.

**Steps**: Read hidden component → Gap analysis → Run full audit → Fix Critical/High issues → Ensure token file → Ensure test coverage → Ensure story coverage → Move to production → Update exports → Full verification → Human approval gate

---

### `/pre-pr-check`

**File**: `pre-pr-check.md`

10-step pre-PR validation pipeline. Runs all automated checks and produces a pass/fail report. Does NOT auto-fix — reports violations for manual resolution.

**Checks**: Git status + branch naming → Lint → Tests → Token build → Stencil production build → Storybook production build → Runtime console check → Commit message audit → Changed files review → Final report

---

## LLM Model Reference

### Available Models

| Model | Provider | Strength |
|---|---|---|
| `SWE-1.5` | Windsurf native | Best agentic coding — 13x speed (in Fast Mode), near Claude 4.5 quality |
| `Claude Opus 4.6` | Anthropic | Highest reasoning — complex analysis and architecture |
| `Claude Sonnet 4.6` | Anthropic | Balanced quality/speed — strong coding and review |
| `Claude Haiku 4.5` | Anthropic | Fast and lightweight — simple targeted tasks |
| `GPT-5.1-Codex` | OpenAI | Code generation — baseline GPT-5 coding model |
| `GPT-5.2-Codex (Low Reasoning Fast)` | OpenAI | Fast code generation — low latency, scripted tasks |
| `GPT-5.3-Codex (Medium Reasoning)` | OpenAI | Balanced reasoning + code — moderate complexity |
| `GPT-5.4 Low Thinking` | OpenAI | Fast inference with minimal reasoning overhead |
| `GPT-5.4 Medium Thinking` | OpenAI | Balanced reasoning + code — moderate complexity |
| `Gemini 3.1 Pro` | Google | Strong multi-modal, long context |
| `Gemini 3 Pro` | Google | Solid general coding |
| `Gemini 3 Flash` | Google | Fast and cost-efficient |
| `xAI Grok Code Fast` | xAI | Fast code-focused tasks |
| `Minimax M2.5` | Minimax | General purpose |
| `Kimi K2.5` | Moonshot | Long context, code tasks |

### Recommended Model per Workflow

**Selection logic** (based on SWE-bench Verified benchmarks):
- **Agentic multi-step pipelines** (Figma → code → QA) → `Claude Sonnet 4.6` (79.6% SWE-bench Verified — best coding quality per cost; use `GPT-5.4 Medium Thinking` as alternative, use `SWE-1.5 Fast` as speed alternative)
- **Deep analysis and audits** (reasoning over large codebases) → `Claude Opus 4.6` (~80.8% SWE-bench Verified — highest reasoning)
- **Scripted/mechanical pipelines** (lint, build, token JSON) → `GPT-5.1-Codex` (free, sufficient for mechanical tasks)
- **Speed-first runs** (`--fast` mode, tight iteration loops) → `SWE-1.5 Fast` (950 tok/s, native Windsurf tool integration)

> **Why Sonnet 4.6 over SWE-1.5 as primary?** SWE-bench Verified: Sonnet 4.6 scores 79.6% vs SWE-1.5's ~Claude 4.5-level (~72%). SWE-1.5's advantage is **speed** (13× faster), not benchmark score. Use it when iteration latency matters more than output quality.

| Workflow | Recommended Model | Alternative (speed) | Rationale |
|---|---|---|---|
| `/new-component` | `Claude Sonnet 4.6` | `SWE-1.5` | 79.6% SWE-bench — best quality for complex Figma→code pipeline; SWE-1.5 if using `--fast` mode |
| `/custom-component` | `Claude Sonnet 4.6` | `SWE-1.5` | Strong coding + reasoning for requirement analysis and build |
| `/modify-component` | `GPT-5.2-Codex (Low Reasoning Fast)` | `SWE-1.5` | Targeted, well-scoped change — speed wins over deep reasoning |
| `/fix-visual-bug` | `Claude Sonnet 4.6` | `SWE-1.5` | Root-cause tracing through token → CSS → TSX layers needs reasoning quality |
| `/refactor-component` | `Claude Opus 4.6` | `Claude Sonnet 4.6` | Deep code analysis + pattern alignment — highest reasoning quality matters |
| `/audit-component` | `Claude Sonnet 4.6` | `Gemini 3.1 Pro` | Analytical review across 12 checklist areas — no code generation needed |
| `/audit-accessibility` | `Claude Opus 4.6` | `Claude Sonnet 4.6` | WCAG 2.2 reasoning + ARIA semantics — needs deep semantic understanding |
| `/audit-production` | `Claude Opus 4.6` | `Claude Sonnet 4.6` | 9-phase comprehensive audit — highest reasoning quality needed |
| `/update-tokens` | `GPT-5.1-Codex` | `Gemini 3 Flash` | Mechanical JSON edits + build verification — free model sufficient |
| `/migrate-component` | `Claude Sonnet 4.6` | `SWE-1.5` | Full audit + fix + move pipeline — quality over speed |
| `/optimize-prompt` | `Claude Sonnet 4.6` | `Claude Opus 4.6` | Requirement analysis + structured rewriting — needs strong reasoning to clarify ambiguity |
| `/pre-pr-check` | `GPT-5.1-Codex` | `xAI Grok Code Fast` | Scripted validation pipeline — free model sufficient, fast execution preferred |

---

## Tips & Notes

### Flags

- **`/new-component --fast`** — Auto-proceeds through inventory and summary checkpoints. Still runs the full pixel-perfect QA loop. Best for single atoms/molecules with experienced users.

### Auto-run (`// turbo`)

Workflow steps annotated with `// turbo` are safe to auto-run without user approval (e.g., `yarn lint`, `yarn tokens.build`). Destructive or ambiguous steps always require approval.

### Storybook

All workflows assume Storybook runs on **port 6007**.

### Check Storybook (port 6007)

```bash
# Windows (PowerShell)
netstat -ano | findstr :6007

# macOS / Linux (Unix)
lsof -i :6007
```

- Running → reuse it, do NOT start another
- Not running → `yarn sp.dev.watch`

### Targeted Builds (not full `yarn build`)

During iterative development, use the minimal build per change type:

| Changed | Command | Time |
|---|---|---|
| `.tokens.json` only | `yarn tokens.build` | ~5s |
| `.css` / `.tsx` (watch running) | wait for Stencil watch | ~2–5s |
| `.css` / `.tsx` (no watch) | `yarn dx:stencil:once` | ~20s |
| `.stories.ts` only | nothing (Storybook HMR) | ~1s |
| Final verification / pre-PR | `yarn build` (full) | ~30–60s |

### Dark Mode

Dark mode tokens (`tokens/core.dark/`) are **deferred** until the final project phase. All workflows skip dark mode steps — they are marked with ⏸️ DEFERRED.

### Node & Yarn

- Node >= 22 required
- Yarn 4.x (`yarn` not `npm`)
