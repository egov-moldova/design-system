# AI Harness Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Reviewed:** critic 2248eb4 — 3 rounds (preflight, critic, critic); round 3's findings folded; closed at the 3-round cap and handed to Dan

**Goal:** Fix the defects the 2026-09-16 harness audit found in the AI documentation, turn the
unenforced rules it named into fast deterministic checks, and make the harness hybrid: one
tool-agnostic source (`AGENTS.md` + `_agents/`) with Claude-specific guarantees in `CLAUDE.md`.

**Architecture:** Instruments first, fixes second. `scripts/docs/check-ai-docs.mjs` gains five
bounded rules and `scripts/hardcoded-colors.mjs` gains a palette rule, each with a spec that fails
before it passes; the doc fixes are then graded by those instruments, not by the editor. ESLint
gains one autofixable rule. `CLAUDE.md` imports the always-active workflow rules and carries the
Claude-only automation section moved out of `AGENTS.md`.

**Tech Stack:** Node 24 ESM scripts (no dependencies), `node:test`, ESLint flat config with
`typescript-eslint`, Markdown.

**Spec:** the harness-check report delivered in-session on 2026-09-16 (findings #1–#11, option C);
its facts are restated in "Findings being fixed" below so this plan stands alone.

## The problem

The audit's findings, each with the file that causes it:

| # | Finding | Located cause |
| --- | --- | --- |
| 1 | `.specs/` is unreferenced (0 inbound harness links), duplicates `AGENTS.md`/`STACK.md`/`TESTING.md`, and states Jest and Style Dictionary v4 | `.specs/PROJECT-SPECIFICATION.md:66`, `.specs/TOKEN-ARCHITECTURE.md:62,175` |
| 2 | Two audits check `newE2EPage` as the live E2E pattern; it is retired, and its 15 users are all in `src/legacy/` (excluded in `vitest.config.mts`) | `.claude/skills/audit-component/SKILL.md:496-510`, `.claude/agents/audit-production.md:402-414` |
| 3 | Style Dictionary v4 claims; `package.json` pins `^5.5.3` | `.claude/agents/custom-component.md:102`, `.claude/commands/update-tokens.md:72`, `tokens/AGENTS.md:49` |
| 4 | Backticked paths that do not exist | 8 hits, listed in Task 1.2's `derived` fence |
| 5 | Subagents written as slash commands, which Claude Code cannot run | `AGENTS.md:17`, `_agents/workflow-rules.md:16`, `_agents/skills-and-workflows.md:41,42,47,52`, `.claude/commands/README.md:7`, `.claude/skills/audit-component/SKILL.md:360` |
| 6 | `.claude/agents/README.md` lists 4 of 11 agents and gives `audit-production` 9 phases (it has 11) | `.claude/agents/README.md:11-16` |
| 7 | `TESTING.md` is not indexed | `AGENTS.md` Project-Level Docs table |
| 8 | `README.md` gives React 19 guidance only; the React adapter's peer range is `react@^18` | `README.md:160`, `react/package.json` `peerDependencies` |
| 9 | MUST rules nothing checks: type-only imports, `Record<>` maps, no `var(--palette-*)` in component CSS | `_agents/typescript-strict.md:63,108`, `AGENTS.md:98` |
| 10 | The docs checker covers 4 drift classes; the Jest class was swept by hand in `7292e57` and recurred | `scripts/docs/check-ai-docs.mjs:13-22` |
| 11 | `audit-component/SKILL.md` is 877 lines | `.claude/skills/audit-component/SKILL.md` |
| C | Always-active workflow rules load only if the model elects to read them; Claude-only content sits in the cross-tool `AGENTS.md` | `AGENTS.md:27` ("At conversation start"), `AGENTS.md` Automation section |

## Decisions (danzubco, 2026-09-16)

- Lands on `fix/issue-53-ai-docs-alignment` (PR #83), one commit per task.
- `.specs/` is deleted.
- Approved automations: `--palette-` check in CSS; `@typescript-eslint/consistent-type-imports`
  as `error` plus its autofix; demote the `Record<>` MUST to a recommendation; extend
  `check-ai-docs` (Style Dictionary major, backticked paths).
- After the automations, scan for further DX improvements; fast `.mjs` scripts take priority
  over AI-driven solutions.

## Finding #10: drift classes and their disposition

| Class | Disposition |
| --- | --- |
| Style Dictionary major | New rule `sd-version` (Task 1.1) |
| Backticked repo paths | New rule `path` (Task 1.2) |
| Subagent as slash command | New rule `agent-slash` (Task 1.3) |
| Agent catalog completeness | New rule `agent-catalog` (Task 1.4) |
| Jest / test-runner claims | **Dropped.** Every remaining `jest` mention in doc scope is a retirement note; a matcher cannot tell a retirement note from a claim without parsing prose, the unbounded grammar Phase 7 excludes. `.specs/PROJECT-SPECIFICATION.md:66`, the one live claim, is deleted in Task 3.1 |

## Option C disposition (hybrid)

| Item | Disposition | Why |
| --- | --- | --- |
| C1 — import `_agents/workflow-rules.md` from `CLAUDE.md` | **Do** (Task 5.1) | It is the only "At conversation start" file; importing it from `CLAUDE.md`, not `AGENTS.md`, keeps the Codex byte budget (32 KiB across `AGENTS.md` files) untouched |
| C2 — `.claude/rules/*.md` with `paths:` as pointers into `_agents/` | **Dropped** | `src/components/CLAUDE.md` and `tokens/CLAUDE.md` already load their index when a file in that subtree is read, which is the same trigger; a rule layer would add a concept and a second copy of the index for no new trigger |
| C3 — move Claude-only content from `AGENTS.md` to `CLAUDE.md` | **Do** (Task 5.2) | Slash commands, subagents, the Skill tool and `mcp__*` names mean nothing to Codex, Cursor, Copilot or Gemini, which read `AGENTS.md` |
| C4 — keep skills as `SKILL.md` | **No change** | The format is already portable (Agent Skills, supported by Copilot) |

## Global Constraints

- Node `>=24 <25` (`eval "$(fnm env)" && fnm use 24`); Yarn 4; scripts stay dependency-free ESM.
- Commits: Conventional Commits, validated with `yarn commitlint --edit <msgfile>`, message via
  `-F <file>`; stage explicit paths only; `HUSKY=0 git commit` (approved on this branch because
  typecheck and build fail on the #80×#81 `size={12}` base defect, not on this work). Run
  `yarn lint` before each commit instead.
- Never hand-edit generated files (`src/components.d.ts`, `*/readme.md`).
- Authored content in English.
- Deletion rule: before deleting or moving a file, `rg` its inbound references and fix every hit in
  the same commit.
- Checker scope stays as defined in `scripts/docs/check-ai-docs.mjs` (`isDocScope`,
  `isNodeVersionScope`); `.claude/plans/**` and `CHANGELOG.md` remain historical records.
- Every task ends on its verify command printing the expected result.
- No push between Task 1.1's commit and Task 3.4's commit: in that window `yarn docs:check` exits 1 by design (the new rules land before the fixes they grade), and CI runs it.

## Acceptance bar

Zero-tolerance:

- `node scripts/docs/check-ai-docs.mjs; echo $?` → `check-ai-docs: clean`, `0`.
- `node scripts/hardcoded-colors.mjs --no-color; echo $?` → `✔ No hardcoded colors detected.`, `0`.
- `yarn lint` exits 0 (includes the new ESLint rule).
- `yarn test` exits 0.
- `node --test scripts/__tests__/check-ai-docs.spec.mjs scripts/__tests__/hardcoded-colors.spec.mjs scripts/__tests__/tokens-lint.spec.mjs scripts/__tests__/git-hooks.spec.mjs` exits 0.
- `yarn typecheck` reports exactly one error, `mud-date-input.tsx(881,41)` (the known base defect) —
  the ESLint autofix must not add one.
- Task 4.1's generated-file comparison, `test -s "$(git rev-parse --git-dir)/harness-gen-before.sha" && diff "$(git rev-parse --git-dir)/harness-gen-before.sha" "$(git rev-parse --git-dir)/harness-gen-after.sha"`, exits 0 and prints nothing, and `wc -l < "$(git rev-parse --git-dir)/harness-gen-before.sha"` equals `git ls-files src/components.d.ts 'src/components/*/readme.md' | wc -l`.

Numeric (baselines run 2026-09-16 on `2248eb4`):

```derived id=baseline
$ npx eslint --no-warn-ignored --rule '{"@typescript-eslint/consistent-type-imports":"error"}' 'src/**/*.{ts,tsx}' -f json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).flatMap(f=>f.messages).filter(m=>m.ruleId==="@typescript-eslint/consistent-type-imports").length))'
26
$ ls .specs | wc -l
4
$ wc -l .claude/skills/audit-component/SKILL.md
     877 .claude/skills/audit-component/SKILL.md
$ wc -c AGENTS.md src/components/AGENTS.md tokens/AGENTS.md | tail -1
   26458 total
```

| Metric | Instrument | Baseline | Target |
| --- | --- | --- | --- |
| `consistent-type-imports` violations in `src/` | step 1 of the `baseline` fence | 26 [#baseline] | 0 |
| Files under `.specs/` | step 2 of the `baseline` fence | 4 [#baseline] | 0 (directory absent) |
| Lines in `audit-component/SKILL.md` | step 3 of the `baseline` fence | 877 [#baseline] | at most 500 |
| Bytes across the three `AGENTS.md` files | step 4 of the `baseline` fence | 26458 [#baseline] | below the baseline |

Targets are thresholds this plan sets, not measured numbers, so no fence backs them before the
work exists. Each baseline is backed by the `baseline` fence above; Final verification re-runs the
same four steps into a `derived id=after` fence, and each after-value is graded against its Target.

---

## Execution matrix

Dispatch verdict: **mixed.** The instrument phases (1, 2) and the ESLint phase (4) carry exact code
and verify commands and stay inline, where the generated-file comparison and the base-defect
workaround need the main session. The doc phases (3, 6) are briefs with a checker as the grader and
go to workers. Phases 5 and 7 need judgment about what Claude loads and what is worth building, and
stay inline.

| Phase | Model | Effort | Wave | Mode | Depends on / notes |
| --- | --- | --- | --- | --- | --- |
| 1 Docs checker rules | Opus 5 | medium | A | inline | none |
| 2 Palette check | Opus 5 | low | B | inline | none; own files, run after 1 in the same session |
| 3 Doc fixes | Sonnet 5 | medium | C | subagent `implementer` | 1 (checker grades 3.3–3.5); touches `.claude/agents/audit-production.md` and `audit-component/SKILL.md`, which Phase 6 also edits |
| 4 ESLint type imports | Opus 5 | medium | D | inline | 3 (lint must be green first); touches `src/**` and `eslint.config.mjs` |
| 5 Hybrid CLAUDE.md | Opus 5 | medium | E | inline | 3 (`workflow-rules.md` is fixed before it is imported); edits `AGENTS.md` |
| 6 Split audit-component | Sonnet 5 | medium | F | subagent `implementer` | 3 and 5 (its inbound references may sit in `AGENTS.md`, which 5 edits) |
| 7 DX scan | Opus 5 | high | G | inline | 1–6 |

Every wave holds one phase, so no two phases write in parallel.

**Not compiled to a workflow:** running a Workflow needs Dan's explicit opt-in, and the two
dispatched rows (`Sonnet 5 · medium`) equal the `implementer` agent's own pin
(`~/.claude/agents/implementer.md`: `model: sonnet`, `effort: medium`), which the Agent tool
enforces faithfully. Inline rows carry no agent segment.

Routing rationale: no phase needs Fable 5.1 — the decisions are already in this plan. Opus 5 holds
the phases that write code the rest of the plan is graded by (1, 2), touch `src/**` and lint
config (4), decide what Claude loads (5) or judge what is worth building (7, `high`); Sonnet 5 takes
the two brief-driven doc phases. Escalation: a phase that fails its verify twice restarts one tier
up with fresh context instead of iterating in place. `yarn lint && yarn test` once per phase.

---

## Phase 1 — Docs checker: five new rules

**Executor**: Opus 5 · medium · Wave A

### Task 1.1: Rule `sd-version`

**Files:**
- Modify: `scripts/docs/check-ai-docs.mjs` (add rule, header comment, wire into `checkAiDocs`)
- Test: `scripts/__tests__/check-ai-docs.spec.mjs`

**Interfaces:**
- Consumes: `isNodeVersionScope(relPath)`, `readPackage(root)`, `makeHit(file, line, ruleId, message)`, `findCodeSpans`, the fenced-block skipping the file already does.
- Produces: `dependencyMajor(pkg, name) → number | null`; rule id `sd-version`.

- [ ] **Step 1: Write the failing tests**

```js
describe('sd-version rule', () => {
  it('flags a Style Dictionary major that differs from package.json', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: '@acme/widgets', engines: { node: '>=24.0.0 <25.0.0' }, devDependencies: { 'style-dictionary': '^5.5.3' } }),
      'tokens/AGENTS.md': '# Tokens\n\nDTCG format (Style Dictionary v4).\n\nPinned as Style Dictionary 4.4.2.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['tokens/AGENTS.md', 3, 'sd-version'], ['tokens/AGENTS.md', 5, 'sd-version']],
    );
  });

  it('passes the pinned major and a claim with no version', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: '@acme/widgets', engines: { node: '>=24.0.0 <25.0.0' }, devDependencies: { 'style-dictionary': '^5.5.3' } }),
      'STACK.md': 'Style Dictionary 5.x builds tokens. Style Dictionary (DTCG) is the pipeline. Pinned to Style Dictionary 5.\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test scripts/__tests__/check-ai-docs.spec.mjs`
Expected: the first new test FAILS (no `sd-version` hit); the second passes.

- [ ] **Step 3: Implement**

```js
// Style Dictionary claims recognised (case-insensitive): `Style Dictionary v4`,
// `Style Dictionary 4.x`, `Style Dictionary 4.4+`, `Style Dictionary 4.4.2`, `Style Dictionary 4`.
const SD_CLAIM = /\b(?:style[ -]dictionary\s+v?|SD\s+v)(\d+)(?:\.(?:\d+|x))*\+?(?!\w)(?!\.\d)/gi;

export function dependencyMajor(pkg, name) {
  const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  const m = typeof range === 'string' ? range.match(/(\d+)/) : null;
  return m ? Number(m[1]) : null;
}

function checkStyleDictionaryVersion(relPath, lines, allowedMajor) {
  const hits = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    for (const m of line.matchAll(SD_CLAIM)) {
      const major = Number(m[1]);
      if (major !== allowedMajor) {
        hits.push(makeHit(relPath, i + 1, 'sd-version', `Style Dictionary ${major} claim does not match package.json major ${allowedMajor}`));
      }
    }
  });
  return hits;
}
```

Wire it in `checkAiDocs` next to `checkNodeVersion`, only when `isNodeVersionScope(relPath)` and
`dependencyMajor(pkg, 'style-dictionary') !== null`. Add the rule to the header comment list.
Run `npx prettier --write` on both files.

- [ ] **Step 4: Run to verify they pass, then the real repo**

Run: `node --test scripts/__tests__/check-ai-docs.spec.mjs && node scripts/docs/check-ai-docs.mjs | grep sd-version`
Expected: tests pass; hits are exactly `.claude/agents/custom-component.md:102`,
`.claude/commands/update-tokens.md:72`, `tokens/AGENTS.md:49`, `tokens/AGENTS.md:76` (`SD v4`), `.specs/TOKEN-ARCHITECTURE.md:62`,
`.specs/TOKEN-ARCHITECTURE.md:175` (and any `.specs/` line 34). Any other hit is read: a true claim
is kept as a finding for Phase 3; a false positive tightens `SD_CLAIM` and gains a passing test.

- [ ] **Step 5: Commit** — `test(docs): check Style Dictionary version claims against package.json`
  staging `scripts/docs/check-ai-docs.mjs scripts/__tests__/check-ai-docs.spec.mjs`.

### Task 1.2: Rule `path`

**Files:** same two files.

**Interfaces:**
- Consumes: `isDocScope`, `AGENTS_BACKTICK_RE`, `isGitRepo(root)`.
- Produces: rule id `path`.

```derived
$ (prototype of this rule, run 2026-09-16 on 2248eb4: 380 backticked paths scanned in doc scope)
unresolved: 8
.claude/agents/a11y-verifier.md:226 .storybook/main.ts
.claude/agents/integration-checker.md:3 src/components/index.ts
.claude/skills/audit-component/SKILL.md:206 src/components/mud-input/mud-input.tsx
.claude/skills/optimize-prompt/references/codebase-snapshots.md:84 src/utils/shared.constants.ts
.claude/skills/optimize-prompt/references/codebase-snapshots.md:302 tokens/core/motion.tokens.json
.claude/skills/optimize-prompt/references/codebase-snapshots.md:307 src/utils/shared.constants.ts
_agents/anti-patterns.md:30 src/components/shared.constants.ts
src/components/_agents/slot-patterns.md:43 src/components/shared.constants.ts
```

`codebase-snapshots.md:302` is a hypothetical example ("when a new token category appears"); Phase 3
rewrites it as a placeholder (`tokens/core/<category>.tokens.json`), which this rule skips.

- [ ] **Step 1: Write the failing tests**

```js
describe('path rule', () => {
  it('flags a backticked repo path that does not exist', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/detail.md': 'See `src/components/index.ts` and `scripts/real.mjs`.\n',
      'scripts/real.mjs': '',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['_agents/detail.md', 1, 'path']],
    );
  });

  it('resolves skill-relative shorthand, relative paths and skips placeholders and fences', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/skills/stencil-compliance/references/decorators.md': 'x',
      '.claude/skills/audit-component/SKILL.md': [
        'Read `stencil-compliance/references/decorators.md`.',
        'Sibling `../audit-component/SKILL.md`.',
        'Template `src/components/mud-x/test/mud-x.figma.json` and `tokens/core/<category>.tokens.json`.',
        '```',
        '`src/missing/in-fence.ts`',
        '```',
      ].join('\n'),
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });

  it('does not resolve skill shorthand for a doc outside .claude/skills', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/skills/other-skill/references/notes.md': 'x',
      '_agents/detail.md': 'See `other-skill/references/notes.md`.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['_agents/detail.md', 1, 'path']],
    );
  });
});
```

- [ ] **Step 2: Run to verify the first and third fail** — `node --test scripts/__tests__/check-ai-docs.spec.mjs`.

- [ ] **Step 3: Implement**

```js
const REPO_PATH_BACKTICK = /`((?:\.\.?\/)*[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)+\.(?:md|mjs|cjs|js|ts|tsx|mts|json|css|ya?ml|sh|ps1))`/g;
// Template names in docs: `mud-x`, `component-name`, `$ARGUMENTS`, `<category>`, globs.
const PATH_PLACEHOLDER = /mud-x\b|component-name|[$<>{}*]/;

function gitIgnored(root, relPaths) {
  if (relPaths.length === 0 || !isGitRepo(root)) return new Set();
  const run = spawnSync('git', ['-C', root, 'check-ignore', '--stdin'], { input: relPaths.join('\n'), encoding: 'utf8' });
  return new Set(run.stdout.split('\n').filter(Boolean));
}

function checkPaths(relPath, lines, root) {
  const dir = path.posix.dirname(relPath);
  const unresolved = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    for (const m of line.matchAll(REPO_PATH_BACKTICK)) {
      const p = m[1];
      if (PATH_PLACEHOLDER.test(p) || AGENTS_BACKTICK_RE.test(p)) continue;
      // The whole text of a Markdown link: its target is graded by the `link` rule instead.
      const end = m.index + m[0].length;
      if (line[m.index - 1] === '[' && line.startsWith('](', end)) continue;
      const relative = /^\.\.?\//.test(p);
      const candidates = relative
        ? [path.posix.normalize(path.posix.join(dir, p))]
        : [p, path.posix.join(dir, p), ...(relPath.startsWith('.claude/') ? [path.posix.join('.claude/skills', p)] : [])];
      if (candidates.some(c => fs.existsSync(path.join(root, c)))) continue;
      unresolved.push({ line: i + 1, p, primary: candidates[0] });
    }
  });
  const ignored = gitIgnored(root, unresolved.map(u => u.primary));
  return unresolved
    .filter(u => !ignored.has(u.primary))
    .map(u => makeHit(relPath, u.line, 'path', `backticked path does not exist: ${u.p}`));
}
```

Import `spawnSync` from `node:child_process` (the file already imports `execFileSync` from it).
Wire into `checkAiDocs` for `isDocScope(relPath)` Markdown files. Header comment updated.

- [ ] **Step 4: Verify** — tests pass; `node scripts/docs/check-ai-docs.mjs | grep '\[path\]'` prints
  exactly the 8 lines in the `derived` fence above — the link-text skip removes the six
  `src/components/AGENTS.md:102-107` link texts a run without it reports (a 9th line is read and either fixed in Phase 3
  or turned into a test + rule tightening).

- [ ] **Step 5: Commit** — `test(docs): check that backticked repo paths in the AI docs exist`.

### Task 1.3: Rule `agent-slash`

**Files:** same two files.

- [ ] **Step 1: Failing tests**

```js
describe('agent-slash rule', () => {
  it('flags a subagent written as a slash command', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/new-component.md': '---\nname: new-component\n---\n',
      '.claude/commands/audit-component.md': 'x',
      'AGENTS.md': 'Use `/new-component` or `/audit-component`.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['AGENTS.md', 1, 'agent-slash']],
    );
  });

  it('passes the agent name without a slash and a path segment', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/new-component.md': 'x',
      'AGENTS.md': 'Dispatch the `new-component` agent. See .claude/agents/new-component.md.\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});
```

- [ ] **Step 2: Run, expect the first to fail.**

- [ ] **Step 3: Implement**

```js
function listNames(root, dir) {
  try {
    return fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.md') && f !== 'README.md').map(f => f.slice(0, -3));
  } catch {
    return [];
  }
}

function checkAgentSlash(relPath, lines, agentOnlyNames) {
  if (agentOnlyNames.length === 0) return [];
  const re = new RegExp(`(?:^|[\\s\`(|])\\/(${agentOnlyNames.map(n => n.replace(/[-]/g, '\\-')).join('|')})(?![\\w/.-])`, 'g');
  const hits = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      hits.push(makeHit(relPath, i + 1, 'agent-slash', `\`/${m[1]}\` is a subagent, not a slash command — write "the \`${m[1]}\` agent"`));
    }
  });
  return hits;
}
```

`agentOnlyNames` = `listNames(root, '.claude/agents')` minus `listNames(root, '.claude/commands')`,
computed once per run. Apply to `isDocScope` Markdown files.

- [ ] **Step 4: Verify** — tests pass; real-repo `agent-slash` hits cover exactly the finding #5 lines
  (`AGENTS.md:17`, `_agents/workflow-rules.md:16`, `_agents/skills-and-workflows.md:41,42,47,52`,
  `.claude/commands/README.md:7`, `.claude/commands/README.md:22` (two names), `.claude/skills/LOCAL-SETUP.md:79`,
  `.claude/skills/audit-component/SKILL.md:360` — 11 hits); read any extra.

- [ ] **Step 5: Commit** — `test(docs): flag subagents written as slash commands`.

### Task 1.4: Rule `agent-catalog`

**Files:** same two files.

- [ ] **Step 1: Failing test**

```js
describe('agent-catalog rule', () => {
  it('flags an agent missing from .claude/agents/README.md', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/new-component.md': 'x',
      '.claude/agents/test-writer.md': 'x',
      '.claude/agents/README.md': '| `new-component` | … |\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['.claude/agents/README.md', 1, 'agent-catalog']],
    );
  });
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement** — when `.claude/agents/README.md` exists, every name from
  `listNames(root, '.claude/agents')` must appear as the FIRST cell of a table row (`^\|\s*`<name>`\s*\|`, multiline); a prose mention does not count; one hit per missing name,
  line 1, message `` agent `<name>` is not listed in the catalog ``.

- [ ] **Step 4: Verify** — tests pass; real repo shows 7 `agent-catalog` hits (`a11y-verifier`,
  `integration-checker`, `pixel-perfect-verifier`, `redesign-component`, `story-writer`,
  `test-writer`, `token-validator`).

- [ ] **Step 5: Commit** — `test(docs): require every agent to be listed in the agent catalog`.

### Task 1.5: Rule `import`

**Files:** same two files.

- [ ] **Step 1: Failing test** — a fixture `CLAUDE.md` containing `@AGENTS.md` and `@_agents/missing.md` (with `AGENTS.md` present) yields exactly one `import` hit on line 2; a fixture where both targets exist yields none.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement** — for files named `CLAUDE.md`, every line matching `^@(\S+)$` outside fences must resolve relative to the file's directory; message `` import target does not exist: <path> ``.
- [ ] **Step 4: Verify** — tests pass; real repo shows no `import` hit.
- [ ] **Step 5: Commit** — `test(docs): check that CLAUDE.md imports resolve`.

**Phase 1 verify:** `node --test scripts/__tests__/check-ai-docs.spec.mjs` passes;
`npx eslint scripts/docs/check-ai-docs.mjs scripts/__tests__/check-ai-docs.spec.mjs` clean;
`time node scripts/docs/check-ai-docs.mjs` under 2s.

---

## Phase 2 — Palette check in `hardcoded-colors.mjs`

**Executor**: Opus 5 · low · Wave B

### Task 2.1: `palette-var` findings in component CSS

**Files:**
- Modify: `scripts/hardcoded-colors.mjs` (header comment, pattern, `processFile` loop)
- Test: `scripts/__tests__/hardcoded-colors.spec.mjs`

- [ ] **Step 1: Failing tests** (the `lint` helper first creates parent directories:
  `fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true })` before `writeFileSync`)

```js
describe('palette primitives in component CSS', () => {
  it('flags var(--palette-*) in a stylesheet', () => {
    const { status, issues } = lint({ 'button.css': ':host { color: var(--palette-blue-500); }\n' });
    assert.equal(status, 1);
    assert.deepEqual(issues, [{ file: 'button.css', line: 1, value: '--palette-blue-500' }]);
  });

  it('passes semantic tokens, comments and legacy stylesheets', () => {
    const { status, issues } = lint({
      'button.css': ':host { color: var(--color-text-primary); } /* var(--palette-blue-500) */\n',
      'legacy/old.css': ':host { color: var(--palette-blue-500); }\n',
    });
    assert.equal(status, 0);
    assert.deepEqual(issues, []);
  });
});
```

- [ ] **Step 2: Run** — `node --test scripts/__tests__/hardcoded-colors.spec.mjs`; expect the first to fail.

- [ ] **Step 3: Implement**

```js
// AGENTS.md rule 5: component CSS references component/semantic tokens, never palette primitives.
// `legacy/` predates the rule and is excluded from the build.
const RE_PALETTE_VAR = () => /\bvar\(\s*(--palette-[\w-]+)/g;
```

In `processFile`, after the named-colour block, inside the per-line loop:

```js
if (isCss && !filePath.split(path.sep).includes('legacy')) {
  const re = RE_PALETTE_VAR();
  let m;
  while ((m = re.exec(line)) !== null) {
    addResult('palette-var', 'error', m.index, m[1]);
  }
}
```

Check how the summary prints `type` and add `palette-var` wherever types are enumerated
(`rg -n "'named-color'" scripts/hardcoded-colors.mjs`). Update the header comment.

- [ ] **Step 4: Verify** — spec passes; `node scripts/hardcoded-colors.mjs --no-color` still prints
  `✔ No hardcoded colors detected.` (baseline: 0 `var(--palette-` in non-legacy `src/**/*.css`).

- [ ] **Step 5: Document, then commit** — first update `AGENTS.md` rule 5 and `_agents/anti-patterns.md:15-16` to name the check
  (`yarn lint.colors`) ; then commit `build(lint): fail on palette primitives referenced from component CSS` with those docs.

---

## Phase 3 — Doc fixes (graded by the Phase 1 rules)

**Executor**: Sonnet 5 · medium · Wave C · implementer

Worker brief: one commit per task; no `src/**` code; every task verify includes
`node scripts/docs/check-ai-docs.mjs`.

### Task 3.1: Delete `.specs/` (#1)

```derived
$ rg -n --hidden -g '!.git' -g '!node_modules' -g '!.claude/plans' -g '!.specs' '\.specs' .
scripts/tokens-lint.mjs:11: * Naming rule: compound keys are camelCase (`optionFontFamily`), per .specs/TOKEN-ARCHITECTURE.md …
scripts/docs/check-ai-docs.mjs:155:  return relPath.startsWith('.specs/');
scripts/__tests__/tokens-lint.spec.mjs:35:  it('accepts camelCase compound keys, as .specs/TOKEN-ARCHITECTURE.md §4 pr…
scripts/cleanup-ai-files.mjs:14:  '.specs/',
```

- [ ] `git rm -r .specs`.
- [ ] `scripts/tokens-lint.mjs:11` and `scripts/__tests__/tokens-lint.spec.mjs:35` cite `tokens/AGENTS.md` Critical Rule 3 ("camelCase in JSON"; replace its kebab-case example `padding-inline` with `paddingInline` in the same commit) instead.
- [ ] `scripts/docs/check-ai-docs.mjs:155` drops the `.specs/` branch (and any spec test that exercises it is removed with it).
- [ ] `scripts/cleanup-ai-files.mjs:14` drops `'.specs/'`.
- [ ] Verify: the `rg` above prints nothing; `node --test scripts/__tests__/tokens-lint.spec.mjs scripts/__tests__/check-ai-docs.spec.mjs` passes; `yarn lint` passes.
- [ ] Commit: `docs(agents): delete the unreferenced and drifted .specs tree`.

### Task 3.2: E2E audit sections (#2)

- [ ] Rewrite `.claude/skills/audit-component/SKILL.md` §2.10.2 and `.claude/agents/audit-production.md` §5b to what `src/components/_agents/e2e-testing.md` states: no browser test project exists (`vitest.config.mts` has only `spec`); with `--e2e`, the live checks run through the Playwright MCP against Storybook using that file's shadow-DOM patterns (hydration, prop reflection, `mud*` event dispatch, focus, form submission); without it, emit the INFO line. No `newE2EPage`, no `page.find`, no `spyOnEvent`, no `corChange`.
- [ ] Verify: `rg -n 'newE2EPage|page\.find|page\.spyOnEvent|corChange' .claude/skills/audit-component/SKILL.md .claude/agents/audit-production.md` prints nothing (`spyOnEvent` elsewhere is the live Vitest API and stays).
- [ ] Commit: `docs(agents): audit E2E behaviour the way the repo can actually run it`.

### Task 3.3: Style Dictionary, paths, slash commands (#3, #4, #5)

- [ ] Fix every `sd-version`, `path` and `agent-slash` hit from Phase 1:
  - SD: state the pinned major via "see `STACK.md`" or `(Style Dictionary 5)`.
  - `tokens/AGENTS.md:76` ("SD v4 derives CTI") → state what Style Dictionary 5 does, or drop the version.
  - Paths: `.storybook/main.ts` → `.storybook/main.mjs`; `src/components/index.ts` → drop it (only `src/index.ts` exists); `mud-input/mud-input.tsx` → `mud-text-input/mud-text-input.tsx` (confirm it exists); `shared.constants.ts` references → `src/legacy/shared.constants.ts` only where the text is about that file, otherwise remove the example; `codebase-snapshots.md:302` → `tokens/core/<category>.tokens.json`.
  - Slash: "the `<name>` agent" wording.
- [ ] Verify: `node scripts/docs/check-ai-docs.mjs | grep -E '\[(sd-version|path|agent-slash)\]'` prints nothing.
- [ ] Commit: `docs(agents): fix Style Dictionary versions, dead paths and agent invocations`.

### Task 3.4: Agent catalog, TESTING.md, React note, Record<> (#6, #7, #8, #9c)

- [ ] `.claude/agents/README.md`: all 11 agents in the table, grouped "Orchestrators / writers" and "Read-only verifiers", with `model` and whether it can write, read from each agent's frontmatter; `audit-production` described as 11 phases.
- [ ] `AGENTS.md` Project-Level Docs: add `TESTING.md` (coverage floor, mocking policy, what is and is not tested) — load when writing or reviewing tests.
- [ ] `README.md:160`: add a React 18 bullet before the React 19 one — React 18 sets every prop as a string attribute and does not bind `on*` handlers for custom events, so pass objects/arrays and listen to `mud*` events through a `ref`.
- [ ] `Record<>` demotion everywhere it is stated as a rule: `AGENTS.md:99`, `_agents/anti-patterns.md:29`, `_agents/typescript-strict.md:11,63,136`, `.claude/agents/custom-component.md:123`; verify with `rg -n 'Record<' AGENTS.md _agents .claude/agents` that no line calls it mandatory. In `_agents/typescript-strict.md` Rule 3: "SHOULD" instead of "MUST", with the reason (inference is sound for literal maps; the annotation documents intent for index lookups). (Rule 6's enforcement note is written in Task 4.1's commit, when the rule exists.)
- [ ] Verify: `node scripts/docs/check-ai-docs.mjs` → clean.
- [ ] Commit: `docs(agents): complete the agent catalog and index the testing policy`.

---

## Phase 4 — ESLint `consistent-type-imports`

**Executor**: Opus 5 · medium · Wave D

### Task 4.1: Enable and autofix

**Files:** Modify `eslint.config.mjs` (rules block of `files: ['**/*.{ts,tsx}']`, around line 59); the 25 files ESLint autofixes under `src/`, plus `src/components/mud-phone-input/mud-phone-input.types.ts` fixed by hand (its `noImportTypeAnnotations` violation has no autofix).

- [ ] **Step 1: Baseline the generated output with a temporary base fix (never committed)**

```bash
python3 - <<'PY'
p='src/components/mud-date-input/mud-date-input.tsx'; s=open(p).read()
a='<mud-icon name="asterisk" size={12} />'; assert s.count(a)==1
open(p,'w').write(s.replace(a,'<mud-icon name="asterisk" size={16} />'))
PY
yarn build >/dev/null && git ls-files src/components.d.ts 'src/components/*/readme.md' | xargs shasum > "$(git rev-parse --git-dir)/harness-gen-before.sha"
test -s "$(git rev-parse --git-dir)/harness-gen-before.sha" && wc -l < "$(git rev-parse --git-dir)/harness-gen-before.sha"
```

- [ ] **Step 2: Enable the rule**

```js
'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],
```

- [ ] **Step 3: Confirm it fails, then autofix**

Run: `npx eslint 'src/**/*.{ts,tsx}'` → 26 `consistent-type-imports` errors.
Run: `npx eslint --fix 'src/**/*.{ts,tsx}'` then `npx prettier --write` on the changed files.
Then fix `src/components/mud-phone-input/mud-phone-input.types.ts:44` by hand: add `import type { h } from '@stencil/core';` and write `ReturnType<typeof h>`. Re-run `npx eslint 'src/**/*.{ts,tsx}'` → no `consistent-type-imports` error.

- [ ] **Step 4: Verify behaviour is unchanged**

```bash
yarn build >/dev/null && git ls-files src/components.d.ts 'src/components/*/readme.md' | xargs shasum > "$(git rev-parse --git-dir)/harness-gen-after.sha"
test -s "$(git rev-parse --git-dir)/harness-gen-before.sha" && diff "$(git rev-parse --git-dir)/harness-gen-before.sha" "$(git rev-parse --git-dir)/harness-gen-after.sha" && echo "generated output identical"
yarn test && WIREIT_CACHE=none yarn lint
rg -c 'eslint-disable.*consistent-type-imports' src
```

Expected: `generated output identical`; tests and lint pass; the `rg` prints nothing.

- [ ] **Step 5: Revert the temporary base fix and any generated drift, then check typecheck**

```bash
python3 - <<'PY'
p='src/components/mud-date-input/mud-date-input.tsx'; s=open(p).read()
a='<mud-icon name="asterisk" size={16} />'; assert s.count(a)==1
open(p,'w').write(s.replace(a,'<mud-icon name="asterisk" size={12} />'))
PY
git ls-files src/components.d.ts 'src/components/*/readme.md' | xargs git checkout --
yarn typecheck 2>&1 | grep -c 'error TS'   # expect 1 (the base defect)
git diff --stat -- src/components/mud-date-input/mud-date-input.tsx  # only autofix hunks, if any
```

- [ ] **Step 5b: Document the rule** — `_agents/typescript-strict.md` Rule 6 gains one line: imports are enforced by `@typescript-eslint/consistent-type-imports`; `export type` stays a convention.

- [ ] **Step 6: Guard, then commit.** First `rg -c 'name="asterisk" size=\{16\}' src/components/mud-date-input/mud-date-input.tsx` must print nothing (the temporary base fix is gone); if it prints a count, stop and re-run Step 5. Then commit `build(lint): require type-only imports and apply the autofix`, staging
  `eslint.config.mjs`, `_agents/typescript-strict.md` and the files `git diff --name-only -- src` lists (each reviewed).

---

## Phase 5 — Hybrid `CLAUDE.md`

**Executor**: Opus 5 · medium · Wave E

### Task 5.1: Import the always-active workflow rules (C1)

- [ ] Root `CLAUDE.md` becomes:

```markdown
@AGENTS.md
@_agents/workflow-rules.md
```

- [ ] `AGENTS.md:27` "When to Load" for `_agents/workflow-rules.md`: "At conversation start (Claude Code loads it through `CLAUDE.md`; other agents read it first)".
- [ ] Verify: `node scripts/docs/check-ai-docs.mjs | grep '\[import\]'` prints nothing (the import resolves); then, as a secondary check, a headless session, no tools (`claude -p … --model haiku --disallowedTools "Bash,Read,Grep,Glob,Edit,Write,WebFetch,Task,Agent"`): asked to quote the H1 of `_agents/workflow-rules.md` from memory, it quotes it.
- [ ] Commit: `docs(agents): load the always-active workflow rules in Claude Code`.

### Task 5.2: Move Claude-only content to `CLAUDE.md` (C3)

- [ ] In `AGENTS.md`, mark index rows that only a Claude Code session can act on — `_agents/skills-and-workflows.md`, `_agents/mcp-tools.md`, the `pixel-perfect` skill row — with "(Claude Code)" in their When-to-Load cell, and reword the Figma-First exception (line 17) to the tool-neutral "build it as a custom component from the stated requirements", keeping the agent name only in `CLAUDE.md`.
- [ ] Move from `AGENTS.md` to `CLAUDE.md` (after the imports, under `## Claude Code`): the MCP servers line (tool prefixes `mcp__*`) and the "Automation — Slash Commands & Subagents" section. `AGENTS.md` keeps a one-line pointer: "Assistant-specific automation (Claude Code commands, subagents, skills, MCP servers) is described in `CLAUDE.md`."
- [ ] Inbound references to the moved section: `rg -n 'Automation — Slash Commands' -g '!.claude/plans' .` — update each.
- [ ] Verify: headless session quotes a sentence from the moved section; `wc -c AGENTS.md src/components/AGENTS.md tokens/AGENTS.md | tail -1` is below 26458; `node scripts/docs/check-ai-docs.mjs` clean.
- [ ] Commit: `docs(agents): keep AGENTS.md tool-agnostic and move Claude automation to CLAUDE.md`.

---

## Phase 6 — Split `audit-component/SKILL.md` (#11)

**Executor**: Sonnet 5 · medium · Wave F · implementer

- [ ] Move Wave 2 (§2.1–§2.10), Layer 2 (§BX/§CX/§DX) and the Final Report template into `references/wave-2-static-analysis.md`, `references/layer-2-browser-checklists.md`, `references/report-template.md`, each with a scope banner. `SKILL.md` keeps Architecture, Inputs, When to invoke, Execution Model, Fast Path, Wave 1, Wave 3 and a "Load when" table for the three references.
- [ ] Inbound references (13 today: `rg -n 'audit-component/SKILL\.md' -g '!.claude/plans' .`) that cite a moved section by name point to the new file.
- [ ] Verify: each new reference file is linked from `SKILL.md` as a relative Markdown link; `wc -l .claude/skills/audit-component/SKILL.md` ≤ 500; `node scripts/docs/check-ai-docs.mjs` clean; every `###` heading that existed before exists in exactly one of the four files (`grep -h '^###' …` before/after, sorted, diff empty).
- [ ] Commit: `docs(skills): split audit-component into a router and on-demand references`.

---

## Phase 7 — DX scan (scripts first)

**Executor**: Opus 5 · high · Wave G

- [ ] Inventory recurring manual checks in `.claude/commands/*.md`, `.claude/agents/*.md`,
  `.claude/skills/*/SKILL.md` and `_agents/*.md` that a model is told to perform but a deterministic
  script could decide (grep counts, file existence, frontmatter shape, token names, story coverage).
- [ ] For each candidate record: where it is asked today (file:line), what a script would parse, run
  cost, and whether an existing script (`scripts/audit/*`, `tokens-*`, `hardcoded-colors`) already
  covers it.
- [ ] Implement candidates that are (a) bounded to a grammar the repo owns, (b) a new or extended
  `.mjs` script with a spec, and (c) need no new dependency or CI/tooling config beyond a
  `package.json` script. Candidates needing a tooling decision are listed for Dan, not built.
- [ ] Verify each built candidate the same way as Phase 1 (failing spec first, real-repo run, timing).
- [ ] Commit per candidate.

---

## Self-refute log

1. **Does the fix reuse the defect's own mechanism?** The defect is prose that nothing checks.
   Instance: #2 (E2E audit sections), #7 (`TESTING.md` index row), #8 (React note) and the
   `Record<>` demotion are prose fixes with no ratchet. Accepted and stated under "Not verified by
   this plan"; every other finding (#3, #4, #5, #6, #9 palette, #9 type imports, #1's inbound
   references) is graded by a script or lint rule this plan adds before the fix.
2. **Can a rule's letter be met with its intent violated?**
   - ESLint: an `eslint-disable` comment silences `consistent-type-imports`. Fix: Task 4.1 Step 4
     also runs `rg -c 'eslint-disable.*consistent-type-imports' src` and expects no output.
   - Phase 6: ≤ 500 lines is met by moving text into references nothing links. Fix: Phase 6 verify
     requires each new reference to be linked from `SKILL.md` (the `link` rule then proves it
     resolves) and the heading diff to be empty.
   - `path` rule: wrapping a dead path in `<…>` makes it a skipped placeholder. No instance planned;
     the rule's placeholder set is authored once in `PATH_PLACEHOLDER`, so a reviewer sees it.
   - `agent-catalog`: a name mentioned anywhere in the README passes without a table row. Accepted:
     Task 3.4 rebuilds the table from frontmatter; the rule guards omission, not layout.
3. **Numbers with a denominator and an instrument outside what they grade?** 26 → 0 violations,
   877 → ≤ 500 lines and 26458 bytes are in the Acceptance bar's `derived` fence; the eight `path`
   hits in Task 1.2's. The `sd-version` expected list comes from `rg -n 'Style Dictionary v?4'`
   run 2026-09-16 over the same files. "Under 2s" for the checker rests on `yarn docs:check`
   measured at 1.3s on 2026-09-16, not on a fence — Phase 1 verify re-times it.
4. **Do two of the plan's rules interact into an unintended pass?**
   - Task 4.1 restores generated files to `HEAD` (Step 5) after comparing two builds; both builds
     carry the same temporary base fix, so the comparison isolates the autofix. No instance.
   - Phase 5 moves the Automation section into `CLAUDE.md`, which `isIndexFile` puts in doc scope,
     so `agent-slash` and `link` grade the moved text. That is intended; no escape.
   - Phase 3.1 removes the `.specs/` branch from `check-ai-docs.mjs` after Phase 1 edited the same
     file. Sequential waves; no instance.

## Final verification

- [ ] The Acceptance bar, every row: run each zero-tolerance command, and re-run each numeric row's Instrument, recording the command and its output in a `derived id=after` fence appended to this plan; each after-value must meet its Target.
- [ ] `git diff --stat 2248eb4..HEAD` lists only files named in this plan plus Phase 4's autofixed
  `src/` files and Phase 7's declared candidates.

## Not verified by this plan

- `yarn build`, full `test:scripts` and the pre-push hook on the committed tree: blocked by the
  #80×#81 `size={12}` base defect (Phase 4 uses a temporary, uncommitted fix only to compare
  generated output).
- How often a model reads on-demand `_agents/` files in practice.
- Codex, Cursor, Copilot and Gemini were not run against the result; the cross-tool claims rest on
  their vendor documentation.
