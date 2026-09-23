# Audit report: script-rendered summary + changes since the previous run

## Goal

After `/audit-component` (or `yarn audit:component`), the reader gets a complete, readable report
whose shape never depends on the session that presented it, both inline and on disk, and can see
what changed since the previous run of the same depth.

## Problem

- `audit/<c>/fix-brief.md` (rendered by `scripts/audit/lib/fix-brief.mjs`) lists only non-PASS
  entries. The per-check table a reader wants (2026-09-23 mud-avatar run) was reconstructed by the
  model from `verdict.json`, so its shape varies per session and its counts can be wrong — the
  exact "model paraphrases the verdict" failure `references/report-template.md` forbids.
- Nothing shows evolution between runs. `audit/` is git-ignored; committing it is rejected:
  `verdict.json` carries `figma.commit` (changes on every commit), the audit reads HEAD (a committed
  report is stale by one commit), and generated files already cause branch conflicts
  (`_agents/generated-files.md`).

## Decision

1. **Summary section, script-rendered.** `fix-brief.mjs` gains `renderSummary(verdict)`, emitted at
   the top of `fix-brief.md`: one counts line (entries per kind, warnings, advisory), a table with one
   row per `verdict.rows[]` entry (`# | Check | Required | Result | Fail | Warn | Note`; Result and
   the counts are derived from the verdict's own entries and warnings — never the script's raw
   counts — so the table cannot disagree with the entries; a non-ok row shows its status; Note carries
   `excuse`/`deferred`/`note`), and an index table of every entry and advisory item
   (`ID | Kind | Check | Where | Actual | Owner`). Cell values go through `line()` plus `|` escaping.
2. **Changes since the previous run — descoped (2026-09-23, owner decision).** Three sentinel rounds
   each reproduced new cases where comparing two recomputed verdicts reported something that did
   not happen (see § Sentinel rounds below). Removed from this PR; the comparison is its own issue.
3. **`verdict.json` is untouched** — still a pure function of its run's inputs, byte-identical
   across identical runs.
4. **Terminal.** In text mode `printSummary` prints, per component, the brief's report block (from
   `## Summary` to an explicit `<!-- end of report -->` marker) under the existing headline line.
   `--json` output is unchanged.
5. **Skill.** `SKILL.md` step 4 and `references/report-template.md`: the inline report is the
   brief's report block pasted verbatim, then the model's synthesis (correlations, decisions, not
   verified, conclusion) — it never rebuilds the table.

## Acceptance bar

Zero tolerance:
- `verdict.json` bytes unchanged for the same run inputs (existing byte-identical spec stays green).
- Every `verdict.rows[]` entry appears exactly once in the summary table; every `entries[]` and
  `advisory[]` id appears exactly once in the index.
- A cell value containing `|` or a newline cannot break the table (spec).
- Rerendering the same run twice yields byte-identical `fix-brief.md`.
- `--json` stdout unchanged.
- `node --test "scripts/__tests__/audit/**/*.spec.mjs"` passes; `yarn lint` clean on touched files.

Tolerances: none numeric — the output is deterministic.

## Global constraints

- Pinned stack: Node per `.node-version`/`STACK.md`; tests use `node:test` (`yarn test:scripts`).
- English in all authored files. No change to exit codes, `verdict.json` schema, or summary.json.
- Do not stage `STACK.md` / `.node-version` (another session's uncommitted work).

## Tasks

1. `lib/fix-brief.mjs`: `renderSummary`, table escaping, report block with end marker, optional
   `changes` argument to `renderFixBrief`.
2. ~~`lib/run-delta.mjs`~~ — descoped with Decision 2.
3. `verdict.mjs`: `writeVerdictForRun` computes the delta and passes it; `printSummary` prints the
   report block in text mode.
4. Specs: `report-block.spec.mjs` — summary coverage, escaping, hostile text, the terminal block.
5. `SKILL.md` step 4 + `references/report-template.md` synthesis section.

## Preflight (2026-09-23)

FORTIFY (med): findings 1-3 and the unverified escaping point folded in above. Probe (a) — the
verbatim paste is a convention, not a mechanism — is accepted as a limit: the script prints the same
block to the terminal, so the reader sees the unparaphrased block even when the chat restatement
drifts.

## Verify (2026-09-23)

FORTIFY (med): one finding, test placement — resolved by updating Task 4 above. A first verify pass
(ungraded) found advisory NEEDS-DECISION entries keyed on node only; fixed in `entryKey` with a spec.

## Sentinel rounds

### Round 1 (2026-09-23, range c8fb93b..7cfda57)

REQUEST-CHANGES. `/code-review xhigh` reproduced false "Resolved" claims: an aborted current run,
a row excused or crashed this run, advisory items before this run's legs wrote, and a moved line.
The errors lens flagged a swallowed baseline-recompute exception. All fixed with a spec each:
the current run must be comparable, a not-run row's findings are "not re-checked", advisory is
compared only once legs wrote, FAIL identity drops the line, per-row counts show, a baseline row
missing entirely reads absent, the recompute error is named, the end marker is matched as a whole
line, and control characters are neutralised. Deferred and report-only rows now read as such.

### Round 2 (2026-09-23, 7cfda57..336d7d0) — the design changed

REQUEST-CHANGES again, and the pattern is the finding: every round reproduced a new case where
inferring "resolved" was wrong — same-code findings paired by position once the line left the key,
a settled design decision filed as "not re-checked" (it has no row), one advisory flag for all
legs, report-only and deferred rows missing from the not-run set, a baseline row guessed as "added
later". Each fix was right for its case and wrong for the next.

So the section stopped inferring. An entry missing from this run is "no longer reported", printed
with its row's result now; the word "resolved" is gone. The line is back in the identity (moving
reads as gone + new — noise, never a false pairing). Advisory items are counted, not paired. This
deletes the not-run set, the advisory flag, the baseline-row guess and the line stripping — the
code every round kept finding wrong. Kept from round 1: the current run must be comparable, the
recompute error is named, whole-line markers, control characters neutralised. Also fixed: the
a11y-verifier text (Enter and Space are not scripted; BX3 accepts a transparent outline), the
printed headline is neutralised too, `\|` in a cell, report-only rows with only warnings, one
shared `schemaMajor`, and the baseline envelope is parsed once.

### Round 3 (2026-09-23, 336d7d0..7eb80db) — at cap, section descoped

Three wrong reports reproduced again: same-code findings with no line still paired by position,
the advisory count reading as dropping to 0 before a deep run's legs wrote, and a check made
required after the baseline ran producing an INCOMPLETE the baseline never had. At the round cap
the owner chose to remove the "Changes since" section, keep the report block, fix the remaining
findings that apply to it, and record the next round WAIVED. `run-delta.mjs` and its specs are
gone; the report block's specs moved to `report-block.spec.mjs`.

## Not verified

- A real browser-depth run after the change (the fixtures exercise the renderer; one real
  `yarn audit:component mud-avatar --depth quick` run is the manual check).
