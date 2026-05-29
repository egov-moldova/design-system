#!/usr/bin/env node
/**
 * Fixture-driven test runner for `02-stencil-antipatterns.mjs`.
 *
 * Walks `scripts/audit/__fixtures__/<rule-slug>/{positive,negative}/` and
 * asserts that each rule fires on positives and stays silent on negatives.
 *
 * Auto-detects fixture kind from extension:
 *   - .tsx               → kind = 'tsx'
 *   - .css               → kind = 'css'
 *   - .providers.ts      → kind = 'providers'
 *   - .ts (other)        → kind = 'ts' (not yet scanned by 02; treated as 'tsx')
 *
 * Rule-slug → code lookup is built from PATTERNS + FILE_CHECKS at runtime so
 * adding a new rule + fixture folder requires no test code change.
 *
 * Run: `node scripts/audit/__tests__/02-antipatterns.test.mjs`
 * Exits 0 on success, 1 on any assertion failure.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';

import { PATTERNS, FILE_CHECKS, scanFile } from '../02-stencil-antipatterns.mjs';

const FIXTURES_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '__fixtures__');

// Build a slug → code lookup. The slug is the lowercase code minus the
// `ANTIPATTERN-` prefix, with `-` separators preserved.
function codeToSlug(code) {
  return code.replace(/^ANTIPATTERN-/, '').toLowerCase();
}
const SLUG_TO_CODE = new Map();
for (const p of PATTERNS) SLUG_TO_CODE.set(codeToSlug(p.code), p.code);
for (const c of FILE_CHECKS) SLUG_TO_CODE.set(codeToSlug(c.code), c.code);

function kindFromFilename(name) {
  if (name.endsWith('.tsx')) return 'tsx';
  if (name.endsWith('.css')) return 'css';
  if (name.endsWith('.providers.ts')) return 'providers';
  return null;
}

function listDir(dir) {
  try {
    return readdirSync(dir).filter(n => statSync(path.join(dir, n)).isFile());
  } catch {
    return [];
  }
}

function scanFixture(absPath) {
  const kind = kindFromFilename(path.basename(absPath));
  if (!kind) return null;
  const content = readFileSync(absPath, 'utf8');
  const rel = path
    .relative(path.resolve(FIXTURES_ROOT, '..', '..', '..'), absPath)
    .split(path.sep)
    .join('/');
  return scanFile({ kind, path: absPath, rel, content }, 'mud-fixture');
}

let passed = 0;
let failed = 0;
const failures = [];

function recordPass(msg) {
  passed++;
  process.stdout.write(`  [32mok[0m ${msg}\n`);
}
function recordFail(msg, error) {
  failed++;
  failures.push({ msg, error });
  process.stdout.write(`  [31mFAIL[0m ${msg}\n      ${error.message}\n`);
}

const ruleDirs = readdirSync(FIXTURES_ROOT).filter(n => {
  try {
    return statSync(path.join(FIXTURES_ROOT, n)).isDirectory();
  } catch {
    return false;
  }
});

for (const slug of ruleDirs) {
  const expectedCode = SLUG_TO_CODE.get(slug);
  if (!expectedCode) {
    process.stdout.write(`\n[33mskip[0m ${slug} — no matching rule registered (orphan fixture folder?)\n`);
    continue;
  }
  process.stdout.write(`\n${slug} → ${expectedCode}\n`);

  const positiveDir = path.join(FIXTURES_ROOT, slug, 'positive');
  for (const file of listDir(positiveDir)) {
    const absPath = path.join(positiveDir, file);
    const findings = scanFixture(absPath);
    if (findings === null) {
      recordFail(`positive/${file}`, new Error(`unsupported file extension`));
      continue;
    }
    try {
      const matching = findings.filter(f => f.code === expectedCode);
      assert.ok(
        matching.length > 0,
        `expected ${expectedCode} to fire, but it did not. Other findings: ${findings.map(f => f.code).join(', ') || '(none)'}`,
      );
      recordPass(`positive/${file} fires ${expectedCode}`);
    } catch (e) {
      recordFail(`positive/${file}`, e);
    }
  }

  const negativeDir = path.join(FIXTURES_ROOT, slug, 'negative');
  for (const file of listDir(negativeDir)) {
    const absPath = path.join(negativeDir, file);
    const findings = scanFixture(absPath);
    if (findings === null) {
      recordFail(`negative/${file}`, new Error(`unsupported file extension`));
      continue;
    }
    try {
      const matching = findings.filter(f => f.code === expectedCode);
      assert.equal(
        matching.length,
        0,
        `expected ${expectedCode} NOT to fire, but it fired on line(s): ${matching.map(f => f.line ?? '?').join(', ')}`,
      );
      recordPass(`negative/${file} silent on ${expectedCode}`);
    } catch (e) {
      recordFail(`negative/${file}`, e);
    }
  }
}

process.stdout.write(`\n${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.stdout.write('\nFailures:\n');
  for (const { msg, error } of failures) {
    process.stdout.write(`  • ${msg}: ${error.message}\n`);
  }
  process.exit(1);
}
process.exit(0);
