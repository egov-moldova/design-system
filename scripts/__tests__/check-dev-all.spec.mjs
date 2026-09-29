/**
 * check-dev-all.mjs — `safeRestoreBadge`, the guard around `cleanupSync`'s badge-restore step.
 *
 * Before the fix, `restoreBadge()` was called unguarded inside `cleanupSync()` while every
 * sibling step (`signalGroup`, `killListeners`, closing `logFd`) was already wrapped in
 * try/catch — a write failure there could abort the rest of cleanup, and nothing named the
 * file a developer would then have to restore by hand.
 *
 * Only `safeRestoreBadge` is exercised here: `check-dev-all.mjs` is deliberately excluded from
 * `test:scripts` (it starts real dev servers and drives a real browser — see its module doc),
 * and importing it for this one helper must not trigger that run — the module guards its
 * entrypoint behind `import.meta.url === pathToFileURL(process.argv[1]).href`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { safeRestoreBadge } from '../check-dev-all.mjs';

describe('check-dev-all.mjs — safeRestoreBadge', () => {
  it('calls restore and logs nothing on success', () => {
    let called = false;
    const logs = [];
    safeRestoreBadge(
      () => {
        called = true;
      },
      '/path/to/mud-badge.tsx',
      msg => logs.push(msg),
    );
    assert.equal(called, true);
    assert.deepEqual(logs, []);
  });

  it('never throws when restore throws, and logs a message naming the file to restore by hand', () => {
    const logs = [];
    assert.doesNotThrow(() => {
      safeRestoreBadge(
        () => {
          throw new Error('EACCES: permission denied');
        },
        '/path/to/mud-badge.tsx',
        msg => logs.push(msg),
      );
    });
    assert.equal(logs.length, 1);
    assert.match(logs[0], /FAILED TO RESTORE/);
    assert.match(logs[0], /\/path\/to\/mud-badge\.tsx/);
    assert.match(logs[0], /EACCES: permission denied/);
    assert.match(logs[0], /restore it by hand/);
  });

  it('defaults to console.error when no logger is passed (never throws)', () => {
    assert.doesNotThrow(() => {
      safeRestoreBadge(() => {
        throw new Error('boom');
      }, '/path/to/mud-badge.tsx');
    });
  });
});
