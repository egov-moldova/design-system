/**
 * Repo invariant: every story id a Figma state manifest names resolves to a story that exists.
 *
 * A story id is derived from the story's `title`, so renaming a title leaves every manifest id
 * pointing at a page that no longer exists. The audit harness then waits for a component that never
 * renders and reports PIXEL-CAPTURE-FAILED for every state instead of "story not found" — see
 * GitHub issue #144, where the `Components` rename left 17 manifests stale.
 *
 * The known-id set is computed from the stories files with the audit's own `analyzeStoriesFile`,
 * so this test and the harness cannot disagree about what an id is. Known limit: that helper counts
 * every exported const of a stories file as a story, so a non-story helper export would count as a
 * known id (no stories file uses `includeStories`/`excludeStories` today).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { analyzeStoriesFile } from '../../audit/05-story-exports.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const COMPONENTS = path.join(ROOT, 'src/components');
// Storybook's own glob (`.storybook/main.mjs`): every *.stories.* under src/components.
const STORIES_RE = /\.stories\.(js|jsx|ts|tsx)$/;
const OLD_PREFIX_RE = /^(atoms|molecules|organisms)-/;

const walk = dir =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => path.join(e.parentPath, e.name));

/** Every story id Storybook will serve, computed from the stories files' titles. */
function knownStoryIds() {
  const ids = new Set();
  const untitled = [];
  for (const file of walk(COMPONENTS).filter(f => STORIES_RE.test(f))) {
    const { stories } = analyzeStoriesFile(file, path.basename(path.dirname(file)));
    if (stories.some(s => s.storyId === null)) untitled.push(path.relative(ROOT, file));
    for (const s of stories) if (s.storyId) ids.add(s.storyId);
  }
  return { ids, untitled };
}

/** `[where, id]` for every story id a manifest names. */
function storyRefs(manifest) {
  const refs = [];
  if (manifest.defaults?.story) refs.push(['defaults.story', manifest.defaults.story]);
  (manifest.states ?? []).forEach((s, i) => {
    if (s.story) refs.push([`states[${i}].story`, s.story]);
  });
  return refs;
}

function deadStoryIds(manifests, knownIds) {
  const dead = [];
  for (const { file, manifest } of manifests) {
    for (const [where, id] of storyRefs(manifest)) {
      if (knownIds.has(id)) continue;
      const swapped = id.replace(OLD_PREFIX_RE, 'components-');
      dead.push({ manifest: file, where, id, suggestion: knownIds.has(swapped) ? swapped : null });
    }
  }
  return dead;
}

const repoManifests = () =>
  walk(COMPONENTS)
    .filter(f => f.endsWith('.figma.json'))
    .map(f => ({ file: path.relative(ROOT, f), manifest: JSON.parse(fs.readFileSync(f, 'utf8')) }));

describe('figma manifests: story ids resolve to real stories', () => {
  it('every stories file has an extractable title', () => {
    const { untitled } = knownStoryIds();
    assert.deepEqual(untitled, [], `stories files with no extractable title: ${untitled.join(', ')}`);
  });

  it('every defaults.story and states[].story exists in the stories files', () => {
    const { ids } = knownStoryIds();
    const dead = deadStoryIds(repoManifests(), ids);
    assert.deepEqual(
      dead,
      [],
      dead
        .map(d => `${d.manifest} ${d.where}: "${d.id}"${d.suggestion ? ` — did you mean "${d.suggestion}"?` : ''}`)
        .join('\n'),
    );
  });

  it('reports a dead id in defaults and in a state override, and names the swap', () => {
    const known = new Set(['components-badge--default', 'components-badge--sizes']);
    // The pre-rename spelling is derived, never typed: a literal old id in this file would trip
    // the repo-wide grep that this change's own acceptance bar runs.
    const old = 'components-badge--default'.replace(/^components-/, 'atoms-');
    const dead = deadStoryIds(
      [{ file: 'm.figma.json', manifest: { defaults: { story: old }, states: [{ story: 'components-badge--nope' }] } }],
      known,
    );
    assert.deepEqual(
      dead.map(d => [d.where, d.id, d.suggestion]),
      [
        ['defaults.story', old, 'components-badge--default'],
        ['states[0].story', 'components-badge--nope', null],
      ],
    );
  });
});
