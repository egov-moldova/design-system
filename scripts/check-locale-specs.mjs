#!/usr/bin/env node
/**
 * check-locale-specs.mjs — issue #163's acceptance bar: the spec of every component that
 * carries a `*.messages.ts` dictionary calls the shared `describeLocales(...)` helper
 * (`src/utils/locale.test-helpers.ts`). The component set is derived from the tree — every
 * `src/components/<name>/*.messages.ts` — never a hand-kept list, so a new dictionary is
 * caught the moment its spec is missing the call.
 *
 * Usage: node scripts/check-locale-specs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COMPONENTS_DIR = path.join(ROOT, 'src/components');

function main() {
  if (!fs.existsSync(COMPONENTS_DIR)) {
    console.error(`[check-locale-specs] ${COMPONENTS_DIR} does not exist.`);
    process.exit(1);
  }
  const dirs = fs
    .readdirSync(COMPONENTS_DIR)
    .filter(entry => fs.statSync(path.join(COMPONENTS_DIR, entry)).isDirectory())
    .sort();

  let failed = false;
  let checked = 0;
  for (const dir of dirs) {
    const dirPath = path.join(COMPONENTS_DIR, dir);
    const hasMessages = fs.readdirSync(dirPath).some(entry => entry.endsWith('.messages.ts'));
    if (!hasMessages) continue;
    checked++;

    const specPath = path.join(dirPath, 'test', `${dir}.spec.tsx`);
    if (!fs.existsSync(specPath)) {
      console.error(`[check-locale-specs] ${dir}: has a *.messages.ts dictionary but no test/${dir}.spec.tsx.`);
      failed = true;
      continue;
    }
    const content = fs.readFileSync(specPath, 'utf8');
    // Matches both `describeLocales(...)` and the generic form `describeLocales<M>(...)`.
    if (!/\bdescribeLocales\s*[<(]/.test(content)) {
      console.error(`[check-locale-specs] ${dir}: test/${dir}.spec.tsx does not call describeLocales(...).`);
      failed = true;
    }
  }

  if (failed) {
    console.error('[check-locale-specs] FAILED — see rows above.');
    process.exit(1);
  }
  console.log(`[check-locale-specs] OK — ${checked} component(s) with a *.messages.ts call describeLocales(...).`);
}

main();
