# Claude Code Slash Commands — `@egov-moldova/mud`

Slash commands for linear, single-pass workflows. Invoke with `/command-name [arguments]` in the Claude Code prompt.

For complex multi-phase workflows (Figma → code → QA pipelines, full production audits, refactors), use the subagents in [`.claude/agents/`](../agents/README.md) instead.

> **Figma-First Rule**: see `AGENTS.md` rule 1 / `_agents/workflow-rules.md`. Never start the `new-component` agent or `/modify-component` without a Figma link.

---

## Quick Reference

| Slash Command | Description | When to Use | Complexity |
|---|---|---|---|
| `/audit-component` | Deterministic production-readiness audit for a component. Runs `yarn audit:component <name> --depth <d>` (`scripts/audit/verdict.mjs`), which computes `state` (`INCOMPLETE`/`FAIL`/`NEEDS-DECISION`/`PASS`) and, on `PASS`, `level` (`CLEAN-STATIC`/`MERGE-READY`/`PRODUCTION-READY`) — never the model. Flags: `--depth quick\|standard\|deep` (default `standard`); `--fast` (deprecated alias of `--depth quick`), `--e2e` (deprecated alias, folds into `--depth deep`), `--no-figma`, `--no-browser`/`--ci`. | Before PR, after major changes, or on-demand review | Low |
| `/audit-accessibility` | Deep WCAG 2.2 AA audit — keyboard, ARIA, contrast, screen reader | Accessibility review before shipping | Medium |
| `/update-tokens` | Create or modify design tokens without touching component code | Token-only changes — color, spacing, typography | Low |
| `/fix-visual-bug` | Diagnose & fix visual bugs via token → CSS → TSX root cause tracing | Something looks wrong — color, spacing, size off | Medium |
| `/migrate-component` | Graduate a WIP component from `src/hidden/` to `src/components/` | Component is ready to ship | Medium |
| `/modify-component` | Add a variant, prop, size, or state to an existing component | Planned enhancement to existing component | Medium |
| `/pre-pr-check` | Full pre-PR validation — lint, test, build, console, git hygiene | Before opening a pull request | Low |
| `/optimize-prompt` | Compile a raw request into an AGE-aware spec. Auto-routes by archetype + mode (`new` / `redesign` / `modify` / `fix` / `tokens`). Replaces former `/optimize-prompt-new-component`. | Before the `new-component` agent, the `redesign-component` agent, `/modify-component`, `/fix-visual-bug`, or `/update-tokens` on a vague request | Medium |

For broader pipelines (new components from Figma, full production gate, refactoring loops) → see [`.claude/agents/`](../agents/README.md).

---

## Use Case Decision Guide

```
What do you need to do?
│
├── Create something new
│   ├── Have a Figma link?           ──→ agent: new-component
│   └── No Figma (utility/internal)? ──→ agent: custom-component
│
├── Change an existing component
│   ├── Adding a variant/prop/state? ──→ /modify-component
│   ├── Something looks visually wrong? ──→ /fix-visual-bug
│   └── Code quality / pattern alignment? ──→ agent: refactor-component
│
├── Review / audit
│   ├── Quick health check?          ──→ /audit-component
│   ├── Accessibility deep dive?     ──→ /audit-accessibility
│   └── Full production gate?        ──→ agent: audit-production
│
├── Token-only work                  ──→ /update-tokens
│
├── Optimize a request before building ──→ /optimize-prompt
│
└── Ship it
    ├── WIP → production?            ──→ /migrate-component
    └── Ready to open PR?            ──→ /pre-pr-check
```

---

## Invocation Patterns

- **Component argument**: pass `@mud-button` (or component folder name) as `$ARGUMENTS`. Example: `/audit-component @mud-button`.
- **No argument**: workflows like `/pre-pr-check` operate on the current branch state.
- **Free-text**: `/fix-visual-bug @mud-input red border showing on focus instead of blue` or `/optimize-prompt build a tabs component with three variants`.

## Conventions Shared Across Commands

- **Storybook port**: 6007 (never 6006).
- **Token-first change order**: tokens JSON → `yarn tokens.build` → CSS → TSX → stories.
- **Targeted builds during iteration**: `yarn tokens.build` (~5s) for token-only; Stencil watch (~2–5s) for `.tsx/.css`; Storybook HMR for `.stories.ts`. Use `yarn build` only for final verification.
- **MCP tool names**: `mcp__playwright__browser_*`, `mcp__figma__*`, `mcp__image-compare__*`. See [`_agents/mcp-tools.md`](../../_agents/mcp-tools.md).
- **No auto-fix**: audit commands report findings; they do not modify code without explicit approval.
- **Verdict / exit-code contract**: `yarn audit:component <name> --depth <d>` (`scripts/audit/verdict.mjs`) is the only writer of `audit/<name>/verdict.json` and `audit/<name>/fix-brief.md`, rewritten every run. Exit 0 only on `state: PASS`; a distinct non-zero code per other state (`scripts/audit/lib/exit-codes.mjs`: 1 `FAIL`, 3 `INCOMPLETE`, 4 `NEEDS-DECISION`, 2 usage/internal error). Any command or agent that gates on the audit STOPS on a non-zero exit status rather than re-reading findings by hand.

## See Also

- [`.claude/agents/README.md`](../agents/README.md) — multi-phase subagents
- [`.claude/skills/`](../skills/) — reusable knowledge skills
- [`AGENTS.md`](../../AGENTS.md) — root automation index
