/**
 * copy-probe.mjs — `resolveStaticPath`'s traversal guard.
 *
 * Before the fix, `serveStatic` checked `filePath.startsWith(dir)`, a bare string prefix
 * with no separator boundary: a sibling directory sharing `dir`'s prefix
 * (`storybook-static-x/` against `storybook-static/`) passed the check. `path.relative`
 * is what actually detects an escape.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { resolveStaticPath } from '../../eslint/copy-probe.mjs';

const tempDirs = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A `storybook-static/`-shaped dir plus a sibling `storybook-static-x/` sharing its prefix. */
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-probe-'));
  tempDirs.push(root);
  const dir = path.join(root, 'storybook-static');
  const sibling = path.join(root, 'storybook-static-x');
  fs.mkdirSync(dir);
  fs.mkdirSync(sibling);
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>root</html>');
  fs.writeFileSync(path.join(sibling, 'secret.html'), '<html>sibling secret</html>');
  return { dir, sibling };
}

describe('copy-probe.mjs — resolveStaticPath', () => {
  it('serves a real file under dir', () => {
    const { dir } = fixture();
    fs.writeFileSync(path.join(dir, 'iframe.html'), '<html>iframe</html>');
    assert.equal(resolveStaticPath(dir, '/iframe.html'), path.join(dir, 'iframe.html'));
  });

  it('falls back to index.html for a missing path', () => {
    const { dir } = fixture();
    assert.equal(resolveStaticPath(dir, '/does-not-exist.html'), path.join(dir, 'index.html'));
  });

  it('falls back to index.html for a directory', () => {
    const { dir } = fixture();
    const sub = path.join(dir, 'sub');
    fs.mkdirSync(sub);
    assert.equal(resolveStaticPath(dir, '/sub'), path.join(dir, 'index.html'));
  });

  it("refuses a sibling directory sharing dir's prefix (no separator boundary)", () => {
    const { dir, sibling } = fixture();
    // A URL path that, joined naively, reaches into `storybook-static-x/` — the exact shape
    // `filePath.startsWith(dir)` let through, since `storybook-static-x` starts with
    // `storybook-static`.
    const escaping = `../${path.basename(sibling)}/secret.html`;
    const resolved = resolveStaticPath(dir, `/${escaping}`);
    assert.equal(resolved, path.join(dir, 'index.html'));
    assert.notEqual(resolved, path.join(sibling, 'secret.html'));
  });

  it('refuses a dotdot escape above dir entirely', () => {
    const { dir } = fixture();
    assert.equal(resolveStaticPath(dir, '/../../etc/passwd'), path.join(dir, 'index.html'));
  });
});
