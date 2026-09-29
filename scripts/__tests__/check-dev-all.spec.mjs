/**
 * check-dev-all.mjs — `safeRestoreBadge` and `exitOutcome`, the guards around `cleanupSync`'s
 * badge-restore step, plus the handler-registration boundary.
 *
 * Before the fix, `restoreBadge()` was called unguarded inside `cleanupSync()` while every
 * sibling step (`signalGroup`, `killListeners`, closing `logFd`) was already wrapped in
 * try/catch — a write failure there could abort the rest of cleanup, and nothing named the
 * file a developer would then have to restore by hand. `safeRestoreBadge` now also returns
 * whether the restore succeeded, and `exitOutcome` (a pure function) uses that to fail the run
 * even when `main()` itself never threw — a `PASS` line must never coexist with a leftover edit
 * in `mud-badge.tsx`.
 *
 * Also before the fix, `process.on('exit', cleanupSync)` and the SIGINT/SIGTERM/SIGHUP handlers
 * were registered at module top level — importing this module (this file does, for the two
 * exports above) installed a handler that would SIGKILL whatever listens on 6007/5174 when the
 * *test* process exits, including a developer's own unrelated `yarn dev`. They are now
 * registered inside `main()` only, so an import alone leaves `process`'s listener counts
 * unchanged.
 *
 * Also covered: `runMain` (tracks a separate `threw` boolean, so a falsy rejection —
 * `Promise.reject()`, `throw undefined` — still fails the run instead of reading like nothing
 * was thrown).
 *
 * Only these pure exports are exercised here: `check-dev-all.mjs` is deliberately excluded from
 * `test:scripts` (it starts real dev servers and drives a real browser — see its module doc),
 * and importing it for them must not trigger that run — the module guards its entrypoint via
 * the shared `isEntrypoint` helper (`scripts/lib/is-entrypoint.mjs`).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { exitOutcome, runMain, safeRestoreBadge } from '../check-dev-all.mjs';

describe('check-dev-all.mjs — importing the module', () => {
  it('registers no process exit/signal handlers (they live inside main())', () => {
    const counts = () => ({
      exit: process.listenerCount('exit'),
      SIGINT: process.listenerCount('SIGINT'),
      SIGTERM: process.listenerCount('SIGTERM'),
      SIGHUP: process.listenerCount('SIGHUP'),
    });
    const before = counts();
    // A cache-busting query forces a fresh ESM module instantiation, so this import re-runs the
    // module's top-level code exactly as the static import above did — the assertion is that
    // NEITHER import run added a listener, not that a second import is a no-op.
    return import(`../check-dev-all.mjs?probe=${Date.now()}-${Math.random()}`).then(() => {
      assert.deepEqual(counts(), before);
    });
  });
});

describe('check-dev-all.mjs — safeRestoreBadge', () => {
  it('calls restore, logs nothing, and returns true on success', () => {
    let called = false;
    const logs = [];
    const result = safeRestoreBadge(
      () => {
        called = true;
      },
      '/path/to/mud-badge.tsx',
      msg => logs.push(msg),
    );
    assert.equal(called, true);
    assert.deepEqual(logs, []);
    assert.equal(result, true);
  });

  it('never throws when restore throws, logs a message naming the file to restore by hand, and returns false', () => {
    const logs = [];
    let result;
    assert.doesNotThrow(() => {
      result = safeRestoreBadge(
        () => {
          throw new Error('EACCES: permission denied');
        },
        '/path/to/mud-badge.tsx',
        msg => logs.push(msg),
      );
    });
    assert.equal(result, false);
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

describe('check-dev-all.mjs — exitOutcome', () => {
  it('is 0 when main() did not throw and the badge restore succeeded', () => {
    assert.equal(exitOutcome(false, true), 0);
  });

  it('is 1 when main() threw, even if the badge restore succeeded', () => {
    assert.equal(exitOutcome(true, true), 1);
  });

  it('is 1 when the badge restore failed, even though main() otherwise succeeded', () => {
    assert.equal(exitOutcome(false, false), 1);
  });

  it('is 1 when both main() threw and the badge restore failed', () => {
    assert.equal(exitOutcome(true, false), 1);
  });
});

describe('check-dev-all.mjs — runMain', () => {
  it('reports threw: false and no failure when mainFn resolves', async () => {
    const result = await runMain(async () => 'ignored return value');
    assert.deepEqual(result, { threw: false, failure: undefined });
  });

  it('reports threw: true and the error when mainFn throws normally', async () => {
    const error = new Error('boom');
    const result = await runMain(async () => {
      throw error;
    });
    assert.equal(result.threw, true);
    assert.equal(result.failure, error);
  });

  it('reports threw: true even when mainFn rejects with undefined (the bug exitOutcome(failure, ...) had)', async () => {
    const result = await runMain(() => Promise.reject());
    assert.equal(result.threw, true);
    assert.equal(result.failure, undefined);
    // The regression this guards: exitOutcome's old signature took the caught value itself, so
    // `if (failure)` on `undefined` read identically to "nothing was thrown" and passed the run.
    assert.equal(exitOutcome(result.threw, true), 1);
  });

  it('reports threw: true even when mainFn does `throw undefined`', async () => {
    const result = await runMain(async () => {
      // eslint-disable-next-line no-throw-literal -- exercising the exact falsy-throw regression
      throw undefined;
    });
    assert.equal(result.threw, true);
    assert.equal(result.failure, undefined);
    assert.equal(exitOutcome(result.threw, true), 1);
  });
});
