import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  APPLY_OUTPUT_BASE,
  CliError,
  MODE_DARK,
  MODE_LIGHT,
  ORPHAN_FILES_CORE,
  PROJECT_ROOT,
  cleanOrphanFiles,
  createRunContext,
  extractPalette,
  extractSemanticColors,
  extractSizes,
  extractTypography,
  main,
  parseCliOptions,
  readJsonWithContext,
  rewritePath,
  stripFigmaPrefix,
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

// ── CLI ───────────────────────────────────────────────────────────────────────

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
    assert.equal(result.apply, false);
  });

  it('forces outputBase to tokens/ when --apply is set', () => {
    const result = parseCliOptions([
      'node',
      'sync-tokens-from-tokenhaus.mjs',
      '--input',
      'tokens-tokenhaus.json',
      '--apply',
    ]);

    assert.equal(result.apply, true);
    assert.equal(result.outputBase, path.join(PROJECT_ROOT, APPLY_OUTPUT_BASE));
  });

  it('refuses --apply combined with a conflicting --output', () => {
    assert.throws(
      () =>
        parseCliOptions([
          'node',
          'sync-tokens-from-tokenhaus.mjs',
          '--input',
          'tokens-tokenhaus.json',
          '--apply',
          '--output',
          'tokens/figma-export',
        ]),
      error =>
        error instanceof CliError &&
        error.exitCode === 2 &&
        /forces output to tokens\//.test(error.message),
    );
  });
});

describe('readJsonWithContext', () => {
  it('wraps malformed JSON errors as CliError with file context', () => {
    const malformedPath = path.join(fixturesDir, 'malformed.json');

    assert.throws(
      () => readJsonWithContext(malformedPath),
      error =>
        error instanceof CliError &&
        error.message.includes('Invalid JSON in') &&
        error.message.includes('malformed.json'),
    );
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe('validateInputStructure', () => {
  it('fails fast when required top-level sections are missing', () => {
    const fixture = readFixture('missing-top-level.json');

    assert.throws(
      () => validateInputStructure(fixture),
      error =>
        error instanceof CliError && error.message.includes('2. Primitive Colors: Do not use directly'),
    );
  });

  it('returns an empty missing-optional list when the export is complete', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const result = validateInputStructure(fixture);
    assert.deepEqual(result.missingOptionalPaths, []);
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

describe('stripFigmaPrefix', () => {
  it('strips known Figma prefixes', () => {
    assert.equal(stripFigmaPrefix('fs-12'), '12');
    assert.equal(stripFigmaPrefix('lh-16'), '16');
    assert.equal(stripFigmaPrefix('fw-regular'), 'regular');
    assert.equal(stripFigmaPrefix('spacing-24'), '24');
    assert.equal(stripFigmaPrefix('radius-full'), 'full');
    assert.equal(stripFigmaPrefix('border-1,5'), '1,5');
  });

  it('leaves unknown keys untouched', () => {
    assert.equal(stripFigmaPrefix('primary-font'), 'primary-font');
    assert.equal(stripFigmaPrefix('something-else'), 'something-else');
  });
});

// ── Extractors ────────────────────────────────────────────────────────────────

describe('extractPalette', () => {
  it('extracts color ramps with numeric step keys', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractPalette(fixture, ctx);

    assert.ok(result.palette.gray);
    assert.ok(result.palette['blue-sky']);
    assert.equal(result.palette.gray['50'].value, '#f7f7f7');
    assert.equal(result.palette.gray['50'].type, 'color');
    assert.equal(result.palette['blue-sky']['600'].value, '#0058d2');
  });

  it('handles nested alpha sub-groups', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractPalette(fixture, ctx);

    assert.equal(result.palette.alpha.black['100-alpha'].value, '#1212120d');
    assert.equal(result.palette.alpha.gray['alpha-100'].value, '#44444408');
  });
});

describe('extractSemanticColors', () => {
  it('rewrites palette references for Light Mode', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractSemanticColors(fixture, MODE_LIGHT, ctx);

    assert.equal(result.color.background.base.default.value, '{palette.white.1000}');
    assert.equal(result.color.background.base['default-hover'].value, '{palette.gray.100}');
  });

  it('rewrites palette references for Dark Mode', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractSemanticColors(fixture, MODE_DARK, ctx);

    assert.equal(result.color.background.base.default.value, '{palette.gray.900}');
    assert.equal(result.color.background.base['default-hover'].value, '{palette.gray.800}');
  });

  it('rewrites alpha references through the nested namespace', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractSemanticColors(fixture, MODE_LIGHT, ctx);

    assert.equal(
      result.color.background.alpha['overlay-dark'].value,
      '{palette.alpha.black.100-alpha}',
    );
  });

  it('skips the hack section entirely', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractSemanticColors(fixture, MODE_LIGHT, ctx);

    assert.equal(result.color.hack, undefined);
    const hackFallback = ctx.fallbacks.find(f => f.kind === 'skipped-section');
    assert.ok(hackFallback);
  });

  it('records a missing-mode warning when a mode key is absent', () => {
    const fixture = readFixture('missing-modes.json');
    const ctx = createRunContext({ dryRun: true });

    assert.throws(() => extractSemanticColors(fixture, MODE_LIGHT, ctx), /No semantic colors/);
    const missingMode = ctx.warnings.find(w => w.code === 'missing-mode');
    assert.ok(missingMode, 'expected a missing-mode warning');
    assert.equal(missingMode.requestedMode, MODE_LIGHT);
  });
});

describe('extractTypography', () => {
  it('strips Figma prefixes from token keys', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractTypography(fixture, ctx);

    assert.equal(result.fontSize['12'].value, 12);
    assert.equal(result.fontSize['16'].value, 16);
    assert.equal(result.fontWeight.regular.value, 400);
    assert.equal(result.fontWeight.semibold.value, 600);
    assert.equal(result.lineHeight['16'].value, 16);
    assert.equal(result.fontFamily.primary.value, 'Onest');
  });

  it('emits an empty letterSpacing placeholder', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractTypography(fixture, ctx);

    assert.deepEqual(result.letterSpacing, {});
  });
});

describe('extractSizes', () => {
  it('sanitizes the comma in border-1,5 to 1-5', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractSizes(fixture, ctx);

    assert.equal(result.borderWidth['1-5'].value, 1.5);
    assert.equal(result.borderWidth['1'].value, 1);
  });

  it('emits 0 for blank spacing-0 and records a fallback', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractSizes(fixture, ctx);

    assert.equal(result.spacing['0'].value, 0);
    const zeroFallback = ctx.fallbacks.find(f => f.outputKey === 'spacing.0');
    assert.ok(zeroFallback, 'expected a generated-zero fallback record');
  });

  it('coerces radius-full to a string with explicit px unit', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractSizes(fixture, ctx);

    assert.equal(result.borderRadius.full.value, '9999px');
  });

  it('strips Figma prefixes from spacing and border-radius keys', () => {
    const fixture = readFixture('sample-tokenhaus.json');
    const ctx = createRunContext({ dryRun: true });
    const result = extractSizes(fixture, ctx);

    assert.equal(result.spacing['12'].value, 12);
    assert.equal(result.spacing['24'].value, 24);
    assert.equal(result.borderRadius['8'].value, 8);
  });
});

describe('rewritePath', () => {
  it('rewrites primitive color paths to the palette namespace', () => {
    const ctx = createRunContext({ dryRun: true });
    assert.equal(
      rewritePath('2. Primitive Colors: Do not use directly.gray.100', ctx),
      'palette.gray.100',
    );
    assert.equal(
      rewritePath('2. Primitive Colors: Do not use directly.alpha.black.100-alpha', ctx),
      'palette.alpha.black.100-alpha',
    );
  });

  it('rewrites typography primitives, stripping Figma prefixes', () => {
    const ctx = createRunContext({ dryRun: true });
    assert.equal(rewritePath('4. Typography Primitives.font-size.fs-12', ctx), 'fontSize.12');
    assert.equal(rewritePath('4. Typography Primitives.line-height.lh-16', ctx), 'lineHeight.16');
    assert.equal(rewritePath('4. Typography Primitives.font-weight.fw-regular', ctx), 'fontWeight.regular');
    assert.equal(
      rewritePath('4. Typography Primitives.font-family.primary-font', ctx),
      'fontFamily.primary',
    );
  });

  it('rewrites size paths and sanitizes commas in border-width', () => {
    const ctx = createRunContext({ dryRun: true });
    assert.equal(rewritePath('3. Sizes.spacings.spacing-12', ctx), 'spacing.12');
    assert.equal(rewritePath('3. Sizes.border-radius.radius-8', ctx), 'borderRadius.8');
    assert.equal(rewritePath('3. Sizes.border-width.border-1,5', ctx), 'borderWidth.1-5');
  });

  it('tracks unresolved namespaces for unknown path prefixes', () => {
    const ctx = createRunContext({ dryRun: true });
    const result = rewritePath('Some Unknown Section.foo.bar', ctx);
    assert.equal(result, 'Some Unknown Section.foo.bar');
    assert.deepEqual(ctx.unresolvedReferences, ['Some Unknown Section.foo.bar']);
  });
});

// ── Orphan cleanup ────────────────────────────────────────────────────────────

describe('cleanOrphanFiles', () => {
  function seedOrphans(coreDir, names) {
    fs.mkdirSync(coreDir, { recursive: true });
    for (const name of names) {
      fs.writeFileSync(path.join(coreDir, name), '{}\n', 'utf8');
    }
  }

  it('records planned deletes without unlinking in dry-run mode', () => {
    const tempDir = createTempDir();
    const coreDir = path.join(tempDir, 'core');
    const darkDir = path.join(tempDir, 'core.dark');
    const presentOrphan = ORPHAN_FILES_CORE[0];
    seedOrphans(coreDir, [presentOrphan]);

    const ctx = createRunContext({ apply: true, dryRun: true });
    cleanOrphanFiles(ctx, coreDir, darkDir);

    assert.equal(fs.existsSync(path.join(coreDir, presentOrphan)), true);
    const planned = ctx.deletedOrphans.find(entry => entry.relativePath.endsWith(presentOrphan));
    assert.ok(planned, 'expected a record for the planned orphan');
    assert.equal(planned.status, 'planned');
  });

  it('deletes existing orphan files when dry-run is false', () => {
    const tempDir = createTempDir();
    const coreDir = path.join(tempDir, 'core');
    const darkDir = path.join(tempDir, 'core.dark');
    const presentOrphan = ORPHAN_FILES_CORE[1];
    seedOrphans(coreDir, [presentOrphan]);

    const ctx = createRunContext({ apply: true, dryRun: false });
    cleanOrphanFiles(ctx, coreDir, darkDir);

    assert.equal(fs.existsSync(path.join(coreDir, presentOrphan)), false);
    const deleted = ctx.deletedOrphans.find(entry => entry.relativePath.endsWith(presentOrphan));
    assert.equal(deleted.status, 'deleted');
  });

  it('marks absent orphans as absent without raising', () => {
    const tempDir = createTempDir();
    const coreDir = path.join(tempDir, 'core');
    const darkDir = path.join(tempDir, 'core.dark');
    fs.mkdirSync(coreDir, { recursive: true });

    const ctx = createRunContext({ apply: true, dryRun: false });
    cleanOrphanFiles(ctx, coreDir, darkDir);

    const absent = ctx.deletedOrphans.every(entry => entry.status === 'absent');
    assert.equal(absent, true);
    assert.equal(ctx.deletedOrphans.length, ORPHAN_FILES_CORE.length);
  });
});

// ── End-to-end ────────────────────────────────────────────────────────────────

describe('main', () => {
  it('supports dry-run report generation without writing token output', async () => {
    const tempDir = createTempDir();
    const outputBase = path.join(tempDir, 'figma-export');
    const reportFile = path.join(tempDir, 'sync-report.json');
    const fixturePath = path.join(fixturesDir, 'sample-tokenhaus.json');

    const result = await main([
      'node',
      'sync-tokens-from-tokenhaus.mjs',
      '--input',
      fixturePath,
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
    assert.equal(report.schemaVersion, 'tokenhaus-2026');
    assert.equal(report.generatedCount, 5);
    assert.ok(
      report.generated.some(entry => entry.relativePath.endsWith(path.join('core', 'palette.tokens.json'))),
    );
    assert.ok(
      report.generated.some(entry => entry.relativePath.endsWith(path.join('core', 'color.tokens.json'))),
    );
    assert.ok(
      report.generated.some(entry =>
        entry.relativePath.endsWith(path.join('core.dark', 'color.tokens.json')),
      ),
    );
    assert.ok(
      report.generated.some(entry => entry.relativePath.endsWith(path.join('core', 'font.tokens.json'))),
    );
    assert.ok(
      report.generated.some(entry => entry.relativePath.endsWith(path.join('core', 'sizes.tokens.json'))),
    );
  });
});
