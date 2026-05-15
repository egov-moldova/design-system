---
description: Full pre-PR validation pipeline — lint, test, build, story check, console errors, git hygiene
---

# /pre-pr-check

Run the full pre-PR validation pipeline on the current branch. Report pass/fail summary. Do NOT auto-fix.

Invoke the `verification-before-completion` skill before presenting the final report — must confirm all commands ran AND output was read.

## Step 1: Git Status

```bash
git status
git log --oneline -5
```

Verify:

- Branch follows naming: `type/issue-key-description` (e.g., `feat/cor-456-add-tooltip`)
- No untracked files that should be committed
- No generated files staged (`components.d.ts`, `custom-elements.json`)
- No `dist/`, `node_modules/`, or build artifacts staged

## Step 2: Lint & Format

```bash
yarn lint
```

If lint fails → report violations with file, line, and rule name. Do NOT auto-fix without approval.

## Step 3: Test

```bash
yarn test
```

Report any failures with: test file → test name → error message.

## Step 4: Token Build

```bash
yarn tokens.build
```

Verify no build errors. Check output:

```bash
# PowerShell
Get-ChildItem dist/design-system/tokens/*.css -ErrorAction SilentlyContinue

# Unix
ls dist/design-system/tokens/*.css
```

## Step 5: Stencil Production Build

Full production build gate — NOT the dev-time targeted builds. Catches issues that dev/watch builds don't (TypeScript strict mode, dist-custom-elements, docs generation).

```bash
yarn build
```

Verify no TypeScript or Stencil build errors.

## Step 6: Storybook Production Build

```bash
yarn sp.build
```

Strictest check — if this succeeds, all stories, components, and tokens are wired correctly.

## Step 7: Runtime Console Check

Start Storybook if not running:

```bash
# PowerShell
netstat -ano | findstr :6007

# Unix
lsof -i :6007
```

If not running → `yarn sp.dev.watch`.

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007" })
mcp__playwright__browser_wait_for({ time: 3 })
mcp__playwright__browser_console_messages({ level: "error" })
```

Navigate to each modified component's story and verify no runtime errors or warnings.

## Step 8: Commit Message Audit

```bash
git log --oneline -10
```

Verify recent commits follow Conventional Commits:

- Prefix: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Scope is descriptive (optional but recommended)
- Message is meaningful (not "wip", "fix", "update")
- No typos

## Step 9: Changed Files Review

```bash
git diff --stat HEAD~1
```

Verify:

- No accidental changes to unrelated files
- No debug `console.log` left in code
- No commented-out code blocks
- No new `TODO` comments in committed code

## Step 10: Report

Invoke `verification-before-completion` skill, then present:

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
