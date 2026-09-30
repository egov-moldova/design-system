import { readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@stencil/vitest';
import { isExportStory } from 'storybook/internal/csf';
import { composeStory } from 'storybook/preview-api';

// Every sidebar-visible story must say what its Code panel shows (issue #176).
//
// `.storybook/preview.js` sets `docs.source.type: 'code'` globally. Under it a story with
// no source of its own shows `originalSource` — the story object from this file — instead
// of markup (addon-docs `manager.js`: `source.code || snippet || originalSource`). Switching
// the global to `'dynamic'` is not the fix: `render` returns HTML strings, which the
// web-components source decorator serialises as escaped text.
//
// So each visible story sets one of:
//   - `docs.source.code`, hand-written consumer markup; or
//   - `docs.source.type: 'dynamic'` plus a `transform` that builds the markup from args.
// A transform without `type: 'dynamic'` never runs under the global `'code'`.

type StoriesModule = Record<string, unknown> & { default: Record<string, unknown> };
type DocsSource = { code?: unknown; type?: unknown; transform?: unknown };

const COMPONENTS_ROOT = import.meta.dirname;

const storyFiles = readdirSync(COMPONENTS_ROOT, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .flatMap(dir =>
    readdirSync(path.join(COMPONENTS_ROOT, dir.name))
      .filter(name => name.endsWith('.stories.ts'))
      .map(name => path.join(COMPONENTS_ROOT, dir.name, name)),
  );

async function missingSources(): Promise<string[]> {
  const modules = await Promise.all(storyFiles.map(file => import(file) as Promise<StoriesModule>));
  return modules.flatMap(module => {
    const meta = module.default;
    return Object.keys(module)
      .filter(name => name !== 'default' && isExportStory(name, meta))
      .flatMap(name => {
        // The stub `render` only satisfies `prepareStory`; nothing is rendered here.
        const story = composeStory(module[name] as never, meta as never, { render: () => '' }, {}, name);
        if (!story.tags.includes('dev')) return [];
        const source = (story.parameters.docs as { source?: DocsSource } | undefined)?.source ?? {};
        const hasCode = typeof source.code === 'string' && source.code.trim() !== '';
        const hasTransform = source.type === 'dynamic' && typeof source.transform === 'function';
        return hasCode || hasTransform ? [] : [`${String(meta.title)} › ${name}`];
      });
  });
}

describe('stories docs source', () => {
  it('finds the story files', () => {
    expect(storyFiles.length).toBeGreaterThan(0);
  });

  it('gives every sidebar-visible story an explicit docs source', async () => {
    expect(await missingSources()).toEqual([]);
  });
});
