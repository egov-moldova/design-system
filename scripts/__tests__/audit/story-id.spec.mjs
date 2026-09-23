/**
 * The story id every browser row navigates to.
 *
 * The audit used to build it by kebab-casing both halves of `title` +
 * export name. Storybook does not: an export name is split into words first
 * (`AllPlacements` → "All Placements" → `all-placements`), a title is only
 * lowercased (`InfoBox` → `infobox`). Rows therefore navigated to ids that did
 * not exist for any component whose title is one PascalCase word made of
 * several — 15 of 435 ids across this repo, all of mud-info-box and
 * mud-inline-message. Storybook answered `NoStoryMatchError` inside the page,
 * which nothing read.
 *
 * The fix is to delegate to Storybook's own `toId`. These tests exist to keep
 * a hand-rolled kebab-case from coming back: they compare against `toId`
 * directly, so they follow the pinned Storybook rather than a copy of it.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { storyNameFromExport, toId } from 'storybook/internal/csf/csf-utils';

import { storyIdFor, inferStoryId } from '../../audit/lib/storybook-helpers.mjs';
import { buildStoryId } from '../../audit/05-story-exports.mjs';

const CASES = [
  ['Atoms/Button', 'Default'],
  ['Atoms/InfoBox', 'Default'],
  ['Atoms/InlineMessage', 'EdgeCases'],
  ['Atoms/TextInput', 'Default'],
  ['Molecules/Tooltip', 'AllPlacements'],
  ['Organisms/Modal', 'CoverageGuard'],
];

describe('story ids: the audit navigates to what Storybook serves', () => {
  for (const [title, exportName] of CASES) {
    it(`${title} / ${exportName} matches Storybook's own toId`, () => {
      assert.equal(storyIdFor(title, exportName), toId(title, storyNameFromExport(exportName)));
    });
  }

  it('a multi-word PascalCase title is one lowercase word, not kebab-cased', () => {
    // The exact regression: `atoms-info-box--default` is the id that did not exist.
    assert.equal(storyIdFor('Atoms/InfoBox', 'Default'), 'atoms-infobox--default');
    assert.equal(storyIdFor('Atoms/InlineMessage', 'Default'), 'atoms-inlinemessage--default');
  });

  it('a multi-word export name IS split into words — the two halves differ', () => {
    assert.equal(storyIdFor('Atoms/Button', 'AllVariants'), 'atoms-button--all-variants');
  });

  it('is null when either half is missing, so a caller never builds "undefined--default"', () => {
    assert.equal(storyIdFor(null, 'Default'), null);
    assert.equal(storyIdFor('Atoms/Button', ''), null);
  });
});

describe('story ids: one builder, not three', () => {
  it('05-story-exports re-exports it — the two copies that drifted are gone', () => {
    for (const [title, exportName] of CASES) {
      assert.equal(buildStoryId(title, exportName), storyIdFor(title, exportName));
    }
  });

  it('inferStoryId is the same function, so the browser rows cannot disagree with 05', () => {
    assert.equal(inferStoryId, storyIdFor);
  });
});
