---
description: 12-category audit of a Stencil component (structure, types, tokens, CSS, accessibility, security, performance, stories, tests). Wrapper around the `audit-component` skill. Supports flags `--deep`, `--e2e`, `--fast`.
argument-hint: "@cor-<component-name> [--deep] [--e2e] [--fast]"
---

# /audit-component

Audit the component identified by `$ARGUMENTS` (folder name plus optional flags). This command is a thin wrapper — the actual logic lives in the [`audit-component`](../skills/audit-component/SKILL.md) skill so other agents can invoke the same logic programmatically.

## Usage

```text
/audit-component cor-button
/audit-component cor-checkbox --deep
/audit-component cor-input --e2e
/audit-component cor-accordion --fast
```

## Flags

- `--deep` — also runs the full [`stencil-compliance`](../skills/stencil-compliance/SKILL.md) 14-section pass and invokes `/audit-accessibility` for full WCAG 2.1 AA deep audit. Adds ~30s.
- `--e2e` — includes E2E test audit (`test/cor-<name>.e2e.ts`). Default audits unit tests only (E2E is opt-in until E2E becomes mandatory).
- `--fast` — skips Wave 3 (browser verification, contrast audit, console checks). Used by `pre-pr-check` for sub-30s pre-commit pass. Storybook does NOT need to be running.

## Execution

Invoke the `audit-component` skill with the parsed arguments:

```text
Skill('audit-component', { args: '$ARGUMENTS' })
```

The skill performs a 3-wave audit:

1. **Wave 1 — Discovery** (parallel I/O): reads component files, runs anti-pattern greps, executes `yarn lint` + `yarn tokens.build`
2. **Wave 2 — Static Analysis**: structural, TypeScript, Stencil decorator, lifecycle cleanup, reactivity mutation, token, CSS, story, test coverage
3. **Wave 3 — Browser Verification** (skipped if `--fast`): accessibility snapshot, computed styles light + dark, console errors, contrast audit

## Output

Categorized report:

```text
## Audit Report: cor-<name>
**Flags**: <flags>

### Summary
- Pass: X / Total
- Fail: Y issues

### Critical / High / Medium / Low Issues
1. ...

### Deep Stencil Audit (if --deep)
### E2E Audit (if --e2e)

### Recommendations
### Pipeline timing
```

## Related

- [`audit-component` skill](../skills/audit-component/SKILL.md) — full logic
- [`stencil-compliance` skill](../skills/stencil-compliance/SKILL.md) — rule catalog
- [`accessibility-compliance` skill](../skills/accessibility-compliance/SKILL.md) — WCAG 2.1 AA
- [`/audit-accessibility`](audit-accessibility.md) — deep accessibility audit
- [`audit-production` agent](../agents/audit-production.md) — full production readiness (delegates to this skill for Phase 1)
- [`/pre-pr-check`](pre-pr-check.md) — branch-level validation (uses `--fast` for Wave 1)

**Do NOT auto-fix.** Present findings and wait for user approval on which issues to address.
