/**
 * Smoke tests for scripts/audit/08-bundle-size.mjs
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { collectChunks, computeTotals, attributeChunksToTag, DEFAULT_WARN_KB } from '../../audit/08-bundle-size.mjs';

const tempDirs = [];

function tempDistDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'bundle-spec-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

function writeChunk(dir, name, content) {
  const full = path.join(dir, name);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
}

describe('08-bundle-size: collectChunks', () => {
  it('lists chunks sorted by descending size', async () => {
    const dist = tempDistDir();
    writeChunk(dist, 'p-aaa.entry.js', 'x'.repeat(1024)); // 1KB
    writeChunk(dist, 'p-bbb.entry.js', 'x'.repeat(2048)); // 2KB
    writeChunk(dist, 'design-system.esm.js', 'x'.repeat(512));
    const chunks = await collectChunks(dist);
    assert.equal(chunks.length, 3);
    assert.ok(chunks[0].sizeBytes >= chunks[1].sizeBytes);
    assert.ok(chunks[1].sizeBytes >= chunks[2].sizeBytes);
  });

  it('reports sizeKb with 2 decimal places', async () => {
    const dist = tempDistDir();
    writeChunk(dist, 'p-aaa.entry.js', 'x'.repeat(1500));
    const chunks = await collectChunks(dist);
    assert.equal(chunks[0].sizeKb, 1.46);
  });

  it('returns empty list when dist is empty', async () => {
    const dist = tempDistDir();
    const chunks = await collectChunks(dist);
    assert.deepEqual(chunks, []);
  });
});

describe('08-bundle-size: computeTotals', () => {
  it('sums totalBytes and totalKb across chunks', () => {
    const chunks = [
      { sizeBytes: 1024, sizeKb: 1 },
      { sizeBytes: 2048, sizeKb: 2 },
      { sizeBytes: 512, sizeKb: 0.5 },
    ];
    const totals = computeTotals(chunks);
    assert.equal(totals.totalBytes, 3584);
    assert.equal(totals.totalKb, 3.5);
  });

  it('handles empty list', () => {
    assert.deepEqual(computeTotals([]), { totalBytes: 0, totalKb: 0 });
  });
});

describe('08-bundle-size: attributeChunksToTag', () => {
  it('finds chunks that mention the component tag in double quotes', () => {
    const dist = tempDistDir();
    writeChunk(dist, 'p-with.entry.js', 'register("cor-button", x);');
    writeChunk(dist, 'p-without.entry.js', 'register("cor-input", x);');
    const chunks = [
      { file: path.join(dist, 'p-with.entry.js'), rel: 'p-with.entry.js', sizeKb: 5 },
      { file: path.join(dist, 'p-without.entry.js'), rel: 'p-without.entry.js', sizeKb: 5 },
    ];
    const result = attributeChunksToTag('cor-button', chunks);
    assert.equal(result.chunkCount, 1);
    assert.equal(result.chunks[0].file, 'p-with.entry.js');
  });

  it('finds chunks that mention the tag in single quotes too', () => {
    const dist = tempDistDir();
    writeChunk(dist, 'p-single.entry.js', "register('cor-button', x);");
    const chunks = [{ file: path.join(dist, 'p-single.entry.js'), rel: 'p-single.entry.js', sizeKb: 3 }];
    const result = attributeChunksToTag('cor-button', chunks);
    assert.equal(result.chunkCount, 1);
  });

  it('returns 0 chunks when no matches', () => {
    const dist = tempDistDir();
    writeChunk(dist, 'p-other.entry.js', 'no mention here');
    const chunks = [{ file: path.join(dist, 'p-other.entry.js'), rel: 'p-other.entry.js', sizeKb: 1 }];
    const result = attributeChunksToTag('cor-button', chunks);
    assert.equal(result.chunkCount, 0);
    assert.equal(result.estimatedKb, 0);
  });

  it('includes the upper-bound caveat note', () => {
    const result = attributeChunksToTag('cor-button', []);
    assert.match(result.note, /Upper bound/);
  });
});

describe('08-bundle-size: defaults', () => {
  it('DEFAULT_WARN_KB is 50', () => {
    assert.equal(DEFAULT_WARN_KB, 50);
  });
});
