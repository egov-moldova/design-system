import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { staleReason } from '../ensure-components-dts.mjs';

const dirs = [];
after(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

/** A `src/` with one component, `mud-a`, and optionally a declarations file. */
function src(dts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ensure-dts-'));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, 'components', 'mud-a'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'components', 'mud-a', 'mud-a.tsx'),
    "@Component({\n  tag: 'mud-a',\n  shadow: true,\n})\nexport class MudA {}\n",
  );
  fs.writeFileSync(path.join(dir, 'components', 'mud-a', 'mud-a.types.ts'), 'export type A = 1;\n');
  if (dts !== undefined) fs.writeFileSync(path.join(dir, 'components.d.ts'), dts);
  return dir;
}

const current = 'import { A } from "./components/mud-a/mud-a.types";\n"mud-a": HTMLMudAElement;\n';

describe('ensure-components-dts — staleReason', () => {
  it('is null when every import resolves and every tag is declared', () => {
    assert.equal(staleReason(src(current)), null);
  });

  it('reports a missing file', () => {
    assert.match(staleReason(src()), /missing/);
  });

  it('reports an import of a component file that no longer exists (a branch that removed it)', () => {
    const dts = current + 'import { R } from "./components/mud-receipt/mud-receipt.types";\n';
    assert.match(staleReason(src(dts)), /mud-receipt\/mud-receipt\.types, which is gone/);
  });

  it('reports a component tag on disk that the file does not declare (a branch that added it)', () => {
    assert.match(staleReason(src('import { A } from "./components/mud-a/mud-a.types";\n')), /does not declare <mud-a>/);
  });
});
