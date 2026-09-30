@AGENTS.md
@_agents/workflow-rules.md

## Claude Code

Everything below applies to Claude Code sessions only; `AGENTS.md` carries the tool-agnostic rules.

**MCP servers** (configured in `.mcp.json` at repo root): Playwright (`mcp__playwright__*`), Chrome DevTools (`mcp__chrome-devtools__*` — perf/network/memory/Lighthouse), Figma (`mcp__figma__*`), Image Compare (`mcp__image-compare__*`), agentation (`mcp__agentation__*`). See `_agents/mcp-tools.md` for full reference.

### Automation — Slash Commands & Subagents

The repo ships ready-to-use slash commands and subagents for routine workflows. See [`.claude/commands/README.md`](.claude/commands/README.md) and [`.claude/agents/README.md`](.claude/agents/README.md) for full quick-references and decision guide.

| Type | Examples | Use when |
|---|---|---|
| **Slash command** ([.claude/commands/](.claude/commands/)) | `/audit-component`, `/audit-accessibility`, `/pre-pr-check`, `/update-tokens`, `/fix-visual-bug`, `/migrate-component`, `/modify-component`, `/optimize-prompt` (mode-routed: new / redesign / modify / fix / tokens) | Linear, single-pass workflows. Argument-driven. Invoke directly in prompt. |
| **Subagent** ([.claude/agents/](.claude/agents/)) | `new-component`, `custom-component`, `redesign-component`, `refactor-component`, `audit-production`, plus the verifier and writer legs — all 11 in `.claude/agents/README.md` | Multi-phase pipelines with separate context window. Invoke via Task tool or auto-trigger. |
| **Skill** ([.claude/skills/](.claude/skills/)) | `stencil-compliance`, `accessibility-compliance`, `audit-component`, `pixel-perfect`, `token-creation`, `figma-illustration-import`, plus `superpowers:systematic-debugging` and `superpowers:verification-before-completion` from the globally-installed [`superpowers`](.claude/skills/LOCAL-SETUP.md) plugin | Reusable knowledge invoked from inside commands/agents via the Skill tool. **`pixel-perfect`** verifies a component against Figma: a per-component state manifest, exact computed-style parity (`15-style-parity`) and screenshot diffs (`11-pixel-diff-states`). **`stencil-compliance`** runs a script-first check of Stencil rules at the pinned version (decorators, lifecycle, host, JSX, styling, form-associated, reactivity, serialization, functional components, public API). **`audit-component`** is `/audit-component`: it runs the script-computed production audit (`yarn audit:component`), and other agents invoke it programmatically. |
