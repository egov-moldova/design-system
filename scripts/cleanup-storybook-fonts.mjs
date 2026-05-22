#!/usr/bin/env node
/**
 * Post-build cleanup: remove Storybook core's Nunito Sans woff2 files from
 * the production build. They are copied in unconditionally by Storybook's
 * builder (node_modules/storybook/assets/server/template.ejs hardcodes the
 * @font-face declarations). With our @font-face override in
 * .storybook/manager-head.html + preview-head.html remapping "Nunito Sans"
 * to Onest, the woff2 URLs are never requested at runtime — these files
 * are dead weight on disk.
 */
import { rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORYBOOK_STATIC = resolve(__dirname, '../storybook-static');

const TARGETS = [
  'nunito-sans-bold-italic.woff2',
  'nunito-sans-bold.woff2',
  'nunito-sans-italic.woff2',
  'nunito-sans-regular.woff2',
  'sb-common-assets/nunito-sans-bold-italic.woff2',
  'sb-common-assets/nunito-sans-bold.woff2',
  'sb-common-assets/nunito-sans-italic.woff2',
  'sb-common-assets/nunito-sans-regular.woff2',
];

try {
  await stat(STORYBOOK_STATIC);
} catch {
  console.log('[cleanup-storybook-fonts] storybook-static/ not found, skipping');
  process.exit(0);
}

let removed = 0;
for (const target of TARGETS) {
  const fullPath = resolve(STORYBOOK_STATIC, target);
  try {
    await rm(fullPath, { force: true });
    removed += 1;
  } catch (err) {
    console.warn(`[cleanup-storybook-fonts] failed to remove ${target}: ${err.message}`);
  }
}
console.log(`[cleanup-storybook-fonts] removed ${removed}/${TARGETS.length} orphaned Nunito Sans woff2 files`);
