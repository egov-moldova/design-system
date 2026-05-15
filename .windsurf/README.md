# Windsurf Configuration — LEGACY / Cross-IDE Reference

> Source of truth for AI automation in this repo is now [`.claude/`](../.claude/) (commands, agents, skills).
> This folder is preserved for users still working in Windsurf Cascade.
> **Do not edit unless you intentionally maintain Windsurf parity.**

## Migration Mapping

| Windsurf | Claude Code | Status |
|---|---|---|
| `.windsurf/workflows/*.md` (slash commands) | [`.claude/commands/`](../.claude/commands/) + [`.claude/agents/`](../.claude/agents/) | Migrated (hybrid: 9 commands + 5 subagents) |
| `.windsurf/skills/*` | [`.claude/skills/`](../.claude/skills/) | Synchronized 1:1 (manual sync, see [`.claude/skills/LOCAL-SETUP.md`](../.claude/skills/LOCAL-SETUP.md)) |
| `.windsurf/rules/ansicolor.md` | [`.claude/skills/terminal-ansi-colors/`](../.claude/skills/terminal-ansi-colors/) | Covered |
| `.windsurf/templates/state-extraction-checklist.md` | Embedded in `new-component` subagent reference | Covered |
| `.windsurf/plans/` | Historical only — frozen | Archive |

## Workflow → Claude Code Equivalent

| Windsurf workflow | Claude Code equivalent |
|---|---|
| `/audit-component` | `/audit-component` (slash) |
| `/audit-accessibility` | `/audit-accessibility` (slash) |
| `/audit-production` | `audit-production` (subagent) |
| `/custom-component` | `custom-component` (subagent) |
| `/fix-visual-bug` | `/fix-visual-bug` (slash) |
| `/migrate-component` | `/migrate-component` (slash) |
| `/modify-component` | `/modify-component` (slash) |
| `/new-component` | `new-component` (subagent) |
| `/optimize-prompt` | `/optimize-prompt` (slash) |
| `/optimize-prompt-new-component` | `/optimize-prompt-new-component` (slash) |
| `/pre-pr-check` | `/pre-pr-check` (slash) |
| `/refactor-component` | `refactor-component` (subagent) |
| `/update-tokens` | `/update-tokens` (slash) |

## MCP Tool Names

Windsurf used numbered prefixes (`mcp10_browser_*`, `mcp7_figma_*`). Claude Code uses named prefixes from `.mcp.json` at repo root:

| Windsurf | Claude Code |
|---|---|
| `browser_*` (mcp10_) | `mcp__playwright__browser_*` |
| `figma_*` (mcp7_) | `mcp__figma__*` |
| `ctx7_*` (mcp4_) | `mcp__context7__*` |
| `compare_*` (mcp9_) | `mcp__image-compare__*` |
| `agent_*` (mcp2_) | `mcp__agentation__*` |

See [`_agents/mcp-tools.md`](../_agents/mcp-tools.md) for full reference.

## Maintenance

If you edit a Windsurf workflow or skill here, also update the corresponding Claude Code artifact in `.claude/`. Drift accumulates if changes are made in only one location.
