# `scripts/audit/__fixtures__/`

Synthetic source files that exercise each anti-pattern rule in
`02-stencil-antipatterns.mjs`. Each rule has its own subfolder containing
**positive** cases (the rule MUST fire) and **negative** cases (the rule MUST
NOT fire).

Layout:

```
__fixtures__/
  <rule-slug>/
    positive/   — files that should produce findings
    negative/   — files that should produce no findings
```

The slug matches the rule's lowercase ANTIPATTERN code minus the prefix
(e.g. `ANTIPATTERN-RENDER-NULL-NO-FALLBACK-ARIA` → `render-null-no-fallback-aria`).

Test runner: [`scripts/audit/__tests__/02-antipatterns.test.mjs`](../__tests__/02-antipatterns.test.mjs).

## Why fixtures exist

Without them, each rule is a one-shot regex that nobody can change safely.
The `EVENT-PREFIX` false-positive we hit on 2026-05 (it fired on `svgCacheKey`
because the rule looks at the line *after* `@Event()` and didn't account for
the field being on the same line) is exactly the kind of regression fixtures
prevent.

## Adding a new rule

1. Add the rule to `PATTERNS` or `FILE_CHECKS` in `02-stencil-antipatterns.mjs`.
2. Create `__fixtures__/<rule-slug>/positive/` with at least one TSX (or other
   appropriate kind) that exhibits the bad pattern.
3. Create `__fixtures__/<rule-slug>/negative/` with at least two files:
   - one that has the **gate-passing context** but FIXES the issue
   - one that lacks the gate context entirely (rule should silently pass)
4. The test runner picks up new fixtures automatically — no test code change.
