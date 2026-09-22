/**
 * Smoke tests for scripts/audit/12-console-errors.mjs
 *
 * Pure helpers only — the actual browser-driving flow is integration-tested
 * separately once Playwright is installed (`yarn add -D playwright`).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { classifyMessage, analyzeComponent } from '../../audit/12-console-errors.mjs';

describe('12-console-errors: S6 — CONSOLE-NO-STORIES carries noTarget (Decision §5)', () => {
  it('a component whose stories file exports nothing emits noTarget: true, no browser touched', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'console-no-stories-'));
    const storiesPath = join(dir, 'mud-fx.stories.ts');
    writeFileSync(storiesPath, '// no exports\n');
    const target = {
      found: true,
      name: 'mud-fx',
      bare: 'fx',
      exists: { stories: true },
      paths: { stories: storiesPath },
    };
    const { findings } = await analyzeComponent(target, {});
    const f = findings.find(x => x.code === 'CONSOLE-NO-STORIES');
    assert.ok(f);
    assert.equal(f.noTarget, true);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('12-console-errors: classifyMessage', () => {
  it('classifies error messages as error', () => {
    assert.equal(classifyMessage('error', 'TypeError: cannot read x of undefined'), 'error');
  });

  it('drops favicon noise to info', () => {
    assert.equal(classifyMessage('error', 'Failed to load resource: favicon.ico'), 'info');
  });

  it('classifies warnings as warning', () => {
    assert.equal(classifyMessage('warning', 'Deprecated API X used'), 'warning');
  });

  it('drops HMR / webpack-internal noise to info', () => {
    assert.equal(classifyMessage('warning', '[HMR] Waiting for update signal from WDS...'), 'info');
    assert.equal(classifyMessage('warning', 'hot-module-reload triggered'), 'info');
    assert.equal(classifyMessage('warning', 'webpack-internal:///...'), 'info');
  });

  it('treats any other type as info', () => {
    assert.equal(classifyMessage('log', 'noise'), 'info');
    assert.equal(classifyMessage('debug', 'verbose'), 'info');
  });

  it('handles missing/null text gracefully', () => {
    assert.equal(classifyMessage('error', undefined), 'error');
    assert.equal(classifyMessage('warning', null), 'warning');
  });
});

describe('U6: mapLimit — bounded concurrency, input order kept', () => {
  it('returns results in input order and never runs more than the limit at once', async () => {
    const { mapLimit } = await import('../../audit/lib/browser-context.mjs');
    let running = 0;
    let peak = 0;
    const out = await mapLimit([30, 5, 20, 1, 10, 2], 3, async (ms, i) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise(r => setTimeout(r, ms));
      running -= 1;
      return `r${i}`;
    });
    assert.deepEqual(out, ['r0', 'r1', 'r2', 'r3', 'r4', 'r5']);
    assert.ok(peak <= 3, `peak concurrency ${peak} exceeded 3`);
    assert.equal(peak, 3);
  });

  it('an empty list resolves to an empty array', async () => {
    const { mapLimit } = await import('../../audit/lib/browser-context.mjs');
    assert.deepEqual(await mapLimit([], 4, async () => 1), []);
  });
});
