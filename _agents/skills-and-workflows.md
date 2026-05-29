# Skills & Workflows — Invocation Table, Slash Commands, Parallelization

## Scope
Skill invocation rules and available workflows. **Read when starting any component task.**

---

## Skill Invocation Rules

**AGENTS.md is the primary reference.** This file (+ scoped `src/components/AGENTS.md` and `tokens/AGENTS.md`) already contains corrected, project-specific patterns. Use them first.

**Invoke skills on-demand** — only when you encounter an unfamiliar pattern or need deeper guidance:

| Skill Name | When to Invoke | Notes |
| --- | --- | --- |
| `optimize-prompt` | **On explicit user request only** — when user invokes `/optimize-prompt` or asks to structure/improve/optimize a prompt. Do NOT invoke automatically on normal tasks. Compiles raw requests into AGE-aware specs: routes on archetype (atom-visual / atom-interactive / form-associated / molecule / molecule-interactive / organism / layout), applies canonical defaults, runs 12-pattern contradiction detector + reuse scan, validates against codebase snapshot. Modes: `new`, `redesign`, `modify`, `fix`, `tokens`. Replaces the former `/optimize-prompt-new-component` command. | Active skill |
| `token-creation` | Creating new component tokens, unfamiliar token structure or naming | Active skill |
| `systematic-debugging` | **ALWAYS** at `/fix-visual-bug` Step 0 — before touching any code | Active skill |
| `verification-before-completion` | **ALWAYS** before claiming any step complete — must run verification AND read output | Active skill |
| `figma-illustration-import` | Custom multi-layer illustration — check `src/components/mud-illustration-*/` first | Active skill |
| `accessibility-compliance` | **MANDATORY** reference for every `mud-*` component — WCAG 2.1 AA criteria, ARIA, contrast, keyboard, focus, dark mode | Active skill |

**Standard component workflow** (atom/molecule with known patterns): follow AGENTS.md directly — no skill invocation needed.

**Complex/unfamiliar workflow** — read in this order:
1. `AGENTS.md`, `tokens/AGENTS.md` → token + slot architecture
2. `src/components/AGENTS.md`, `src/components/_agents/*.md` → implement the component
3. `src/components/_agents/storybook-stories.md` → stories for all variants/states
4. `_agents/pixel-perfect-qa.md` → pixel-perfect QA against Figma

---

## Slash Commands

**Spec preparation**:

- `/optimize-prompt` — Compile a raw request into an AGE-aware spec for downstream agents. Auto-routes by archetype + mode (`new` | `redesign` | `modify` | `fix` | `tokens`). See [`.claude/skills/optimize-prompt/SKILL.md`](../.claude/skills/optimize-prompt/SKILL.md).

**Creation**:
- `/new-component` — Create component from Figma (`--fast` for auto-proceed)
- `/custom-component` — Create from user requirements (no Figma)

**Modification**:
- `/modify-component` — Add variant, prop, state, refactor
- `/fix-visual-bug` — Diagnose visual bugs, trace root cause
- `/refactor-component` — Align to AGENTS.md patterns

**Audit**:
- `/audit-component` — Component health check
- `/audit-accessibility` — Deep a11y audit
- `/audit-production` — Comprehensive pre-production gate

**Tokens**: `/update-tokens` — Token-only changes

**Quality**:
- `/pre-pr-check` — Lint, test, build, git hygiene
- `/migrate-component` — Graduate from `src/hidden/` to `src/components/`

---

## Parallelization Rules

- **Parallel**: Figma extraction calls (`mcp_get_*`) can run in parallel
- **Parallel**: Reading multiple existing component files
- **Sequential**: Tokens → `yarn tokens.build` → CSS → TSX → Stories (targeted builds per `_agents/environment-commands.md`)
- **Sequential**: Screenshot → compare → fix → re-screenshot (iterative)
