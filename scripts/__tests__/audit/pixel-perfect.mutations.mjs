#!/usr/bin/env node
/**
 * Proves the pixel-perfect specs can fail: copies scripts/ to a temp dir,
 * applies one mutation at a time, and expects the named spec to fail. Each
 * substitution is asserted to have changed the file, so a stale anchor stops
 * the run instead of passing silently.
 *
 *   node scripts/__tests__/audit/pixel-perfect.mutations.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const MUTATIONS = [
  {
    file: 'scripts/audit/lib/figma-manifest.mjs',
    from: "if (typeof node !== 'string' || !NODE_ID_RE.test(node)) {",
    to: 'if (false) {',
    spec: 'scripts/__tests__/audit/figma-manifest.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/style-values.mjs',
    from: 'Math.abs(a - b) <= tolerance + 1e-9',
    to: 'Math.abs(a - b) <= tolerance + 1',
    spec: 'scripts/__tests__/audit/15-style-parity.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/image-diff.mjs',
    from: 'diffPercent < passThreshold',
    to: 'diffPercent <= passThreshold',
    spec: 'scripts/__tests__/audit/image-diff.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/token-match.mjs',
    from: '!EXCLUDED.test(name) && ',
    to: '',
    spec: 'scripts/__tests__/audit/token-match.spec.mjs',
  },
  {
    file: 'scripts/audit/figma-refs.mjs',
    from: '|| skipped.has(child.id)',
    to: '',
    spec: 'scripts/__tests__/audit/figma-refs.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/image-diff.mjs',
    from: 'const maskedPixels = applyMasks(a, canvasMasks, background);',
    to: 'const maskedPixels = 0;',
    spec: 'scripts/__tests__/audit/image-diff.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/image-diff.mjs',
    from: 'const comparedPixels = totalPixels - maskedPixels;',
    to: 'const comparedPixels = totalPixels;',
    spec: 'scripts/__tests__/audit/image-diff.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/token-match.mjs',
    from: 'return owner === null || owner === own;',
    to: 'return true;',
    spec: 'scripts/__tests__/audit/token-match.spec.mjs',
  },
];

function runSpec(dir, spec) {
  return spawnSync(process.execPath, ['--test', spec], { cwd: dir, encoding: 'utf8' }).status;
}

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-mutations-'));
  fs.cpSync(path.join(ROOT, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
  // figma-manifest.spec loads the real manifests, so they travel with the scripts.
  fs.cpSync(path.join(ROOT, 'src', 'components'), path.join(dir, 'src', 'components'), {
    recursive: true,
    filter: src => fs.statSync(src).isDirectory() || src.endsWith('.figma.json'),
  });
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return dir;
}

let caught = 0;
for (const m of MUTATIONS) {
  const dir = sandbox();
  if (runSpec(dir, m.spec) !== 0) throw new Error(`baseline failed before mutating: ${m.spec}`);
  const target = path.join(dir, m.file);
  const before = fs.readFileSync(target, 'utf8');
  if (!before.includes(m.from)) throw new Error(`anchor not found in ${m.file}: ${m.from}`);
  const after = before.replace(m.from, () => m.to);
  if (after === before) throw new Error(`mutation changed nothing in ${m.file}`);
  fs.writeFileSync(target, after);
  const status = runSpec(dir, m.spec);
  const ok = status !== 0;
  if (ok) caught++;
  console.log(`${ok ? 'caught ' : 'MISSED '} ${m.file}: ${m.from} → ${m.to} (${m.spec} exit ${status})`);
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(`caught ${caught}/${MUTATIONS.length}`);
process.exit(caught === MUTATIONS.length ? 0 : 1);
