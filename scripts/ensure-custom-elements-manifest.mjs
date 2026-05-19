#!/usr/bin/env node
// Guarantees `.storybook/custom-elements.json` exists after `wca analyze`.
// `wca` writes nothing when `src/components/` has no analyzable files
// (current state during the legacy → redesign migration), and Storybook's
// preview.js imports the manifest unconditionally. Without a stub the dev
// server fails to start.
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve(process.cwd(), '.storybook/custom-elements.json');

if (!existsSync(manifestPath)) {
  const emptyManifest = { version: 'experimental', tags: [] };
  writeFileSync(manifestPath, `${JSON.stringify(emptyManifest, null, 2)}\n`);
}
