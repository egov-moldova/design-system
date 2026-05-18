# CLEANUP.md — when the audit-suite transition is fully validated

This file lists every artifact that becomes a **deletion candidate** after the
audit-suite transition (Sprints 1–6) has been validated in production for the
recommended period. **Do not delete anything until the validation checklist at
the bottom is fully green.**

Each row below has:

- **Path** — what to remove
- **Why it can go** — what replaced it
- **Risk** — what breaks if we get this wrong
- **Validation gate** — what must be true before deletion
- **Recovery** — how to restore from git if needed

## 0. Validation period (recommended minimum)

Before deleting ANYTHING in this document:

1. **2 calendar weeks** of clean CI runs on `validate` job after `regression-check.mjs` is flipped from `continue-on-error: true` to `false` in `.github/workflows/ci.yml`. (Currently non-blocking — see `audit-artifacts` upload step.)
2. **At least 5 PR cycles** where AI invoked one of the 6 slimmed workflows
   (`audit-component`, `audit-production`, `pre-pr-check`, `a11y-verifier`,
   `pixel-perfect-verifier`, `integration-checker`) AND the resulting report
   matched human reviewer expectations (no missed findings, no AI confusion
   about how to consume the JSON).
3. **`reports/regression-baseline.json` re-captured at least once** after a
   real component change AND `regression-check` still passes — proves the
   baseline is stable, not artificially clean from a frozen tree.

Track those criteria in the project's PR template or release notes. Tick them
off as they pass.

---

## 1. Legacy fallback sections inside slimmed AI prompts

| Path | Section name | Why it can go | Risk | Validation gate | Recovery |
|------|---|---|---|---|---|
| [`.claude/agents/integration-checker.md`](../../.claude/agents/integration-checker.md) | `When to escalate to manual greps` | All three escalation triggers now have script equivalents (07 with custom globs, 14 for API surface) | AI runs into a real edge case the scripts miss and has no fallback documented | (1) + (2); also do one redesign PR with `apiChanges` provided and confirm `07` + `14` together produced what AI needed | `git show <sha>:.claude/agents/integration-checker.md` to restore |
| [`.claude/agents/pixel-perfect-verifier.md`](../../.claude/agents/pixel-perfect-verifier.md) | `When to escalate to MCP-driven steps` | Once Playwright is installed via `yarn add -D playwright`, the install-hint branch never fires; once teams adopt `--figma-dir` for ALL components, the dynamic-fetch branch never fires either | A team that hasn't installed Playwright loses the MCP fallback | (1) + (2); also confirm `package.json` includes `playwright` in `devDependencies` AND CI installs it | `git show` |
| [`.claude/agents/a11y-verifier.md`](../../.claude/agents/a11y-verifier.md) | `When to escalate to manual MCP-driven steps` | Same reasoning as pixel-perfect; once Playwright is universal the install-hint branch never fires | Composite-widget keyboard sequences (Tab/Arrow/Escape) still need MCP because script captures static tree; this section MUST stay until 09 grows interaction-driving | KEEP for now — script doesn't fully replace interactive keyboard testing | n/a |
| [`.claude/commands/pre-pr-check.md`](../../.claude/commands/pre-pr-check.md) | `Wave 5a` MCP fallback block | `12-console-errors.mjs` handles the standard navigate + capture flow | A team without Playwright loses the fallback | (1) + (2); also confirm CI runs `12-console-errors` against `--changed` | `git show` |
| [`.claude/agents/audit-production.md`](../../.claude/agents/audit-production.md) | Phase 3.3 MCP `getComputedStyle` snippet at the bottom | `10-contrast-pairs.mjs` is the canonical way; the MCP one-liner becomes a curiosity | A reviewer wants a one-off check on a specific selector | KEEP — useful as a 3-line reference for debugging single elements | n/a |
| [`.claude/skills/audit-component/SKILL.md`](../../.claude/skills/audit-component/SKILL.md) | Wave 1 Bash port-probe section + Wave 3 manual MCP loop | Both replaced by `12-console-errors` / `09-a11y-tree` plus orchestrator's automatic Storybook port check via `lib/storybook-helpers.mjs` | Storybook starts on a non-6007 port (Cline Kanban worktree scenario) and the auto-probe misses; manual fallback gives an out | KEEP the port-probe; consider deleting only the manual MCP loop | n/a |

**Pattern**: keep any fallback that addresses a real, persistent edge case
(custom Storybook port, single-selector contrast debug, interactive keyboard
testing). Delete fallbacks that only existed because the scripts didn't.

---

## 2. Whole files candidate for deletion

| Path | Why it can go | Risk | Validation gate | Recovery |
|------|---|---|---|---|
| `reports/prompt-cost-sprint4.json` (baseline) | Snapshot used to measure Sprint 5/6 deltas; once the new state is the baseline we don't need the historical anchor | Lose the ability to claim "we went from X to Y tokens" historically | After (1) + (2), commit the new `reports/prompt-cost-sprint6.json` as the rolling baseline; archive the sprint4 file in git history but keep it out of `reports/` | `git show <sha>:reports/prompt-cost-sprint4.json` |
| `reports/prompt-cost-after-slim.md` (Sprint 5 intermediate) | Already obsolete by Sprint 6 | None | Delete after Sprint 6 lands | `git show` |
| `reports/prompt-cost-sprint5.json` (Sprint 5 intermediate) | Same | None | Same | `git show` |
| `.audit-screenshots/**` (generated by `11-pixel-diff-states`) | Per-run output, never committed | None — it's already `.gitignore`-friendly | Add `.audit-screenshots/` to `.gitignore` if not already | n/a |

**Action**: add `.audit-screenshots/` and `reports/audit-all.json` + `reports/regression-check.json` to `.gitignore` if they aren't there (CI uploads them as artifacts; don't track them).

---

## 3. Documentation that may need updates (not deletion)

| Path | What to revisit | When |
|------|---|---|
| [`AGENTS.md`](../../AGENTS.md) (root) | Add a short "Audit suite" pointer under `Automation — Slash Commands & Subagents` (currently only mentions slash commands / subagents / skills, not the `scripts/audit/` orchestrator) | When (1) gate passes |
| [`src/components/AGENTS.md`](../../src/components/AGENTS.md) | If it references the legacy grep gates anywhere, update to point at `node scripts/audit/02-stencil-antipatterns.mjs` | When (1) gate passes |
| [`.claude/commands/README.md`](../../.claude/commands/README.md) | Document that `/pre-pr-check` now delegates to `scripts/audit/run-all.mjs` under the hood | When (1) gate passes |
| [`.claude/agents/README.md`](../../.claude/agents/README.md) | Same for `integration-checker`, `a11y-verifier`, `pixel-perfect-verifier`, `audit-production` | When (1) gate passes |
| [`.claude/plans/claude-code-automation-improvements-implementation-plan,prompt.md`](../../.claude/plans/claude-code-automation-improvements-implementation-plan,prompt.md) | Marked as completed (still useful as historical context — DO NOT delete) | n/a |

---

## 4. CI / hook adjustments

| Where | Change | When |
|-------|--------|------|
| `.github/workflows/ci.yml` → `Audit all components (no browser)` step | Remove `continue-on-error: true` → make hard gate | After (1) passes for 2 weeks |
| `.github/workflows/ci.yml` → `Regression check vs baseline` step | Remove `continue-on-error: true` | After (3) passes once |
| `.github/workflows/ci.yml` → `Measure prompt cost` step | Add a delta-gate: fail if prompt-cost JSON shows `>5% growth` from previously committed `reports/prompt-cost-sprint6.json` — protects against future re-bloat | Optional, after one sprint of clean runs |
| `.husky/pre-commit` | Optionally add `node scripts/audit/02-stencil-antipatterns.mjs --changed --json` before lint — fail fast on obvious anti-patterns before tests | Optional |

---

## 5. Scripts that could be retired (long-term)

| Path | What replaces it | Risk |
|------|---|---|
| (none today) | — | All scripts created in Sprints 1–6 are still in active use by `run-all.mjs`. None are deprecated. |

This row exists to remind future maintainers: if Stencil eventually replaces
its grep-based anti-pattern enforcement with a proper linter, that's the time
to retire `02-stencil-antipatterns.mjs`. Until then, keep everything.

---

## 6. Cleanup commands (paste-ready, only after gate passes)

> Do NOT run these blindly. Run each line, verify behavior, then move to the next.

```bash
# 6a. Remove sprint-intermediate snapshots after committing Sprint 6 as baseline
git mv reports/prompt-cost-sprint6.json reports/prompt-cost-baseline.json
git rm reports/prompt-cost-sprint4.json
git rm reports/prompt-cost-after-slim.md
git rm -f reports/prompt-cost-sprint5.json 2>/dev/null || true

# 6b. Add per-run reports + screenshots to gitignore
cat >> .gitignore <<'EOF'

# Audit suite outputs (CI uploads as artifacts; not tracked)
reports/audit-all.json
reports/regression-check.json
.audit-screenshots/
EOF

# 6c. Delete fallback sections (use git diff to review before commit)
# Open each file in your editor and delete the section indicated in table 1 above.
# Do NOT use sed/awk — section boundaries vary; manual review is mandatory.

# 6d. Hard-gate the CI steps
# Edit .github/workflows/ci.yml:
#   - Remove `continue-on-error: true` from `Audit all components (no browser)`
#   - Remove `continue-on-error: true` from `Regression check vs baseline`

# 6e. Re-capture regression baseline (post-cleanup)
node scripts/audit/regression-baseline.mjs
git add reports/regression-baseline.json
git commit -m "chore(audit): re-baseline regression after fallback cleanup"

# 6f. Final verification
yarn test:scripts
node scripts/audit/run-all.mjs --all --no-browser
node scripts/audit/regression-check.mjs
```

---

## 7. What we DELIBERATELY keep

These artifacts could be tempting to remove but **must stay**:

- All scripts under `scripts/audit/` — actively used by `run-all.mjs`.
- All scripts under `scripts/scaffold/` — invoked manually by devs; rare but
  high-value when needed.
- `scripts/visual-diff.mjs` — single source of truth for Pixelmatch invocation;
  `11-pixel-diff-states.mjs` delegates to it.
- `.claude/skills/accessibility-compliance/references/*` — judgment-heavy WCAG
  reference docs that AI consults during a11y-verifier. Per the locked-in plan
  decisions, these are out of scope for slim-down.
- `.claude/skills/stencil-compliance/references/*` — same reasoning for Stencil
  rules. Anti-patterns enforced mechanically by `02`; the references explain
  the *why* AI uses when judging cases the script doesn't classify.
- `.claude/plans/*.prompt.md` — historical decisions; future maintainers need
  to understand WHY things look the way they do.
- `_agents/*.md` (root and scoped) — lazy-loaded subfiles in the AGENTS.md
  index pattern; deleting any would orphan an `AGENTS.md` cross-reference.

---

## 8. Stop-the-line conditions

If any of these happens during the validation period, **abort cleanup and
restore from git**:

- `regression-check` reports a critical finding REMOVED (`E ... /n removed`
  where n > 0). Means a script silently stopped catching something AI used to
  find. Investigate the script — do NOT delete the AI fallback.
- An AI agent invocation reports "I could not find anti-pattern X in the
  output" where X was previously reliably caught. The JSON envelope changed
  shape or `02-stencil-antipatterns.mjs` regressed.
- CI's `audit-all` job runs >5× slower than baseline (suggests browser scripts
  are hanging — Playwright integration may need attention).
- Two consecutive PRs need manual fallback to legacy MCP path because the Fast
  Path failed mysteriously. Investigate before deleting the fallback.

---

## 9. Final cleanup summary (what the repo looks like after gate passes)

```
scripts/audit/
├── lib/                              (unchanged — 8 modules)
├── 01-14 + run-all.mjs               (unchanged — 14 scripts + orchestrator)
├── measure-prompt-cost.mjs           (unchanged)
├── regression-baseline.mjs           (unchanged)
├── regression-check.mjs              (unchanged)
├── README.md                         (unchanged)
└── CLEANUP.md                        (this file — keep as reference)

reports/
├── prompt-cost-baseline.json         (renamed from sprint6; the rolling baseline)
├── regression-baseline.json          (re-captured after cleanup)
└── (everything else is .gitignored)

.claude/
├── agents/                           (slimmed: integration-checker, a11y-verifier,
│                                       pixel-perfect-verifier, audit-production —
│                                       fallback sections removed per table 1)
├── commands/                         (slimmed: pre-pr-check — Wave 1 fallback grep
│                                       gates removed)
├── skills/audit-component/SKILL.md   (slimmed: Wave 1 grep list + 2.1 file tree
│                                       + 2.4 lifecycle audit replaced with script refs)
└── (everything else unchanged)

.github/workflows/ci.yml              (audit:all + regression-check now hard gates)
```

Net effect after cleanup:

- **~1,500 additional tokens saved** beyond the 1,289 already saved by Sprint 6
  (rough estimate from the fallback-section sizes in table 1)
- Hard CI gate ensures no future PR can re-bloat the prompts unnoticed
- Audit suite documentation lives in 2 places only: `scripts/audit/README.md`
  (how it works) and this `CLEANUP.md` (how we got here + what to delete)
