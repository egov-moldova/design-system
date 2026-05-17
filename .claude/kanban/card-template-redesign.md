# Kanban Card Template — Component Redesign

Copy this markdown into the **Description** field of every Cline Kanban card for a redesign task. Replace placeholders in `<angle brackets>`.

---

## Component: `cor-<name>`

**Figma URL**: `<https://www.figma.com/file/.../?node-id=...>`
**Atomic level**: `<atoms | molecules | organisms>`
**Worktree branch**: `redesign/cor-<name>`
**Storybook port**: auto-allocated by init script (default 6007 + offset)

## Pre-flight (operator confirms before queuing)

- [ ] Figma URL points to the redesigned component in the AGE Design System frame
- [ ] Component currently exists in `src/components/cor-<name>/`
- [ ] Tokens for this component exist in `tokens/core/components/<name>.tokens.json` (or are explicitly TBD)
- [ ] No other Kanban card is in-flight for the same component

## Agent Task (this is what Claude Code executes)

You are running in a Cline Kanban context. Execute the following exactly:

### Step 1: Initialize worktree

Run the OS-appropriate init script from the main repo root:

```powershell
# Windows
.\.claude\kanban\worktree-init.ps1 -ComponentName cor-<name>
```

```bash
# Mac/Linux
./.claude/kanban/worktree-init.sh cor-<name>
```

The script creates a worktree at `../age-design-redesign-cor-<name>`, allocates a Storybook port, starts `yarn sp.dev.watch`, and outputs the worktree path + port.

### Step 2: Switch to worktree

```bash
cd ../age-design-redesign-cor-<name>
```

All subsequent commands run inside the worktree.

### Step 3: Invoke `redesign-component` subagent

Use the `Agent` tool:

```
Agent(
  subagent_type="redesign-component",
  prompt="
    componentName: cor-<name>
    figmaUrl: <figma-url-from-card>
    --worktree-aware
    --write-mode=parallel-write
    STORYBOOK_PORT: <port-from-init-script-output>
  "
)
```

### Step 4: Wait for agent completion

The subagent will:
- Read the existing component
- Extract Figma design (parallel MCP calls)
- Diff tokens, present plan
- **STOP for plan approval** (unless `--fast` was added) — operator reviews via Kanban comments
- Apply Core build (tokens → CSS → TSX) in order
- Dispatch 5 parallel auxiliary subagents (pixel-perfect, a11y, story-writer, test-writer, integration-checker)
- Aggregate findings, apply fixes
- Run final verification (`yarn lint`, `yarn test`, `yarn audit:contrast`, `yarn sp.build`)

### Step 5: Commit + push + open PR

When the agent reports complete:

```bash
git add -A
git commit -m "redesign(cor-<name>): align to AGE Design System"
git push -u origin redesign/cor-<name>
gh pr create --title "redesign(cor-<name>): align to AGE Design System" --body "$(cat .claude/kanban/pr-template.md)"
```

Fill in the PR template placeholders (component name, Figma node, diff %, a11y status, coverage delta) from the agent's final report.

### Step 6: Update Kanban card

Add a comment to this card with:

- PR URL
- Final pixel-perfect diff % (max across states)
- A11y status (0 critical violations)
- Test coverage % delta
- Any deferred items

Move the card to **Review** column.

## Acceptance criteria (operator gate before merge)

- ✅ PR CI passes (`yarn lint`, `yarn test`, `yarn sp.build`, `yarn audit:contrast`)
- ✅ Pixel-perfect: every state < 0.5% diff vs Figma
- ✅ A11y: 0 critical violations (WCAG 2.1 AA), light AND dark mode
- ✅ Tests: coverage > 80% on this component, no regressions on others
- ✅ Storybook a11y panel: 0 violations both modes
- ✅ No console errors in any story

## Failure paths

| Symptom | Action |
|---|---|
| Plan approval needed (default mode) | Operator reviews plan in card comments, replies "approved" or with required adjustments |
| Subagent reports `environment-not-ready` | Re-run `worktree-init` script; verify Storybook on allocated port |
| Subagent reports `figma-unavailable` | Re-authenticate Figma MCP; retry |
| Pixel-perfect diff > 2% on multiple states | Likely Figma reference mismatch — verify node ID; if confirmed correct, investigate token diff |
| Tests fail after subagent dispatch | Real component bug — agent will report, do NOT auto-fix tests, fix component |
| Conflict between subagents (e.g., story-writer + test-writer race) | Re-run with `--write-mode=read-only` |
