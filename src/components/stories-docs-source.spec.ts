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
// Without `type: 'dynamic'` the Code panel ignores the transform under the global `'code'`, and
// the transform must return unescaped `<mud-…>` markup for the story's args.

type StoriesModule = Record<string, unknown> & { default: Record<string, unknown> };
type DocsSource = { code?: unknown; type?: unknown; transform?: unknown };

const COMPONENTS_ROOT = import.meta.dirname;

// The same files `.storybook/main.mjs` loads: `../src/components/**/*.stories.@(js|jsx|ts|tsx)`.
const storyFiles = readdirSync(COMPONENTS_ROOT, { recursive: true, encoding: 'utf8' })
  .filter(name => /\.stories\.(js|jsx|ts|tsx)$/.test(name))
  .map(name => path.join(COMPONENTS_ROOT, name));

// `.storybook/preview.js` tags every story `autodocs`, so a story hidden from the sidebar
// (`!dev`) still reaches the Docs page's "Show code" unless it also sets `!autodocs`.
const PROJECT_ANNOTATIONS = { render: () => '', tags: ['autodocs'] };

/** A snippet a consumer can copy: names a `mud-*` element and is not HTML-escaped. */
function isMarkup(snippet: unknown): boolean {
  return typeof snippet === 'string' && snippet.includes('<mud-') && !snippet.includes('&lt;');
}

function transformOutput(transform: (code: string, context: { args: unknown }) => unknown, args: unknown): unknown {
  try {
    return transform('', { args });
  } catch {
    return undefined;
  }
}

async function checkSources(): Promise<{ checked: number; missing: string[] }> {
  const modules = await Promise.all(storyFiles.map(file => import(file) as Promise<StoriesModule>));
  let checked = 0;
  const missing = modules.flatMap(module => {
    const meta = module.default;
    return Object.keys(module)
      .filter(name => name !== 'default' && isExportStory(name, meta))
      .flatMap(name => {
        // The stub `render` only satisfies `prepareStory`; nothing is rendered here.
        const story = composeStory(module[name] as never, meta as never, PROJECT_ANNOTATIONS, {}, name);
        if (!story.tags.includes('dev') && !story.tags.includes('autodocs')) return [];
        checked += 1;
        const source = (story.parameters.docs as { source?: DocsSource } | undefined)?.source ?? {};
        const hasCode = typeof source.code === 'string' && source.code.trim() !== '';
        // Storybook calls the transform with the story's args; one that throws, returns
        // nothing or escapes the markup leaves the panel as useless as the story object.
        const hasTransform =
          source.type === 'dynamic' &&
          typeof source.transform === 'function' &&
          isMarkup(transformOutput(source.transform as never, story.args));
        return hasCode || hasTransform ? [] : [`${String(meta.title)} › ${name}`];
      });
  });
  return { checked, missing };
}

describe('stories docs source', () => {
  it('finds the story files', () => {
    expect(storyFiles.length).toBeGreaterThan(0);
  });

  it('gives every sidebar-visible story an explicit docs source', async () => {
    const { checked, missing } = await checkSources();
    // Visibility comes from Storybook's default `dev` tag. If an upgrade stopped adding
    // it, every story would be skipped and the list below would pass empty.
    expect(checked).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
