# Dev-path dist clobber — task card

## Request

> repara și calea de dezvoltare, unde `yarn test` încă face build dev peste dist

## The problem

A developer who runs `yarn build`, then `yarn check` (or `yarn test`, or `yarn test.watch`), then publishes by hand ships the same broken package that GitHub issue #1 reported: `dist/` reduced to `mud` and `types`, 81 source maps, a development runtime. The publish pipeline no longer goes through that path, and `yarn validate.package` catches it when run — but a manual publish bypasses the gate entirely, and nothing in the local loop tells the developer their `dist/` was replaced.

## Approach

`@stencil/vitest`'s `stencil-test` binary spawns `stencil build --dev` and then `npx vitest run <args>` (`node_modules/@stencil/vitest/dist/bin/stencil-test.js:611-618` for the build, `:251-256` for the run). In dev mode Stencil suppresses the dist targets. The source line is `setBooleanConfig(validatedConfig, "buildDist", "esm", !validatedConfig.devMode || !!validatedConfig.buildEs5)` (`node_modules/@stencil/core/compiler/stencil.js:275164`) — a disjunct plus a `--esm` CLI override, neither of which this repo sets, so here it reduces to `!devMode` and suppresses `dist/collection`, `dist/esm`, `dist/cjs`, `dist/index.js`, `dist/index.cjs.js` and `loader/`, and this repo's `sourceMap = isDevMode && !isWatchMode` (`stencil.config.ts:14`) adds 81 `.map` files. The publish pipeline was moved off this binary already; three paths still reach it and destroy a production `dist/`:

| Path | Command today |
|---|---|
| `yarn test` → `yarn check` → `check.verify` | `node scripts/check-test-stderr.mjs --project spec` → spawns `stencil-test` |
| `yarn test.watch` | `stencil-test --project spec --watch` |
| `node scripts/audit/06-test-coverage.mjs --run` | `yarn stencil-test --project spec --coverage` |

The `spec` Vitest project compiles components from source via `stencilVitestPlugin()` (`vitest.config.mts:80`), and `vitest-setup.ts:1-9` states no built bundle is needed. So the Stencil build in front of these runs buys nothing and costs the artifact.

**Mechanism:** point all three at Vitest directly.

| Caller | After |
|---|---|
| `scripts/check-test-stderr.mjs` | spawn `process.execPath` with Vitest's own `bin` entry, args `run <userArgs> --reporter=verbose` |
| `test.watch` | `vitest --project spec --watch` |
| `scripts/audit/06-test-coverage.mjs` | `spawnSync('yarn', ['vitest', 'run', '--project', 'spec', '--coverage'])` |

Two details the first draft got wrong. **Only the wrapper needs to resolve a file**, because it spawns `process.execPath` with a script argument. The other two invoke the binary by name, which already works — `package.json:78` runs bare `vitest --project spec --run` today; resolving by path everywhere would couple two more call sites to `nodeLinker: node-modules` for nothing.

**And it resolves through an exported surface, not a hand-built path.** `vitest/vitest.mjs` is not in the package's `exports`, but `vitest/package.json` is — so `createRequire(import.meta.url).resolve('vitest/package.json')` plus that manifest's `bin.vitest` field reaches the same file without reading into the package's private layout, works under any linker, and follows the package if it ever moves the file. The existing `stencil-test` resolution hand-builds `../node_modules/@stencil/vitest/dist/bin/stencil-test.js` precisely because that package exports nothing usable; Vitest does, so the workaround is not inherited.

**`--watch` is explicit, not implied.** Vitest defaults to watch only outside CI; under `CI=true` a bare `vitest` is a single run. Today's script passes `--watch`, and dropping it would let bar item 3 read satisfied while watch mode silently disappears in any CI context.

**Alternative rejected:** keep `stencil-test` and pass `--prod`. It stops the *dev* build but not the rebuild — `dist/` is still overwritten on every test run, now with a slower production build, and the result still is not the artifact CI publishes. It treats the symptom (which build) rather than the cause (a test step that builds at all).

**Second alternative rejected:** change nothing and rely on `yarn validate.package`. The gate sits on the publish pipeline; a developer running `yarn build`, then `yarn check`, then publishing by hand bypasses it entirely — which is the scenario that motivated this request.

**Withdrawn: a repo-wide string guard.** An earlier draft proposed `scripts/__tests__/no-stencil-test-callers.spec.mjs`, asserting no tracked file names the `stencil-test` binary. It fails three independent ways and is dropped rather than repaired: its own filename and body contain the needle so it cannot pass; its host suite `yarn test:scripts` already exits 1 on this tree (`scripts/__tests__/audit/14-component-contract.spec.mjs:375`), so a violation could not change the exit code; and it keys on one binary's *name* while the defect's class is a *behaviour* — `dx:stencil:once`, `build.watch`, `start` and `dev` all run `stencil build --dev` and would pass it cleanly.

The deeper reason it is dropped rather than replaced: it was a fortification the review loop asked for, not something this request or the defect needed. Generalising from one caller to three callers **of one binary** repeats, one level up, the same named-instance mistake that produced this follow-up. A structural assertion over `package.json` would be the right shape if a guard is wanted — but it is a separate piece of work, it needs the pre-existing red spec fixed first to be anything but inert, and nothing here is blocked on it. Bar item 1 stays a reader check, which is what it honestly is.

**Scope note:** the request names `yarn test`. All three paths above are the same defect through the same binary, and fixing only the named one leaves a developer running `yarn test.watch` with the identical broken `dist/`. Fixing one caller and leaving its siblings is what produced this follow-up in the first place.

## Acceptance bar

Reader-settleable:

1. No script or wireit entry in `package.json` invokes `stencil-test`, and no file under `scripts/` resolves or spawns that binary. This is a reader check consumed once, and says so; see the Approach section for why the guard that would have mechanised it was withdrawn rather than written.
2. `scripts/check-test-stderr.mjs` keeps every behaviour it has today: it captures combined stdout+stderr, fails on any `stderr | ` block or bare `[mud-*]` line, honours `SKIP_STDERR_CHECK=1`, forwards the child's exit code, and forwards SIGINT/SIGTERM.
3. `test.watch` still runs in watch mode; the coverage audit still requests coverage.
4. No change to `vitest.config.mts`, `vitest-setup.ts`, or any component source under `src/`. `src/components/_agents/testing.md` is documentation and is in scope for item 5; no `.ts`, `.tsx` or `.css` file is touched.
5. Every file below describes the command its path actually runs after this change. The check is **file-level accuracy**; the grep is a floor, not the whole of it — see the last row for why.

   `grep -rln "stencil-test" . | grep -v node_modules` returns **10** files today. Three are permitted to keep the string and must not be edited:

   - `yarn.lock` — the `bin` record for `@stencil/vitest`, which stays an installed dependency. Removing it would be false.
   - `.claude/plans/fix-published-package-build-implementation-plan.prompt.md` — a shipped record of earlier work. Rewriting history to satisfy a grep falsifies the record.
   - **this card** — an earlier draft counted 9 and omitted the artifact doing the counting. `.claude/plans/` is tracked (`git ls-files` lists 10 plans), so the card is in the grep's own output.

   The other seven are in scope:

   | File | What must be true after |
   |---|---|
   | `package.json` | 79 — `test.watch` names Vitest |
   | `scripts/check-test-stderr.mjs` | 3, 25, 32, 44, 51 — and **19-22**, which grep cannot see: that paragraph blames the ignored `DEP0190` noise on "`@stencil/vitest`'s own `spawn('npx', …, { shell: true })`" (`stencil-test.js:256`). Once this wrapper spawns Vitest directly, that spawn is gone and the paragraph documents a mechanism that no longer exists. It contains no `stencil-test` substring — which is why item 5 is file-level accuracy, not a grep result |
   | `scripts/audit/06-test-coverage.mjs` | 7, 11, 26, 49, 228, 230, 234 |
   | `AGENTS.md` | 5, 130 — and **128**, which is wrong on a second count: it claims `yarn test` "rebuilds Stencil + token bundle". `wireit.test` declares `command`, `files`, `output`, `packageLocks` and **no `dependencies`**, so it rebuilds neither |
   | `TESTING.md` | 43 — same false token claim ("rebuilds tokens + Stencil") |
   | `.claude/agents/test-writer.md` | 12 |
   | `src/components/_agents/testing.md` | 13, 14 — line 13 carries the same false token claim as `AGENTS.md:128` |

   One more file describes these commands and contains no `stencil-test` string at all, so no grep over that needle would ever surface it:

   | File | What must be true after |
   |---|---|
   | `_agents/environment-commands.md` | 120-131 documents `yarn test` as "Complete verification with token rebuild guarantee … includes token build dependency check via wireit"; `:166` calls it "Jest unit + Stencil E2E tests (with token rebuild)"; `:168` documents `yarn test.watch`. The token claim is false for the same reason, and "Jest" names a runner this repo does not install |

   **Four of these are already wrong before this change**, not one: `src/components/_agents/testing.md:14` says `yarn test.dev` runs `stencil-test`, false since this branch changed that script and missed this file when `AGENTS.md` and `TESTING.md` were corrected; and three token claims — `AGENTS.md:128`, `TESTING.md:43` and `src/components/_agents/testing.md:13` — false for as long as `wireit.test` has had no dependencies. An earlier draft of this card asserted only the first, and cited `testing.md:17` — a line that contains no `stencil-test` and is already accurate. That mis-citation inside the card's own rigor mechanism is the reason the grep is a floor rather than the check.

Shell-settleable — run by the caller, folded into `builtCheck`:

- `yarn test` exits 0 and reports a non-zero passing count with zero failures **in that same invocation**, and the same count before and after the change. `wireit.test` declares `files` and `output: []`, so an unchanged input set makes wireit report the script fresh and never spawn the wrapper at all — a dist-invariance check taken across a cache hit is vacuously green. The test count printed by the run is the evidence it actually executed; where that is in doubt, invoke `node scripts/check-test-stderr.mjs --project spec` directly, which bypasses wireit.
- `yarn test` leaves a production `dist/` byte-identical: `find dist loader -type f -exec shasum -a 256 {} + | sort` before and after, diffed. Hashing rather than listing paths, because a hash diff is strictly stronger and needs no argument about which files a given rebuild removes. (An earlier draft justified it by claiming a path-set diff would miss the regression — that was wrong on this repo's own facts: the Approach section above establishes that a dev build *deletes* `dist/collection`, `dist/esm`, `dist/cjs`, `dist/index.js` and `loader/`, which a path-set diff would scream about. The hash is the better instrument anyway; the reason given for it was not.)
- `node scripts/validate-package.mjs` still reports PASS after `yarn test` runs over a production build.
- The stderr detection still fires: a deliberately introduced unsilenced `console.warn` in a spec makes `yarn test` exit non-zero with the wrapper's own message.
- The coverage audit — one of the three callers this card changes — is **executed**, not merely read: `node scripts/audit/06-test-coverage.mjs mud-button --run` completes and reports a non-zero coverage number. Bar item 3 settles the other two callers by reading; this one cannot be, or a broken invocation ships unexecuted.
- `node --check` passes on both edited `.mjs` files. `tsc` and `eslint` are scoped to `src/`, which bar item 4 forbids touching, so neither can fail on this change — they are run for completeness, not as coverage of it.
- `npx tsc --noEmit -p tsconfig.json`, `npx eslint "src/**/*.{ts,tsx}" --max-warnings 0` and `npx prettier --check` on changed files all pass.

## Self-refute log

**1. Does the fix reuse the defect's own mechanism class?** The defect is a test step that silently rebuilds the artifact under test. `no instance` — the fix removes the build rather than redirecting it, and nothing here asks an actor to self-report. The inverse is paired: the acceptance bar requires a before/after `find` diff over `dist/`, which is the observation that would catch a rebuild returning by another route, and it requires the stderr detection to be seen firing rather than assumed intact.

**2. Can the rule's letter be met with its intent violated?** *Instance, and it is the reason this card exists.* The earlier change fixed `test.dev` alone; `yarn test`, `test.watch` and the coverage audit kept the old binary, so "the test step no longer rebuilds dist" was true of the script that was named and false of the class. Addressed by the Scope note: all three callers are in scope, and bar item 1 is written over the whole repository (`no file under scripts/` resolves the binary) rather than over the one file being edited, so a fourth caller added later fails the bar rather than passing it silently.

**3. Has every numeric target a denominator, a minimum n, and an instrument outside what it grades?** `no instance` — the bar sets no numeric target. An earlier draft asserted `1993` passing tests as an equality check. That number appears nowhere in the repo and was never produced by a command in this card's own evidence, and anyone adding a test would make a correct change read FAIL. Replaced by "non-zero, zero failures, unchanged across the edit", which serves the stated purpose — proving the run was not a wireit cache hit — with no constant to maintain. The dist-invariance check is a diff against the same tree's own prior state, which is an instrument outside the thing it grades.

**4. Do any two of the card's own rules interact into a pass nobody intended?** *Instance.* Bar item 2 requires the wrapper to keep failing on `stderr |` blocks, and bar item 1 removes `stencil-test`. Vitest's reporter framing is what produces those blocks, and `stencil-test` was passing `--reporter=verbose` through to Vitest — so a fix that satisfies item 1 by dropping the reporter flag would satisfy item 2's letter while making its detection unreachable, and every spec would pass. Closed by the bar's shell-settleable clause requiring the detection to be *observed* firing on a deliberately unsilenced warning, not merely present in the source.
