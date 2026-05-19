# Claude Code Subagents — `@age/design-system`

Subagents for complex, multi-phase workflows with separate context windows. Invoke via the `Task` tool with `subagent_type: <agent-name>`, or trust auto-trigger based on description matching.

For simple linear workflows, use [`.claude/commands/`](../commands/README.md) instead.

---

## Available Subagents

| Subagent | Purpose | When to Use | Complexity |
|---|---|---|---|
| `new-component` | Create a production-ready Stencil component from a Figma design | You have a Figma link and need a net-new component | High |
| `custom-component` | Create a Stencil component from user requirements (no Figma) | Utility/internal components with no design file | Medium |
| `audit-production` | Full 9-phase production readiness gate | Before graduating to production or final pre-merge | High |
| `refactor-component` | Align an existing component to latest patterns; visual regression loop | Code smells, outdated patterns, breaking changes needed | High |

> **Note:** Prompt structuring was previously listed here as `optimize-prompt-new-component`. It is **not** a subagent — it has been converged into the slash command [`/optimize-prompt`](../commands/README.md). Use the slash command before invoking `new-component`, `redesign-component`, or `refactor-component` on a vague request.

---

## Invocation Patterns

### Via Task tool (explicit)

```text
Task({
  subagent_type: "new-component",
  prompt: "Build cor-divider from Figma https://figma.com/file/.../?node-id=1234:5678. Single atom, --fast mode."
})
```

### Via auto-trigger

Subagent `description` fields are matched against your request. If you say "create a tabs component from this Figma link", Claude Code can auto-invoke `new-component`.

### Checkpoints

Most subagents include human-approval gates between phases. The subagent will return control to the main agent (you) to ask for confirmation before destructive or visually significant changes. Respond with explicit approval or redirection.

---

## Shared Conventions

- **Storybook port**: 6007 (never 6006)
- **Token-first change order**: tokens JSON → `yarn tokens.build` → CSS → TSX → stories
- **Pixel-perfect QA**: screenshot via `mcp__playwright__browser_take_screenshot`, diff via `mcp__image-compare__compare_images` (threshold: < 0.5% PASS, 0.5–2% WARNING, > 2% FAIL)
- **Skills invoked**: `systematic-debugging`, `token-creation`, `verification-before-completion`, `figma-illustration-import`
- **MCP tool names**: `mcp__playwright__browser_*`, `mcp__figma__*`, `mcp__context7__*`, `mcp__image-compare__*`. See [`_agents/mcp-tools.md`](../../_agents/mcp-tools.md)

## See Also

- [`.claude/commands/README.md`](../commands/README.md) — slash commands for linear workflows
- [`.claude/skills/`](../skills/) — reusable knowledge skills
- [`AGENTS.md`](../../AGENTS.md) — root automation index
