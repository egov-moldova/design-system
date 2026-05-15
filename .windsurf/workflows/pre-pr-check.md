---
description: Full pre-PR validation pipeline — lint, test, build, story check, console errors, and git hygiene
---

> **MIGRATED**: This workflow has been ported to [`.claude/commands/pre-pr-check.md`](../../.claude/commands/pre-pr-check.md). New edits should be made there. Kept here for Windsurf users.

# Pre-PR Check

## Step 1: Git Status

Check branch naming and working tree:

```bash
# Windows (PowerShell)
git status
git log --oneline -5

# macOS / Linux (Unix)
git status
git log --oneline -5
```

Verify:

- [ ] Branch follows naming: `type/issue-key-description` (e.g., `feat/cor-456-add-tooltip`)
- [ ] No untracked files that should be committed
- [ ] No generated files staged (`components.d.ts`, `custom-elements.json`)
- [ ] No `dist/`, `node_modules/`, or build artifacts staged

## Step 2: Lint & Format

// turbo

```bash
yarn lint
```

If lint fails → report violations with file, line, and rule name. Do NOT auto-fix without approval.

## Step 3: Test

// turbo

```bash
yarn test
```

Report any failures with: test file → test name → error message.

## Step 4: Token Build

// turbo

```bash
yarn tokens.build
```

Verify no build errors. Check output:

// turbo

```bash
# Windows (PowerShell)
Get-ChildItem dist/design-system/tokens/*.css -ErrorAction SilentlyContinue

# macOS / Linux (Unix)
ls dist/design-system/tokens/*.css
```

## Step 5: Stencil Production Build

**This is the full production build gate** — NOT the dev-time targeted builds from `AGENTS.md` (see build quick reference). This catches issues that dev/watch builds don't (TypeScript strict mode, dist-custom-elements, docs generation).

// turbo

```bash
yarn build
```

Verify no TypeScript or Stencil build errors.

## Step 6: Storybook Production Build

// turbo

```bash
yarn sp.build
```

This is the strictest check — if Storybook prod build succeeds, all stories, components, and tokens are wired correctly.

## Step 7: Runtime Console Check

Start Storybook (if not running) and check for runtime errors:

```bash
# Windows (PowerShell)
netstat -ano | findstr :6007

# macOS / Linux (Unix)
lsof -i :6007
```

- If not running → `yarn sp.dev.watch`

```text
browser_navigate({ url: "http://localhost:6007" })
browser_wait_for({ time: 3 })
browser_console_messages({ level: "error" })
```

Navigate to each modified component's story and verify no runtime errors or warnings.

## Step 8: Commit Message Audit

```bash
# Windows (PowerShell)
git log --oneline -10

# macOS / Linux (Unix)
git log --oneline -10
```

Verify recent commits follow Conventional Commits:

- [ ] Prefix: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- [ ] Scope is descriptive (optional but recommended)
- [ ] Message is meaningful (not "wip", "fix", "update")
- [ ] No typos in commit messages

## Step 9: Changed Files Review

```bash
# Windows (PowerShell)
git diff --stat HEAD~1

# macOS / Linux (Unix)
git diff --stat HEAD~1
```

Verify:

- [ ] No accidental changes to unrelated files
- [ ] No debug `console.log` left in code
- [ ] No commented-out code blocks
- [ ] No `TODO` comments introduced (not allowed in main branch)

## Step 10: Report

Invoke `skill({ SkillName: "verification-before-completion" })` before presenting the final report — must confirm all commands ran AND output was read.

Present pass/fail summary:

```text
## Pre-PR Check Report

| Check              | Status     | Notes          |
| ---                | ---        | ---            |
| Branch naming      | PASS/FAIL  |                |
| Lint               | PASS/FAIL  | X warnings     |
| Tests              | PASS/FAIL  | X pass, Y fail |
| Token build        | PASS/FAIL  |                |
| Stencil build      | PASS/FAIL  |                |
| Storybook build    | PASS/FAIL  |                |
| Console errors     | PASS/FAIL  |                |
| Commit messages    | PASS/FAIL  |                |
| Changed files      | PASS/FAIL  |                |

### Blocking Issues
1. ...

### Warnings (non-blocking)
1. ...
```
