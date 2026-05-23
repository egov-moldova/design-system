/**
 * Smoke tests for scripts/audit/05-story-exports.mjs
 *
 * Strategy:
 *   - Pure helpers (extractStoryTitle, extractStoryExports, buildStoryId,
 *     computeCoverage) get unit tests via synthetic source files.
 *   - analyzeComponent() runs against cor-button + cor-tooltip + cor-input
 *     for the quality regression bar.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import {
  analyzeComponent,
  analyzeStoriesFile,
  buildStoryId,
  computeCoverage,
  extractStoryTitle,
  extractStoryExports,
  STANDARD_STORIES,
} from '../../audit/05-story-exports.mjs';
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';
import { createSourceFile } from '../../audit/lib/ts-parser.mjs';

const tempDirs = [];

function tempStoriesFile(name, content) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'stories-spec-'));
  tempDirs.push(dir);
  const p = path.join(dir, `${name}.stories.ts`);
  writeFileSync(p, content, 'utf8');
  return p;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('05-story-exports: helpers', () => {
  describe('buildStoryId', () => {
    it('kebab-cases title segments and story name', () => {
      assert.equal(buildStoryId('Atoms/Button', 'Default'), 'atoms-button--default');
      assert.equal(buildStoryId('Molecules/Tooltip', 'AllSizes'), 'molecules-tooltip--all-sizes');
      assert.equal(buildStoryId('Templates/CalendarGrid', 'EventLog'), 'templates-calendar-grid--event-log');
    });

    it('handles multi-word PascalCase story names', () => {
      assert.equal(buildStoryId('Atoms/Foo', 'AllVariantsTable'), 'atoms-foo--all-variants-table');
    });
  });

  describe('extractStoryTitle', () => {
    it('extracts title from inline default export object', () => {
      const sf = createSourceFile(
        tempStoriesFile(
          'a',
          `
        export default { title: 'Atoms/Button', component: 'cor-button' };
        export const Default = {};
      `,
        ),
      );
      assert.equal(extractStoryTitle(sf), 'Atoms/Button');
    });

    it('extracts title from variable + default reference (CSF3 idiom)', () => {
      const sf = createSourceFile(
        tempStoriesFile(
          'b',
          `
        const meta = { title: 'Molecules/Tooltip', component: 'cor-tooltip' };
        export default meta;
        export const Default = {};
      `,
        ),
      );
      assert.equal(extractStoryTitle(sf), 'Molecules/Tooltip');
    });

    it('extracts title from meta satisfies Meta', () => {
      const sf = createSourceFile(
        tempStoriesFile(
          'c',
          `
        import type { Meta } from '@storybook/web-components-vite';
        const meta = { title: 'Atoms/Foo', component: 'cor-foo' } satisfies Meta;
        export default meta;
      `,
        ),
      );
      assert.equal(extractStoryTitle(sf), 'Atoms/Foo');
    });

    it('returns null when no title is found', () => {
      const sf = createSourceFile(tempStoriesFile('d', `export const Default = {};`));
      assert.equal(extractStoryTitle(sf), null);
    });
  });

  describe('extractStoryExports', () => {
    it('collects all named exports', () => {
      const sf = createSourceFile(
        tempStoriesFile(
          'e',
          `
        export default { title: 'Atoms/Foo' };
        export const Default = {};
        export const AllVariants = {};
        export const ManualControl = {};
      `,
        ),
      );
      const names = extractStoryExports(sf).map(e => e.name);
      assert.deepEqual(names.sort(), ['AllVariants', 'Default', 'ManualControl']);
    });

    it('ignores non-exported variables', () => {
      const sf = createSourceFile(
        tempStoriesFile(
          'f',
          `
        const internal = {};
        export const Default = {};
      `,
        ),
      );
      const names = extractStoryExports(sf).map(e => e.name);
      assert.deepEqual(names, ['Default']);
    });
  });

  describe('computeCoverage', () => {
    it('matches Default exactly', () => {
      assert.equal(computeCoverage(['Default']).Default, 'Default');
    });

    it('matches AllVariants and AllVariantsTable for AllVariants slot', () => {
      assert.equal(computeCoverage(['AllVariants']).AllVariants, 'AllVariants');
      assert.equal(computeCoverage(['AllVariantsTable']).AllVariants, 'AllVariantsTable');
      assert.equal(computeCoverage(['Variants']).AllVariants, 'Variants');
    });

    it('matches AllSizesTable for AllSizes slot', () => {
      assert.equal(computeCoverage(['AllSizesTable']).AllSizes, 'AllSizesTable');
    });

    it('returns false for missing slots', () => {
      const c = computeCoverage(['Default']);
      assert.equal(c.AllVariants, false);
      assert.equal(c.AllSizes, false);
      assert.equal(c.States, false);
    });
  });

  describe('STANDARD_STORIES sanity', () => {
    it('Default is the only "recommended" slot (warning if missing)', () => {
      const recommended = STANDARD_STORIES.filter(s => s.recommended).map(s => s.canonical);
      assert.deepEqual(recommended, ['Default']);
    });
  });
});

describe('05-story-exports: end-to-end on synthetic stories', () => {
  it('produces correct storyIds for inline default export', () => {
    const p = tempStoriesFile(
      'test',
      `
      export default { title: 'Atoms/Test', component: 'cor-test' };
      export const Default = { args: {} };
      export const AllVariants = { args: {} };
    `,
    );
    const { stories, coverage, findings } = analyzeStoriesFile(p, 'cor-test');
    assert.equal(stories.length, 2);
    assert.equal(stories[0].name, 'Default');
    assert.equal(stories[0].storyId, 'atoms-test--default');
    assert.equal(coverage.Default, 'Default');
    assert.equal(coverage.AllVariants, 'AllVariants');
    // No warnings — Default is present
    assert.equal(findings.filter(f => f.severity === 'warning').length, 0);
  });

  it('warns when Default is missing', () => {
    const p = tempStoriesFile(
      'test',
      `
      export default { title: 'Atoms/Test' };
      export const Primary = {};
    `,
    );
    const { findings } = analyzeStoriesFile(p, 'cor-test');
    const missingDefault = findings.find(f => f.code === 'STORY-MISSING-DEFAULT');
    assert.ok(missingDefault, 'expected STORY-MISSING-DEFAULT finding');
    assert.equal(missingDefault.severity, 'warning');
  });

  it('errors when file has no exported stories at all', () => {
    const p = tempStoriesFile(
      'empty',
      `
      export default { title: 'Atoms/Empty' };
    `,
    );
    const { findings } = analyzeStoriesFile(p, 'cor-empty');
    const noExports = findings.find(f => f.code === 'STORY-NO-EXPORTS');
    assert.ok(noExports);
    assert.equal(noExports.severity, 'error');
  });
});

describe('05-story-exports: docs.source contract', () => {
  it('fires STORY-DOCS-SOURCE-MISSING-DYNAMIC when transform has no type:dynamic', () => {
    const p = tempStoriesFile(
      'missing-dynamic',
      `
      export default { title: 'Atoms/X', component: 'cor-x' };
      export const Default = {
        render: (args) => \`<cor-x />\`,
        parameters: {
          docs: {
            source: {
              transform: (_code, { args }) => \`<cor-x />\`,
            },
          },
        },
      };
    `,
    );
    const { findings } = analyzeStoriesFile(p, 'cor-x');
    const hit = findings.find(f => f.code === 'STORY-DOCS-SOURCE-MISSING-DYNAMIC');
    assert.ok(hit, `expected STORY-DOCS-SOURCE-MISSING-DYNAMIC, got: ${findings.map(f => f.code).join(', ')}`);
    assert.equal(hit.severity, 'warning');
  });

  it('does NOT fire MISSING-DYNAMIC when type:dynamic is present', () => {
    const p = tempStoriesFile(
      'with-dynamic',
      `
      export default { title: 'Atoms/X', component: 'cor-x' };
      export const Default = {
        render: (args) => \`<cor-x />\`,
        parameters: {
          docs: {
            source: {
              type: 'dynamic',
              transform: (_code, { args }) => \`<cor-x />\`,
            },
          },
        },
      };
    `,
    );
    const { findings } = analyzeStoriesFile(p, 'cor-x');
    assert.equal(findings.filter(f => f.code === 'STORY-DOCS-SOURCE-MISSING-DYNAMIC').length, 0);
  });

  it('fires STORY-DOCS-SOURCE-ARGS-ANY on `{ args }: any` transform', () => {
    const p = tempStoriesFile(
      'args-any',
      `
      export default { title: 'Atoms/X', component: 'cor-x' };
      export const Default = {
        parameters: {
          docs: {
            source: {
              type: 'dynamic',
              transform: (_code, { args }: any) => \`<cor-x />\`,
            },
          },
        },
      };
    `,
    );
    const { findings } = analyzeStoriesFile(p, 'cor-x');
    const hit = findings.find(f => f.code === 'STORY-DOCS-SOURCE-ARGS-ANY');
    assert.ok(hit, `expected STORY-DOCS-SOURCE-ARGS-ANY, got: ${findings.map(f => f.code).join(', ')}`);
    assert.equal(hit.severity, 'warning');
  });

  it('does NOT fire ARGS-ANY when destructure is properly typed', () => {
    const p = tempStoriesFile(
      'args-typed',
      `
      export default { title: 'Atoms/X', component: 'cor-x' };
      export const Default = {
        parameters: {
          docs: {
            source: {
              type: 'dynamic',
              transform: (_code, { args }: { args: { foo: string } }) => \`<cor-x />\`,
            },
          },
        },
      };
    `,
    );
    const { findings } = analyzeStoriesFile(p, 'cor-x');
    assert.equal(findings.filter(f => f.code === 'STORY-DOCS-SOURCE-ARGS-ANY').length, 0);
  });

  it('fires STORY-COMPOSITE-NO-CODE-OVERRIDE on controls.disable + helper render + no code', () => {
    const p = tempStoriesFile(
      'composite-no-code',
      `
      const VARIANTS = ['a', 'b'];
      export default { title: 'Atoms/X', component: 'cor-x' };
      export const AllVariants = {
        parameters: { controls: { disable: true } },
        render: () => \`<div>\${VARIANTS.map(v => \`<cor-x variant="\${v}"></cor-x>\`).join('')}</div>\`,
      };
    `,
    );
    const { findings } = analyzeStoriesFile(p, 'cor-x');
    const hit = findings.find(f => f.code === 'STORY-COMPOSITE-NO-CODE-OVERRIDE');
    assert.ok(hit, `expected STORY-COMPOSITE-NO-CODE-OVERRIDE, got: ${findings.map(f => f.code).join(', ')}`);
    assert.equal(hit.severity, 'warning');
  });

  it('does NOT fire COMPOSITE when docs.source.code is provided', () => {
    const p = tempStoriesFile(
      'composite-with-code',
      `
      const VARIANTS = ['a', 'b'];
      const docsSource = VARIANTS.map(v => \`<cor-x variant="\${v}"></cor-x>\`).join('\\n');
      export default { title: 'Atoms/X', component: 'cor-x' };
      export const AllVariants = {
        parameters: {
          controls: { disable: true },
          docs: { source: { code: docsSource } },
        },
        render: () => \`<div>\${VARIANTS.map(v => \`<cor-x variant="\${v}"></cor-x>\`).join('')}</div>\`,
      };
    `,
    );
    const { findings } = analyzeStoriesFile(p, 'cor-x');
    assert.equal(findings.filter(f => f.code === 'STORY-COMPOSITE-NO-CODE-OVERRIDE').length, 0);
  });

  it('does NOT fire COMPOSITE on a single-element render with no helpers', () => {
    const p = tempStoriesFile(
      'composite-clean-render',
      `
      export default { title: 'Atoms/X', component: 'cor-x' };
      export const Plain = {
        parameters: { controls: { disable: true } },
        render: () => \`<cor-x></cor-x>\`,
      };
    `,
    );
    const { findings } = analyzeStoriesFile(p, 'cor-x');
    assert.equal(findings.filter(f => f.code === 'STORY-COMPOSITE-NO-CODE-OVERRIDE').length, 0);
  });
});

describe('05-story-exports: baseline regression', () => {
  it('cor-input has Default + 0 errors', async () => {
    const target = resolveComponentPaths('cor-input');
    const { findings, stories, coverage } = await analyzeComponent(target);
    assert.equal(findings.filter(f => f.severity === 'error').length, 0);
    assert.ok(stories.length > 0, 'cor-input should have stories');
    assert.equal(coverage.Default, 'Default', 'cor-input should have a Default story');
  });

  it('cor-tooltip has Default + 0 errors', async () => {
    const target = resolveComponentPaths('cor-tooltip');
    const { findings, coverage } = await analyzeComponent(target);
    assert.equal(findings.filter(f => f.severity === 'error').length, 0);
    assert.equal(coverage.Default, 'Default');
  });
});
