# Cline Kanban + Claude Code Integration

This folder contains the **infrastructure for running multiple component redesigns in parallel** via Cline Kanban + Claude Code CLI + git worktrees.

## Why this exists

The AGE Design System redesign covers 62 components. Sequential work (1 component at a time, 1 Claude Code session) takes weeks. Parallel work (3–5 components simultaneously, 1 Claude Code session per Kanban card, each in its own git worktree) reduces wall-clock time to days.

Reference: Cline Kanban docs at https://docs.cline.bot/usage/kanban.

## Architecture

```
main repo (this folder is here)
   │
   ├── git worktree: ../age-design-redesign-mud-button   (branch redesign/mud-button)
   ├── git worktree: ../age-design-redesign-mud-input    (branch redesign/mud-input)
   ├── git worktree: ../age-design-redesign-mud-badge    (branch redesign/mud-badge)
   └── git worktree: ../age-design-redesign-mud-chip     (branch redesign/mud-chip)
        │
        each worktree runs:
        - Its own Storybook on port 6007 + N (auto-allocated by worktree-init script)
        - Its own Claude Code session driven by Cline Kanban card
        - Its own redesign-component subagent dispatch
```

Each worktree is **isolated**: separate file system, separate branch, separate Storybook port, separate Claude Code context. Merges happen via individual PRs back to `main`.

## Workflow (per component)

1. **Operator creates a Kanban card** with the component name + Figma URL using [`card-template-redesign.md`](./card-template-redesign.md).
2. **Cline Kanban dispatches the card** to Claude Code, which:
   - Runs the worktree init script ([`worktree-init.ps1`](./worktree-init.ps1) on Windows, [`worktree-init.sh`](./worktree-init.sh) on Mac/Linux)
   - Enters the new worktree
   - Starts Storybook on the allocated port
   - Invokes the `redesign-component` subagent with `--worktree-aware --write-mode=parallel-write`
3. **The redesign-component agent** executes its 9-step pipeline (see `.claude/agents/redesign-component.md`), dispatching 5 parallel subagents during Step 6.
4. **On completion**, the agent commits + opens a PR using [`pr-template.md`](./pr-template.md).
5. **Operator merges** the PR after CI + manual review.
6. **The Kanban card auto-closes** when the PR merges.
7. **The worktree is cleaned up** (optional — see "Cleanup" below).

## Parallel capacity

The recommended target is **3–5 components in flight simultaneously**. Limits:

- **Disk**: each worktree is a full repo copy. With `nodeLinker: node-modules`, that's ~3–5 GB per worktree.
- **CPU**: Storybook dev watch + Stencil watch + Jest run together can max out 4 cores. Plan accordingly.
- **MCP Figma rate limits**: 5 agents extracting Figma simultaneously may hit rate limits — fall back to serial Figma extraction if needed.
- **Port allocation**: Storybook needs ports 6007, 6008, 6009, etc. The worktree-init script allocates the next free port.

## Files

| File | Purpose |
|---|---|
| [`README.md`](./README.md) | This document |
| [`card-template-redesign.md`](./card-template-redesign.md) | Cline Kanban card markdown template (paste into each card) |
| [`pr-template.md`](./pr-template.md) | PR description template (used by `redesign-component` agent at completion) |
| [`worktree-init.ps1`](./worktree-init.ps1) | Windows PowerShell worktree initialization script |
| [`worktree-init.sh`](./worktree-init.sh) | Mac/Linux Bash worktree initialization script |

## Cleanup

After a PR merges, the worktree is no longer needed. Remove it:

```bash
# From the main repo root
git worktree remove ../age-design-redesign-mud-<name>
git branch -d redesign/mud-<name>
```

Or use the included cleanup helper (if present): `scripts/cleanup-redesign-worktree.ps1 <name>`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `git worktree add` fails: "already exists" | Previous worktree wasn't cleaned up | `git worktree prune`, then retry |
| Storybook fails to start on allocated port | Port in use by another process | The init script tries port 6007+1, 6007+2, ... up to 6015; if all in use, free a port |
| MCP figma fails: "rate limited" | Too many parallel Figma extractions | Reduce parallel cards to 2–3 or stagger card starts |
| `yarn install` slow in fresh worktree | Yarn cache miss in new working copy | The init script reuses the parent's `.yarn/cache` via symlink |
| Multiple Claude Code sessions confused about cwd | Sessions accidentally cross-talked | Each session must `cd` into its own worktree at startup |
