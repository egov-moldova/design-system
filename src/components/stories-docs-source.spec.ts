import { readdirSync, readFileSync } from 'node:fs';
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
// the transform must return `<mud-…>` markup for the story's args (escaped markup has none).

type StoriesModule = Record<string, unknown> & { default: Record<string, unknown> };
type DocsSource = { code?: unknown; type?: unknown; transform?: unknown };

const COMPONENTS_ROOT = import.meta.dirname;

// The same files `.storybook/main.mjs` loads: `../src/components/**/*.stories.@(js|jsx|ts|tsx)`.
const storyFiles = readdirSync(COMPONENTS_ROOT, { recursive: true, encoding: 'utf8' })
  .filter(name => /\.stories\.(js|jsx|ts|tsx)$/.test(name))
  .map(name => path.join(COMPONENTS_ROOT, name));

// The project-level tags of `.storybook/preview.js` (`autodocs` today): a story hidden from the
// sidebar (`!dev`) still reaches the Docs page's "Show code" unless it also sets `!autodocs`.
// Read from the file rather than imported: preview.js pulls in the browser-only preview setup.
const PREVIEW_PATH = path.resolve(COMPONENTS_ROOT, '../../.storybook/preview.js');
const PREVIEW_TAGS = readFileSync(PREVIEW_PATH, 'utf8').match(/^export const tags = \[([^\]]*)\];$/m);
const PROJECT_ANNOTATIONS = {
  render: () => '',
  tags: [...(PREVIEW_TAGS?.[1] ?? '').matchAll(/'([^']+)'/g)].map(match => match[1]),
};

/** Why a transform's output is not copyable markup, or `null` when it is. */
function transformProblem(transform: (code: string, context: { args: unknown }) => unknown, args: unknown) {
  try {
    const output = transform('', { args });
    return typeof output === 'string' && output.includes('<mud-') ? null : 'transform returned no <mud-…> markup';
  } catch (error) {
    return `transform threw: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function checkSources(): Promise<{ sidebarStories: number; missing: string[] }> {
  const modules = await Promise.all(storyFiles.map(file => import(file) as Promise<StoriesModule>));
  let sidebarStories = 0;
  const missing = modules.flatMap(module => {
    const meta = module.default;
    return Object.keys(module)
      .filter(name => name !== 'default' && isExportStory(name, meta))
      .flatMap(name => {
        // The stub `render` only satisfies `prepareStory`; nothing is rendered here.
        const story = composeStory(module[name] as never, meta as never, PROJECT_ANNOTATIONS, {}, name);
        if (story.tags.includes('dev')) sidebarStories += 1;
        if (!story.tags.includes('dev') && !story.tags.includes('autodocs')) return [];
        const label = `${String(meta.title)} › ${name}`;
        const source = (story.parameters.docs as { source?: DocsSource } | undefined)?.source ?? {};
        if (typeof source.code === 'string' && source.code.trim() !== '') return [];
        if (source.type !== 'dynamic' || typeof source.transform !== 'function') return [label];
        // Storybook calls the transform with the story's args; one that throws, returns
        // nothing or escapes the markup leaves the panel as useless as the story object.
        const problem = transformProblem(source.transform as never, story.args);
        return problem ? [`${label} (${problem})`] : [];
      });
  });
  return { sidebarStories, missing };
}

describe('stories docs source', () => {
  it('finds the story files and the preview tags', () => {
    expect(storyFiles.length).toBeGreaterThan(0);
    expect(PROJECT_ANNOTATIONS.tags).toContain('autodocs');
  });

  it('gives every sidebar-visible story an explicit docs source', async () => {
    const { sidebarStories, missing } = await checkSources();
    // Sidebar visibility comes from Storybook's default `dev` tag. If an upgrade stopped
    // adding it, no story would count as visible and this guard would check far less.
    expect(sidebarStories).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
