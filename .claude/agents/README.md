# Claude Code Subagents — `@egov-moldova/mud`

Subagents for complex, multi-phase workflows with separate context windows. Invoke via the `Task` tool with `subagent_type: <agent-name>`, or trust auto-trigger based on description matching.

For simple linear workflows, use [`.claude/commands/`](../commands/README.md) instead.

---

## Available Subagents

All 11 agents under `.claude/agents/*.md`, grouped by whether they write files (`tools:` carries `Write`/`Edit`) or are read-only. `Model` and `Can write` are read from each agent's own frontmatter — never assume, re-check `tools:`/`model:` when an agent file changes.

### Orchestrators / writers

| Subagent | Purpose | When to Use | Model | Can write |
|---|---|---|---|---|
| `new-component` | Create a production-ready Stencil component from a Figma design, running the full pixel-perfect pipeline (Figma extraction → tokens → TSX/CSS → stories → QA loop) | You have a Figma link and need a net-new component | opus | Yes |
| `custom-component` | Create a Stencil component from user-described requirements (no Figma) | Utility/internal components with no design file | sonnet | Yes |
| `redesign-component` | Redesign an existing `mud-*` component to align with the new MUD Design System per a Figma reference; diffs current tokens against Figma's new tokens, applies changes token-first | Component-level redesign against an updated Figma reference | opus | Yes |
| `refactor-component` | Align an existing component to latest `AGENTS.md` patterns; audits first, captures baseline screenshots, applies changes with regression checks | Code smells, outdated patterns, breaking changes needed | opus | Yes |
| `story-writer` | Generate `*.stories.ts` (CSF3, `@storybook/web-components-vite`) from `@Prop()` declarations and Figma metadata | As part of `parallel-aux-tasks`, after Core build | sonnet | Yes |
| `test-writer` | Generate `*.spec.tsx` unit tests via `@stencil/vitest` `render()` — rendering, props, slots, events, states, ARIA | As part of `parallel-aux-tasks`, after Core build | sonnet | Yes |

### Read-only verifiers

| Subagent | Purpose | When to Use | Model | Can write |
|---|---|---|---|---|
| `audit-production` | Full 11-phase production readiness gate (code quality, tokens, a11y, performance, security, tests, stories, docs, git hygiene, Stencil compliance, final report); returns a categorized report, never auto-fixes | Before graduating to production or final pre-merge | opus | No |
| `a11y-verifier` | WCAG 2.1 AA accessibility verification — keyboard nav, ARIA, contrast (light + dark), focus indicators, screen-reader compatibility | As part of `parallel-aux-tasks`, after Core build | sonnet | No |
| `integration-checker` | Greps usage sites, verifies exports in `src/index.ts`, confirms types exposed via `.types.ts`, flags callsites needing updates | As part of `parallel-aux-tasks`, after Core build | sonnet | No |
| `pixel-perfect-verifier` | Computed-style parity and Pixelmatch screenshot diffs against the Figma state manifest, every state, each finding citing a Figma node | As part of `parallel-aux-tasks`, after Core build | sonnet | No |
| `token-validator` | Validates the 3-tier token hierarchy (palette → semantic → component) via `yarn tokens.lint`, `yarn lint.colors`, `scripts/tokens-validate.mjs`; proposes file:line fixes | When reviewing token changes or debugging a token-lint failure | sonnet | No |

> **Note:** Prompt structuring was previously listed here as `optimize-prompt-new-component`. It is **not** a subagent — it has been converged into the slash command [`/optimize-prompt`](../commands/README.md). Use the slash command before invoking `new-component`, `redesign-component`, or `refactor-component` on a vague request.

---

## Invocation Patterns

### Via Task tool (explicit)

```text
Task({
  subagent_type: "new-component",
  prompt: "Build mud-divider from Figma https://figma.com/file/.../?node-id=1234:5678. Single atom, --fast mode."
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
- **Skills invoked**: `token-creation`, `figma-illustration-import`, plus `superpowers:systematic-debugging` and `superpowers:verification-before-completion` from the globally-installed `superpowers` plugin (see [`.claude/skills/LOCAL-SETUP.md`](../skills/LOCAL-SETUP.md))
- **MCP tool names**: `mcp__playwright__browser_*`, `mcp__figma__*`, `mcp__image-compare__*`. See [`_agents/mcp-tools.md`](../../_agents/mcp-tools.md)

## See Also

- [`.claude/commands/README.md`](../commands/README.md) — slash commands for linear workflows
- [`.claude/skills/`](../skills/) — reusable knowledge skills
- [`AGENTS.md`](../../AGENTS.md) — root automation index
