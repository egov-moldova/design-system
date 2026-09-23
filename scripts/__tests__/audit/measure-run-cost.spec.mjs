/**
 * Tests for scripts/audit/measure-run-cost.mjs — the pure parsing and
 * summarising helpers. Running the audit itself is what the script does; the
 * parts worth asserting are the ones that decide what a number MEANS.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { median, parseMaxRss, slowestRows, timeCommand } from '../../audit/measure-run-cost.mjs';

describe('measure-run-cost: median', () => {
  it('takes the middle of an odd list and the mean of the two middles of an even one', () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([1, 2, 3, 4]), 3);
  });

  it('is null for an empty list, so a missing sample never reads as zero', () => {
    assert.equal(median([]), null);
    assert.equal(median([null, undefined, NaN]), null);
  });

  it('ignores non-finite entries rather than propagating them', () => {
    assert.equal(median([10, Infinity, 20]), 15);
  });
});

describe('measure-run-cost: parseMaxRss', () => {
  it('reads macOS `time -l` bytes as bytes', () => {
    assert.equal(parseMaxRss('  123456789  maximum resident set size', 'darwin'), 123456789);
  });

  it('reads GNU `time -v` kilobytes as kilobytes, on either platform', () => {
    assert.equal(parseMaxRss('\tMaximum resident set size (kbytes): 2048', 'linux'), 2048 * 1024);
    assert.equal(parseMaxRss('\tMaximum resident set size (kbytes): 2048', 'darwin'), 2048 * 1024);
  });

  it('is null when no RSS line is present — never a guessed number', () => {
    assert.equal(parseMaxRss('real 1.23\nuser 0.9'), null);
    assert.equal(parseMaxRss(''), null);
    assert.equal(parseMaxRss(null), null);
  });
});

describe('measure-run-cost: slowestRows', () => {
  it('names the slowest rows as id=ms, descending', () => {
    const envelope = {
      results: [
        { id: '01', durationMs: 10 },
        { id: '12', durationMs: 900 },
        { id: '06', durationMs: 120 },
      ],
    };
    assert.deepEqual(slowestRows(envelope, 2), ['12=900', '06=120']);
  });

  it('skips rows with no duration and survives a missing envelope', () => {
    assert.deepEqual(slowestRows({ results: [{ id: '01' }] }), []);
    assert.deepEqual(slowestRows(null), []);
  });
});

describe('measure-run-cost: timeCommand', () => {
  it('asks for bytes on macOS and the verbose form elsewhere', () => {
    const darwin = timeCommand('darwin');
    const linux = timeCommand('linux');
    // /usr/bin/time is absent on some hosts; then both are null and the
    // script reports rss as unavailable rather than inventing one.
    if (darwin) {
      assert.equal(darwin.flag, '-l');
      assert.equal(linux.flag, '-v');
    } else {
      assert.equal(linux, null);
    }
  });
});
