/**
 * Smoke tests for scripts/audit/09-a11y-tree.mjs
 *
 * Pure helpers only — browser flow is tested manually once Playwright is
 * installed and Storybook is running.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { INTERACTIVE_TAGS, INTERACTIVE_ROLES, pickDefaultStoryId } from '../../audit/09-a11y-tree.mjs';
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';

describe('09-a11y-tree: interactive-element catalogues', () => {
  it('INTERACTIVE_TAGS includes the standard form/link tags', () => {
    for (const tag of ['button', 'a', 'input', 'select', 'textarea']) {
      assert.ok(INTERACTIVE_TAGS.includes(tag), `${tag} should be in INTERACTIVE_TAGS`);
    }
  });

  it('INTERACTIVE_ROLES includes the major ARIA widget roles', () => {
    for (const role of ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option']) {
      assert.ok(INTERACTIVE_ROLES.includes(role), `${role} should be in INTERACTIVE_ROLES`);
    }
  });

  it('catalogues are flat string arrays with no duplicates', () => {
    assert.equal(new Set(INTERACTIVE_TAGS).size, INTERACTIVE_TAGS.length);
    assert.equal(new Set(INTERACTIVE_ROLES).size, INTERACTIVE_ROLES.length);
  });
});

describe('09-a11y-tree: pickDefaultStoryId', () => {
  it('picks the Default-named story id when stories file exists', () => {
    const target = resolveComponentPaths('mud-tooltip');
    const id = pickDefaultStoryId(target);
    assert.match(id ?? '', /tooltip--default/);
  });

  it('falls back to the first story when no Default-named export exists', () => {
    // mud-button is the historical edge case — its only story is named "Button", not "Default"
    const target = resolveComponentPaths('mud-button');
    const id = pickDefaultStoryId(target);
    // Should not be null; either matches button--button (current mud-button) or atoms-button--default fallback
    assert.ok(id, 'expected a fallback story id to be returned');
  });

  it('returns an inferred id when stories file is missing', () => {
    const target = {
      ...resolveComponentPaths('mud-button'),
      exists: { ...resolveComponentPaths('mud-button').exists, stories: false },
      bare: 'button',
    };
    const id = pickDefaultStoryId(target);
    assert.equal(id, 'atoms-button--default');
  });
});
