#!/usr/bin/env node
/**
 * seeded-defects.mjs — Phase 6 proof (plan `2026-09-21-audit-component-depths.md`
 * Acceptance bar § Tolerances, "Seeded defects").
 *
 * Proves, against a component that passes `yarn audit:component <c> --depth standard`
 * today (default `mud-banner`), that a defect on each of the four layers the
 * verdict distinguishes surfaces in `audit/<component>/fix-brief.md` in its
 * state's shape, and that the fix-brief entry's own `verify:` command exits
 * non-zero with the defect present and zero once it is reverted:
 *
 *   1. static      — an @Event() field without the `mud` prefix
 *                    (ANTIPATTERN-025-EVENT-PREFIX, Wave A / 02)
 *   2. browser     — a focus ring removed from a focusable control
 *                    (A11Y-BX3-FOCUS-RING-INVISIBLE, Wave C / 09)
 *   3. Figma       — a CSS value that no longer matches the committed manifest
 *                    (STYLE-MISMATCH, Wave C / 15)
 *   4. INCOMPLETE  — a required row's own prerequisite fails to build
 *                    (test-coverage / 06, missing-prereq)
 *
 * Mechanics: never touches the caller's working tree. Everything happens in a
 * detached `git worktree` under `os.tmpdir()`, torn down at the end (also on
 * failure). Each defect is applied and reverted one at a time, so runs never
 * overlap. `node_modules` is symlinked from the real repo (nothing is
 * installed); this worktree's `.audit-figma/<component>` Figma reference PNGs
 * are copied in (not symlinked — a run must never write back into the real
 * repo's cache) so 11-pixel-diff's PIXEL-NO-REFERENCE does not contaminate an
 * unrelated row. Storybook is this worktree's own (`.audit-storybook.json`,
 * `lib/storybook-helpers.mjs`) and its process is killed on exit.
 *
 * Usage:
 *   node scripts/audit/seeded-defects.mjs [--component mud-banner] [--depth standard] [--json] [--keep-worktree]
 *
 * Exit: 0 only when 4/4 defects surface in their state's shape AND their
 * verify command flips non-zero → zero across the revert. 1 otherwise.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { cpSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib/component-paths.mjs';

const TOOL = 'seeded-defects';

// ─── Pure helpers (parse a verify command, match a verdict entry, check the
// brief carries it) — exported for the unit spec, no I/O. ──────────────────

/**
 * Split a `verify:` command (always `node <relative path> [...args]` — every
 * command `verdict.mjs` writes is built by `verifyCommand()` in
 * `scripts/audit/verdict.mjs`, which never quotes an argument) into the argv
 * to hand `spawnSync(process.execPath, args, { cwd })`. Pure.
 */
export function parseVerifyCommand(command) {
  if (typeof command !== 'string' || !command.trim()) {
    throw new Error(`seeded-defects: empty verify command`);
  }
  const parts = command.trim().split(/\s+/);
  if (parts[0] !== 'node') {
    throw new Error(`seeded-defects: unsupported verify command (expected to start with "node"): ${command}`);
  }
  return { args: parts.slice(1) };
}

/**
 * Find the one entry in a computed verdict matching every given field
 * (`kind`, `code`, and/or a substring of `check`). `null` when nothing
 * matches — a defect's caller decides what that means. Pure.
 */
export function findMatchingEntry(verdict, { kind, code, checkIncludes } = {}) {
  const entries = verdict?.entries ?? [];
  return (
    entries.find(e => {
      if (kind && e.kind !== kind) return false;
      if (code && e.code !== code) return false;
      if (checkIncludes && !String(e.check ?? '').includes(checkIncludes)) return false;
      return true;
    }) ?? null
  );
}

/** Whether `fix-brief.md`'s text carries the entry's own block. Pure. */
export function briefContainsEntry(briefText, entry) {
  if (!entry || typeof briefText !== 'string') return false;
  if (!briefText.includes(`### ${entry.id} ·`)) return false;
  return entry.code ? briefText.includes(entry.code) : true;
}

// ─── The four defects ───────────────────────────────────────────────────

function replaceOnce(source, anchor, replacement, label) {
  if (!source.includes(anchor)) throw new Error(`seeded-defects: ${label} anchor not found`);
  const out = source.replace(anchor, replacement);
  if (out === source) throw new Error(`seeded-defects: ${label} mutation changed nothing`);
  return out;
}

const DEFECTS = [
  {
    id: 'static',
    layer: 'static (Wave A)',
    file: c => `src/components/${c}/${c}.tsx`,
    mutate: source => {
      const anchor = `  @Event() mudDismiss!: EventEmitter<void>;\n`;
      const injected = `${anchor}\n  /**\n   * Scratch event added for seeded-defect testing (static layer).\n   */\n  @Event()\n  badEvent!: EventEmitter<void>;\n`;
      return replaceOnce(source, anchor, injected, 'static');
    },
    findEntry: verdict => findMatchingEntry(verdict, { kind: 'FAIL', code: 'ANTIPATTERN-025-EVENT-PREFIX' }),
  },
  {
    id: 'browser',
    layer: 'browser (Wave C)',
    file: c => `src/components/${c}/${c}.css`,
    mutate: source => {
      const anchor =
        `.close:focus-visible,\n.link:focus-visible {\n  outline: none;\n  box-shadow:\n` +
        `    0 0 0 var(--focus-ring-width-inner) var(--focus-ring-color-inner),\n` +
        `    0 0 0 calc(var(--focus-ring-width-inner) + var(--focus-ring-width-outer)) var(--focus-ring-color-outer);\n` +
        `  position: relative;\n  z-index: 1;\n}`;
      const replacement =
        `.close:focus-visible {\n  outline: none;\n}\n\n.link:focus-visible {\n  outline: none;\n  box-shadow:\n` +
        `    0 0 0 var(--focus-ring-width-inner) var(--focus-ring-color-inner),\n` +
        `    0 0 0 calc(var(--focus-ring-width-inner) + var(--focus-ring-width-outer)) var(--focus-ring-color-outer);\n` +
        `  position: relative;\n  z-index: 1;\n}`;
      return replaceOnce(source, anchor, replacement, 'browser');
    },
    findEntry: verdict => findMatchingEntry(verdict, { kind: 'FAIL', code: 'A11Y-BX3-FOCUS-RING-INVISIBLE' }),
  },
  {
    id: 'figma',
    layer: 'Figma (Wave C)',
    file: c => `src/components/${c}/${c}.css`,
    mutate: source => {
      const anchor = `:host([emphasis='subtle'][variant='info']) {\n  background: var(--banner-info-subtle-background);\n  color: var(--banner-info-subtle-text);\n}`;
      const replacement = `:host([emphasis='subtle'][variant='info']) {\n  background: #ffffff;\n  color: var(--banner-info-subtle-text);\n}`;
      return replaceOnce(source, anchor, replacement, 'figma');
    },
    findEntry: verdict => findMatchingEntry(verdict, { kind: 'FAIL', code: 'STYLE-MISMATCH' }),
  },
  {
    id: 'incomplete',
    layer: 'INCOMPLETE (removed prerequisite)',
    file: c => `src/components/${c}/test/${c}.spec.tsx`,
    mutate: (source, c) => {
      const anchor = `describe('${c}', () => {\n`;
      const injected = `${anchor}  it('seeded-defect: prerequisite broken', () => {\n    throw new Error('seeded-defect: prerequisite broken');\n  });\n\n`;
      return replaceOnce(source, anchor, injected, 'incomplete');
    },
    findEntry: verdict => findMatchingEntry(verdict, { kind: 'INCOMPLETE', checkIncludes: '06' }),
  },
];

// ─── Worktree mechanics ────────────────────────────────────────────────

function run(args, cwd) {
  const res = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function git(args, cwd) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function createWorktree() {
  git(['worktree', 'prune'], REPO_ROOT);
  const tmpDir = mkdtempSync(join(os.tmpdir(), 'seeded-defects-'));
  rmSync(tmpDir, { recursive: true, force: true }); // `worktree add` must create the dir itself
  const res = git(['worktree', 'add', '--detach', tmpDir, 'HEAD'], REPO_ROOT);
  if (res.status !== 0) {
    throw new Error(`seeded-defects: git worktree add failed: ${res.stderr || res.stdout}`);
  }
  symlinkSync(join(REPO_ROOT, 'node_modules'), join(tmpDir, 'node_modules'), 'dir');
  return tmpDir;
}

/** Copy (never symlink — a run must not write back into the real cache) this
 * component's Figma reference PNGs so 11-pixel-diff's PIXEL-NO-REFERENCE
 * never fires as an unrelated finding on top of the seeded one. Best-effort:
 * absent in the real repo (no prior fetch) just means 11 stays uncovered. */
function seedFigmaCache(tmpDir, component) {
  const src = join(REPO_ROOT, '.audit-figma', component);
  if (!existsSync(src)) return false;
  mkdirSync(join(tmpDir, '.audit-figma'), { recursive: true });
  cpSync(src, join(tmpDir, '.audit-figma', component), { recursive: true });
  return true;
}

function stopStorybook(tmpDir) {
  const recordPath = join(tmpDir, '.audit-storybook.json');
  if (!existsSync(recordPath)) return;
  let record;
  try {
    record = JSON.parse(readFileSync(recordPath, 'utf8'));
  } catch {
    return;
  }
  if (!record?.pid) return;
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    try {
      process.kill(record.pid, signal);
    } catch {
      // already dead
    }
  }
}

function removeWorktree(tmpDir) {
  git(['worktree', 'remove', '--force', tmpDir], REPO_ROOT);
  rmSync(tmpDir, { recursive: true, force: true });
  git(['worktree', 'prune'], REPO_ROOT);
}

// ─── One defect ──────────────────────────────────────────────────────────

function runDefect(defect, { tmpDir, component, depth }) {
  const relPath = defect.file(component);
  const filePath = join(tmpDir, relPath);
  const original = readFileSync(filePath, 'utf8');
  let mutated;
  try {
    mutated = defect.mutate(original, component);
  } catch (err) {
    return { id: defect.id, layer: defect.layer, file: relPath, ok: false, error: err.message };
  }

  const result = {
    id: defect.id,
    layer: defect.layer,
    file: relPath,
    verdictState: null,
    entryId: null,
    verifyCommand: null,
    exitBefore: null,
    exitAfter: null,
    surfacedInBrief: false,
    ok: false,
    error: null,
  };

  try {
    writeFileSync(filePath, mutated);

    const full = run(['scripts/audit/verdict.mjs', component, '--depth', depth], tmpDir);
    const verdictPath = join(tmpDir, 'audit', component, 'verdict.json');
    const briefPath = join(tmpDir, 'audit', component, 'fix-brief.md');
    if (!existsSync(verdictPath)) {
      result.error = `no verdict.json written (verdict.mjs exited ${full.status}): ${full.stderr.slice(-500)}`;
      return result;
    }
    const verdict = JSON.parse(readFileSync(verdictPath, 'utf8'));
    const brief = existsSync(briefPath) ? readFileSync(briefPath, 'utf8') : '';
    result.verdictState = verdict.headline ?? verdict.state;

    const entry = defect.findEntry(verdict);
    if (!entry) {
      result.error = `no matching entry in verdict.json entries (state ${verdict.state})`;
      return result;
    }
    result.entryId = entry.id;
    result.verifyCommand = entry.verify;
    result.surfacedInBrief = briefContainsEntry(brief, entry);

    const { args } = parseVerifyCommand(entry.verify);
    result.exitBefore = run(args, tmpDir).status;

    writeFileSync(filePath, original);
    result.exitAfter = run(args, tmpDir).status;

    result.ok =
      result.surfacedInBrief && result.exitBefore !== 0 && result.exitBefore !== null && result.exitAfter === 0;
    if (!result.ok && !result.error) {
      result.error = !result.surfacedInBrief
        ? 'entry matched but did not surface in fix-brief.md'
        : `verify command did not flip: before=${result.exitBefore} after=${result.exitAfter}`;
    }
    return result;
  } finally {
    // Always leave the file as found, even on an unexpected throw above.
    const current = readFileSync(filePath, 'utf8');
    if (current !== original) writeFileSync(filePath, original);
  }
}

// ─── Report ────────────────────────────────────────────────────────────

function printTable(results) {
  const header = ['layer', 'file', 'verdict', 'entry', 'exit before', 'exit after', 'result'];
  const rows = results.map(r => [
    r.layer,
    r.file,
    r.verdictState ?? 'n/a',
    r.entryId ?? 'none',
    String(r.exitBefore),
    String(r.exitAfter),
    r.ok ? 'PASS' : `FAIL${r.error ? ` — ${r.error}` : ''}`,
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
  const line = cells => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  process.stdout.write(`${line(header)}\n`);
  process.stdout.write(`${widths.map(w => '-'.repeat(w)).join('  ')}\n`);
  for (const r of rows) process.stdout.write(`${line(r)}\n`);
  process.stdout.write('\nverify commands:\n');
  for (const r of results) process.stdout.write(`  ${r.id}: ${r.verifyCommand ?? '(none — entry not found)'}\n`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────

const USAGE = `Usage: node scripts/audit/seeded-defects.mjs [--component mud-banner] [--depth standard] [--json] [--keep-worktree]

Seeds one defect per layer (static, browser, Figma, INCOMPLETE) in a detached
git worktree, proves each surfaces in audit/<component>/fix-brief.md in its
state's shape with a verify: command that flips non-zero -> zero across the
revert, then tears the worktree down. Exit 0 only on 4/4.`;

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const json = argv.includes('--json');
  const keepWorktree = argv.includes('--keep-worktree');
  const componentIdx = argv.indexOf('--component');
  const component = componentIdx >= 0 ? argv[componentIdx + 1] : 'mud-banner';
  const depthIdx = argv.indexOf('--depth');
  const depth = depthIdx >= 0 ? argv[depthIdx + 1] : 'standard';

  let tmpDir = null;
  try {
    tmpDir = createWorktree();
    const seededFigma = seedFigmaCache(tmpDir, component);
    if (!json) {
      process.stdout.write(`${TOOL}: worktree ${tmpDir}\n`);
      process.stdout.write(
        `${TOOL}: figma reference cache ${seededFigma ? 'seeded' : 'not found in the real repo — 11 may be uncovered'}\n`,
      );
    }

    const results = [];
    for (const defect of DEFECTS) {
      if (!json) process.stdout.write(`${TOOL}: seeding ${defect.id}...\n`);
      results.push(runDefect(defect, { tmpDir, component, depth }));
    }

    const passCount = results.filter(r => r.ok).length;
    const exitCode = passCount === DEFECTS.length ? 0 : 1;

    if (json) {
      process.stdout.write(
        `${JSON.stringify({ component, depth, results, passCount, total: DEFECTS.length }, null, 2)}\n`,
      );
    } else {
      printTable(results);
      process.stdout.write(`\n${passCount}/${DEFECTS.length} seeded defects held.\n`);
    }
    return exitCode;
  } finally {
    if (tmpDir) {
      stopStorybook(tmpDir);
      if (keepWorktree) {
        process.stderr.write(`${TOOL}: --keep-worktree set, leaving ${tmpDir}\n`);
      } else {
        removeWorktree(tmpDir);
      }
    }
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main()
    .then(code => {
      process.exitCode = code;
    })
    .catch(err => {
      process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
      process.exitCode = 2;
    });
}

export { TOOL };
