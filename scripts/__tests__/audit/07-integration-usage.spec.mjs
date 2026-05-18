/**
 * Smoke tests for scripts/audit/07-integration-usage.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { scanUsage, checkExports } from '../../audit/07-integration-usage.mjs';

describe('07-integration-usage: checkExports', () => {
  it('builds the expected CustomEvent type name', () => {
    assert.equal(checkExports('cor-button', '').expectedTypeName, 'CorButtonCustomEvent');
    assert.equal(checkExports('cor-banner-notification', '').expectedTypeName, 'CorBannerNotificationCustomEvent');
    assert.equal(checkExports('cor-input', '').expectedTypeName, 'CorInputCustomEvent');
  });

  it('detects the type in index source', () => {
    const indexSource = `
      export type {
        CorButtonCustomEvent,
        CorInputCustomEvent,
      };
    `;
    assert.equal(checkExports('cor-button', indexSource).customEventType, true);
    assert.equal(checkExports('cor-tooltip', indexSource).customEventType, false);
  });

  it('returns false when no index source is loaded', () => {
    assert.equal(checkExports('cor-button', null).customEventType, false);
    assert.equal(checkExports('cor-button', '').customEventType, false);
  });
});

describe('07-integration-usage: scanUsage', () => {
  // We pass synthetic file paths + use mocks. The real scanner reads files
  // from disk, so for unit tests we use a small in-memory shim by writing temp
  // files. But for shape verification, we can pass an empty fileList.
  it('produces a categories map with all expected slots', () => {
    const usage = scanUsage('cor-button', []);
    assert.equal(usage.total, 0);
    assert.deepEqual(Object.keys(usage.byCategory).sort(), [
      'components',
      'other',
      'stories',
      'tests',
      'web-components',
    ]);
  });

  it('respects own-component exclusion (component does not count itself)', async () => {
    // Real-file integration test: pass cor-button.tsx as a candidate; it should
    // be filtered out because it's inside src/components/cor-button/.
    const { default: path } = await import('node:path');
    const { REPO_ROOT } = await import('../../audit/lib/component-paths.mjs');
    const ownTsx = path.join(REPO_ROOT, 'src/components/cor-button/cor-button.tsx');
    const usage = scanUsage('cor-button', [ownTsx]);
    assert.equal(usage.total, 0, 'cor-button.tsx should not count cor-button as a usage');
  });
});

describe('07-integration-usage: end-to-end on baseline component', () => {
  it('cor-button has usages across stories/tests/components categories', async () => {
    const { analyzeComponent } = await import('../../audit/07-integration-usage.mjs');
    const { resolveComponentPaths } = await import('../../audit/lib/component-paths.mjs');
    const { glob } = await import('node:fs/promises');
    const { REPO_ROOT } = await import('../../audit/lib/component-paths.mjs');
    const { join } = await import('node:path');
    const { readFileSync, statSync } = await import('node:fs');

    // Replicate the script's file collection logic in mini form
    const files = new Set();
    const patterns = ['src/**/*.stories.ts', 'src/**/*.tsx', 'src/**/*.ts'];
    for (const pattern of patterns) {
      for await (const p of glob(pattern, { cwd: REPO_ROOT })) {
        const abs = typeof p === 'string' ? join(REPO_ROOT, p) : p;
        if (/[\\/](node_modules|dist|loader|\.stencil)[\\/]/.test(abs)) continue;
        try {
          if (statSync(abs).isFile()) files.add(abs);
        } catch {}
      }
    }
    const fileList = [...files];

    const target = resolveComponentPaths('cor-button');
    const { findings, usage } = await analyzeComponent(target, { fileList, indexSource: '' });

    assert.ok(usage.total > 0, 'cor-button should have at least one usage');
    assert.equal(findings.filter(f => f.severity === 'error').length, 0);
  });
});
