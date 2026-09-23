# audit-component — one entry point, callers and references brought in line with Decision 12

**Reviewed:** none

## Goal

`/audit-component` resolves to exactly one authored file, the `audit-component` skill; every
caller and reference describes the audit as it now works (script-computed verdict, AI legs
advisory at every depth, BX scripted); the skill's per-invocation prompt shrinks by moving a
historical table that no run consults. Owner request 2026-09-23 ("recomandarea ta, confirm").

## Problem

1. **The command file is dead.** Claude Code resolves a skill and a `.claude/commands/` file of
   the same name to the skill ("Resolve skills that share a name" table,
   https://code.claude.com/docs/en/slash-commands, fetched 2026-09-23). This session's skill
   listing shows `audit-component` once, with the skill's description. So
   `.claude/commands/audit-component.md` is never loaded, yet it is a third authored copy of the
   depth and flag parameters (with `SKILL.md` and `.claude/commands/README.md:15`), and it
   disagrees with the skill: it promises CX judgment at `standard` (`:23`, `:40`), which the
   skill runs only at `deep` (`SKILL.md:38`).
2. **Stale callers push the removed behaviour.**
   - `.claude/agents/audit-production.md:588-597` (Phase 11.5) sends the agent to "§Layer 2" of
     the skill (no such section: `grep -c "Layer 2" SKILL.md` → 0), calls BX a "mandatory MCP
     browser checklist" (BX1–BX7 are scripted rows that never use the shared MCP browser,
     `references/layer-2-browser-checklists.md:12-14`), and says a failing BX row escalates the
     verdict to "Block". Its trigger `meta.layer2Required: true` is never emitted
     (`scripts/audit/run-all.mjs:1083` hard-codes `false`), so the phase is also unreachable.
   - `.claude/agents/a11y-verifier.md:191` points at the same non-existent "§BX mandatory
     browser checklist ... with exact MCP call signatures".
   - `.claude/agents/refactor-component.md:14` offers "or follow `audit-component.md` steps
     inline", which the skill forbids (`SKILL.md:45-48`: never hand-run the audit).
   - `.claude/commands/migrate-component.md:57` links to the command's "steps 2–3", a coupling
     to step numbers of a file this plan deletes.
   - `CLAUDE.md:18` says the skill "wraps the 3-wave production audit" and
     `.claude/skills/LOCAL-SETUP.md:83` says it "wraps the `/audit-component` slash command
     logic" — both describe the relation this plan removes.
3. **Reference drift against Decision 12.** `references/layer-2-browser-checklists.md:45` ("at
   `deep` it sets `FAIL`") and `references/wave-2-static-analysis.md:8` ("at `deep` an `error`
   finding sets `FAIL`") contradict `SKILL.md:83-86` and `:130-131` (AI findings never change
   the state).
4. **Prompt weight.** `SKILL.md` is 17,149 bytes; the "Where the old manual checks went" table
   (`SKILL.md:149-218`) is 5,645 bytes (33%) of migration history that no audit step reads.

## Decision

Delete the command; the skill is the single entry point. Not on the expensive-to-reverse list:
the user-visible `/audit-component` keeps resolving to the same skill it resolves to today, and
the delete is a one-commit revert. No option table: there is no second live alternative (keeping
a file the harness never loads is not one).

Out of scope, reported to the owner instead: `optimize-prompt` has the same collision
(`.claude/commands/optimize-prompt.md` vs `.claude/skills/optimize-prompt/SKILL.md`). For that
reason no generic "shadowed command" lint rule is added here — it would fail `yarn docs:check`
on `optimize-prompt` and force that second decision into this change. The guard added is scoped
to `audit-component`.

## Acceptance bar

Each command runs as written, from the repo root; exit 0 is PASS. B4–B6 were run before the
change (2026-09-23) and each found the defects named in § Problem, so each discriminates.

- **B1** — command file gone:
  `test ! -e .claude/commands/audit-component.md`
- **B2** — caller and doc-check specs pass:
  `node --test scripts/__tests__/audit/callers.spec.mjs scripts/__tests__/check-ai-docs.spec.mjs`
- **B3** — doc links and paths resolve:
  `yarn docs:check`
- **B4** — no reference to the deleted file:
  `! git grep -nE 'commands/audit-component\.md|\(audit-component\.md\)|audit-component\.md. steps' -- .claude CLAUDE.md AGENTS.md _agents src/components/AGENTS.md ':!.claude/plans'`
- **B5** — no stale Layer 2 / MCP-driven BX instruction:
  `! git grep -nE '§Layer 2|Layer 2 of the|mandatory MCP browser|mandatory browser checklist|layer2Required' -- .claude/agents .claude/skills`
- **B6** — no reference says an AI finding sets FAIL (so the rewrite must not say "never sets
  `FAIL`" either; phrase it as "does not change the state"):
  `! git grep -n 'sets .FAIL.' -- .claude/skills/audit-component`
- **B7** — skill prompt shrinks from 17,149 bytes:
  `test "$(wc -c < .claude/skills/audit-component/SKILL.md)" -le 12500`
- **B8** — formatting:
  `npx prettier --check .claude/skills/audit-component .claude/agents/audit-production.md .claude/agents/a11y-verifier.md .claude/agents/refactor-component.md .claude/commands/migrate-component.md .claude/commands/README.md .claude/skills/LOCAL-SETUP.md CLAUDE.md scripts/__tests__/audit/callers.spec.mjs`
- **B9** — the new absence test is live: recreate `.claude/commands/audit-component.md` with any
  content, run B2's command and see it exit non-zero naming the new test; delete the file and
  run B2 again (exit 0). Record both exits in the report.

## Global constraints

- Everything authored is English. No AI attribution anywhere.
- Never hand-edit `src/components.d.ts` or component `readme.md` files.
- Do not touch `STACK.md` or `.node-version` (another writer's uncommitted work).
- Stage only the paths in the Files list, by name. Never `git add -A` / `git add .`.
- `callers.spec.mjs` invariants stay green: every remaining gate caller has a code block with
  `yarn audit:component`; every `Skill('audit-component', {...})` call carries `--run-dir`; no
  file reintroduces a `DEAD_DEEP_FLOW` token.

## Tasks

### Phase 1 — single entry point and caller cleanup
**Executor**: session, medium effort · wave 1

**Files**:
- Delete: `.claude/commands/audit-component.md`
- Modify: `.claude/skills/audit-component/SKILL.md`
- Create: `.claude/skills/audit-component/references/check-migration-map.md`
- Modify: `.claude/skills/audit-component/references/layer-2-browser-checklists.md`
- Modify: `.claude/skills/audit-component/references/wave-2-static-analysis.md`
- Modify: `.claude/agents/audit-production.md`
- Modify: `.claude/agents/a11y-verifier.md`
- Modify: `.claude/agents/refactor-component.md`
- Modify: `.claude/commands/migrate-component.md`
- Modify: `.claude/commands/README.md`
- Modify: `.claude/skills/LOCAL-SETUP.md`
- Modify: `CLAUDE.md`
- Modify: `scripts/__tests__/audit/callers.spec.mjs`

1. **Test first.** In `callers.spec.mjs`: drop `.claude/commands/audit-component.md` from
   `GATE_CALLERS` and `DEEP_CALLERS`; add a test asserting the file does not exist and
   `.claude/skills/audit-component/SKILL.md` does, with a message saying the skill shadows a
   same-named command, so the file would be dead code. Run B2: the new test fails while the
   file still exists.
2. **Delete the command.** Move into `SKILL.md` only what the skill lacks: a short `## Usage`
   block with the four invocation examples (`/audit-component mud-button`, `... --depth deep`,
   `... --depth quick`, `... --no-figma`). "Do NOT auto-fix" is already in the skill
   (`SKILL.md:3`, `:147`).
3. **Move the migration table.** Cut `SKILL.md` § "Where the old manual checks went" (heading,
   intro, 61-row table) verbatim into `references/check-migration-map.md`, opening with a scope
   banner (what it records, load when tracing where an old manual check went). In `SKILL.md`,
   leave a two-line pointer, add a row to § References, and change the failure-mode bullet
   "the table above is the only record" to name the new file. Keep the "ref judgment"
   definition with the table.
4. **References.** `layer-2-browser-checklists.md:45` and `wave-2-static-analysis.md:8`: an
   `error` finding is advisory at every depth and never changes the state (Decision 12); keep
   the question/options rule.
5. **Callers.**
   - `audit-production.md`: replace Phase 11.5 with a short section saying BX1–BX7 are scripted
     verdict rows at `standard`+ (`19-interaction`), and CX/DX judgment is the skill's advisory
     legs, already dispatched in Phase 1; neither changes `state`. No "Block" escalation, no
     `layer2Required`.
   - `a11y-verifier.md:191`: BX1–BX7 are scripted rows (cite
     `references/layer-2-browser-checklists.md` § BX); this agent judges what the scripts
     cannot (logical Tab order, Shift+Tab, SC 1.4.11). Drop "execute BX5–BX6 here".
   - `refactor-component.md:14`: invoke the `audit-component` skill at `--depth standard`;
     remove "or follow `audit-component.md` steps inline".
   - `migrate-component.md:57`: replace the link to the command's steps with the skill's
     § AI legs and its `--run-dir` invocation. Any `Skill('audit-component', ...)` it contains
     passes `--run-dir`.
   - `.claude/commands/README.md:15`: say the row is served by the skill
     (`.claude/skills/audit-component/SKILL.md`), drop the restated flag list for a pointer to
     the skill, and make Complexity "Low (quick) – High (deep)".
   - `LOCAL-SETUP.md:83` and `CLAUDE.md:18`: the skill *is* `/audit-component` and runs the
     script-computed audit; drop "wraps the slash command logic" / "3-wave".
6. Run B1–B9. Commit the named paths.

## Self-refute log

1. **Does the fix reuse the defect's mechanism class?** The defect is a doc copy nobody reads
   drifting from the one that runs. The fix deletes the copy rather than syncing it, and the
   guard is a file-existence test (Task 1), not a promise to keep two copies aligned. No
   instance.
2. **Can the letter be met with the intent violated?** B4 could pass while a caller still
   describes the command in words without a path ("follow the command's steps"). Task 5 names
   each caller line explicitly, and B5 covers the Layer 2 wording. Residual: a paraphrase
   outside the named files is not grepped; scanned `git grep -n "/audit-component"` (31 files),
   and every other hit uses the slash name, which stays valid.
3. **Numeric targets.** B7 (≤ 12,500 bytes) has a denominator: 17,149 bytes today, of which the
   table is 5,645 (`awk 'NR>=149 && NR<=218' SKILL.md | wc -c`, run 2026-09-23). The instrument
   is `wc -c`, outside what it grades. It is a size, not a token measurement (Not verified).
4. **Do two rules interact into an unintended pass?** B6 forbids the phrase "sets `FAIL`",
   and Task 4 must state that AI findings do not change the state. A rewrite reading "never
   sets `FAIL`" would satisfy Task 4 and fail B6. Addressed by the wording note on B6. Also
   `callers.spec.mjs`'s `SKILL_CALLERS` assertion becomes vacuous if no caller invokes
   `Skill('audit-component', ...)` after the command leaves; its own
   "at least one caller invokes the skill" test catches that (`audit-production.md:120` still
   does).

## Dropped

- A generic `shadowed-command` rule in `scripts/docs/check-ai-docs.mjs` (see § Decision).
- Keeping the command and syncing it with the skill.

## Not verified

- That no user or tool loads `.claude/commands/audit-component.md` by path outside this repo.
  Inside the repo, B4 covers the docs; `scripts/__tests__/check-ai-docs.spec.mjs:269` uses the
  name only in a temporary fixture and is unaffected.
- The token saving is a byte count (B7), not a measured per-invocation token count.
