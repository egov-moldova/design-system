import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  CliError,
  PROJECT_ROOT,
  createRunContext,
  extractScreen,
  main,
  parseCliOptions,
  readJsonWithContext,
  rewritePath,
  validateInputStructure,
} from '../sync-tokens-from-tokenhaus.mjs';

const fixturesDir = path.join(PROJECT_ROOT, 'scripts', '__fixtures__', 'sync-tokens');
const tempDirs = [];

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), 'utf8'));
}

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-tokenhaus-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('parseCliOptions', () => {
  it('resolves repo-relative paths and flags', () => {
    const result = parseCliOptions([
      'node',
      'sync-tokens-from-tokenhaus.mjs',
      '--input',
      'tokens-tokenhaus.json',
      '--output',
      'tokens/figma-export',
      '--dry-run',
      '--report',
      'reports/sync-tokenhaus.json',
      '--strict',
    ]);

    assert.equal(result.shouldExit, false);
    assert.equal(result.inputFile, path.join(PROJECT_ROOT, 'tokens-tokenhaus.json'));
    assert.equal(result.outputBase, path.join(PROJECT_ROOT, 'tokens', 'figma-export'));
    assert.equal(result.reportFile, path.join(PROJECT_ROOT, 'reports', 'sync-tokenhaus.json'));
    assert.equal(result.dryRun, true);
    assert.equal(result.strict, true);
  });
});

describe('readJsonWithContext', () => {
  it('surfaces line and column details for malformed JSON', () => {
    const malformedPath = path.join(fixturesDir, 'malformed.json');

    assert.throws(
      () => readJsonWithContext(malformedPath),
      error => error instanceof CliError && /line\s+\d+, column\s+\d+/i.test(error.message),
    );
  });
});

describe('validateInputStructure', () => {
  it('fails fast when required top-level sections are missing', () => {
    const fixture = readFixture('missing-top-level.json');

    assert.throws(
      () => validateInputStructure(fixture),
      error => error instanceof CliError && error.message.includes('Color tokens'),
    );
  });
});

describe('extractScreen', () => {
  it('throws when a breakpoint mode is missing instead of emitting invalid dimensions', () => {
    const fixture = readFixture('partial-breakpoints.json');
    const ctx = createRunContext({ dryRun: true });

    assert.throws(() => extractScreen(fixture, ctx), /Missing mode "Mobile"/);
  });
});

describe('rewritePath', () => {
  it('tracks unresolved namespaces for strict-mode diagnostics', () => {
    const ctx = createRunContext({ dryRun: true });

    const rewritten = rewritePath('Core numbers.shadow.md', ctx);

    assert.equal(rewritten, 'Core numbers.shadow.md');
    assert.deepEqual(ctx.unresolvedReferences, ['Core numbers.shadow.md']);
  });
});

describe('main', () => {
  it('supports dry-run report generation without writing token output', async () => {
    const tempDir = createTempDir();
    const outputBase = path.join(tempDir, 'figma-export');
    const reportFile = path.join(tempDir, 'sync-report.json');

    const result = await main([
      'node',
      'sync-tokens-from-tokenhaus.mjs',
      '--input',
      path.join(PROJECT_ROOT, 'tokens-tokenhaus.json'),
      '--output',
      outputBase,
      '--dry-run',
      '--report',
      reportFile,
    ]);

    assert.equal(result.exitCode, 0);
    assert.equal(fs.existsSync(path.join(outputBase, 'core')), false);
    assert.equal(fs.existsSync(reportFile), true);

    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    assert.equal(report.dryRun, true);
    assert.ok(report.generatedCount >= 9);
    assert.ok(report.generated.some(entry => entry.relativePath.endsWith(path.join('core', 'color.tokens.json'))));
  });
});
