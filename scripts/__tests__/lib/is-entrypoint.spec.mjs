/**
 * scripts/lib/is-entrypoint.mjs — the shared `isEntrypoint` guard, replacing four separate
 * copies of "was this module the one Node was invoked to run" (two already realpath'd both
 * sides; two others — `copy-probe.mjs`, `check-dev-all.mjs` — compared `import.meta.url` to
 * `pathToFileURL(process.argv[1])` directly, which diverges through a symlinked entrypoint since
 * Node resolves symlinks for `import.meta.url` but never for `argv[1]`).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { isEntrypoint } from '../../lib/is-entrypoint.mjs';

const tempDirs = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('is-entrypoint.mjs — isEntrypoint', () => {
  it('is true when import.meta.url and argv[1] point at the same file directly', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'is-entrypoint-'));
    tempDirs.push(root);
    const script = path.join(root, 'script.mjs');
    fs.writeFileSync(script, '');
    const originalArgv1 = process.argv[1];
    process.argv[1] = script;
    try {
      // Node's loader already realpath's `import.meta.url` (macOS puts every temp dir behind a
      // symlink, /tmp -> /private/tmp, so this mirrors what a real import gets, not the raw path).
      assert.equal(isEntrypoint(pathToFileURL(fs.realpathSync(script)).href), true);
    } finally {
      process.argv[1] = originalArgv1;
    }
  });

  it('is true when argv[1] is a symlink to the module (the bug the naive comparison had)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'is-entrypoint-'));
    tempDirs.push(root);
    const real = path.join(root, 'real-script.mjs');
    const link = path.join(root, 'linked-script.mjs');
    fs.writeFileSync(real, '');
    fs.symlinkSync(real, link);
    const originalArgv1 = process.argv[1];
    process.argv[1] = link;
    try {
      // Naive check would compare pathToFileURL(link) (unresolved) against import.meta.url
      // (Node already resolves symlinks there) and find them unequal; isEntrypoint realpath's
      // argv[1] too, so both sides land on the same real file.
      const importMetaUrl = pathToFileURL(fs.realpathSync(real)).href;
      assert.equal(isEntrypoint(importMetaUrl), true);
      assert.notEqual(pathToFileURL(link).href, importMetaUrl);
    } finally {
      process.argv[1] = originalArgv1;
    }
  });

  it('is true when import.meta.url itself points at a symlink (--preserve-symlinks-main leaves it unresolved)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'is-entrypoint-'));
    tempDirs.push(root);
    const real = path.join(root, 'real-script.mjs');
    const link = path.join(root, 'linked-script.mjs');
    fs.writeFileSync(real, '');
    fs.symlinkSync(real, link);
    const originalArgv1 = process.argv[1];
    // argv[1] never gets symlink resolution from Node either way, so point it straight at the
    // real file — the case under test is the OTHER side: import.meta.url on the link.
    process.argv[1] = real;
    try {
      const importMetaUrl = pathToFileURL(link).href; // deliberately NOT realpath'd
      assert.equal(isEntrypoint(importMetaUrl), true);
      assert.notEqual(importMetaUrl, pathToFileURL(real).href);
    } finally {
      process.argv[1] = originalArgv1;
    }
  });

  it('is true when BOTH import.meta.url and argv[1] are symlinks to the same real file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'is-entrypoint-'));
    tempDirs.push(root);
    const real = path.join(root, 'real-script.mjs');
    const linkA = path.join(root, 'link-a.mjs');
    const linkB = path.join(root, 'link-b.mjs');
    fs.writeFileSync(real, '');
    fs.symlinkSync(real, linkA);
    fs.symlinkSync(real, linkB);
    const originalArgv1 = process.argv[1];
    process.argv[1] = linkA;
    try {
      assert.equal(isEntrypoint(pathToFileURL(linkB).href), true);
    } finally {
      process.argv[1] = originalArgv1;
    }
  });

  it('is false when the module is a different file than argv[1]', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'is-entrypoint-'));
    tempDirs.push(root);
    const script = path.join(root, 'script.mjs');
    const other = path.join(root, 'other.mjs');
    fs.writeFileSync(script, '');
    fs.writeFileSync(other, '');
    const originalArgv1 = process.argv[1];
    process.argv[1] = script;
    try {
      assert.equal(isEntrypoint(pathToFileURL(other).href), false);
    } finally {
      process.argv[1] = originalArgv1;
    }
  });

  it('is false when argv[1] is missing (e.g. a REPL)', () => {
    const originalArgv1 = process.argv[1];
    process.argv[1] = undefined;
    try {
      assert.equal(isEntrypoint(pathToFileURL(__filenameFallback()).href), false);
    } finally {
      process.argv[1] = originalArgv1;
    }
  });

  it("is false (never throws) when argv[1] doesn't exist on disk", () => {
    const originalArgv1 = process.argv[1];
    process.argv[1] = path.join(os.tmpdir(), 'is-entrypoint-does-not-exist', 'ghost.mjs');
    try {
      assert.doesNotThrow(() => isEntrypoint(pathToFileURL(process.argv[1]).href));
      assert.equal(isEntrypoint(pathToFileURL(process.argv[1]).href), false);
    } finally {
      process.argv[1] = originalArgv1;
    }
  });
});

/** Any existing absolute path — content is irrelevant, only used as a well-formed file URL. */
function __filenameFallback() {
  return path.join(os.tmpdir());
}
