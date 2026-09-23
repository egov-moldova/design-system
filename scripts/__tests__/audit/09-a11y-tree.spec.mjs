/**
 * Smoke tests for scripts/audit/09-a11y-tree.mjs
 *
 * Pure helpers only — browser flow is tested manually once Playwright is
 * installed and Storybook is running.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  INTERACTIVE_TAGS,
  INTERACTIVE_ROLES,
  pickDefaultStoryId,
  judgeTabOrder,
  judgeFocusRingVisible,
  computeExpectedTabStops,
  bx2StatusFor,
  bx3StatusFor,
  analyzeComponent,
} from '../../audit/09-a11y-tree.mjs';

describe('09-a11y-tree: R6 — bx2StatusFor / bx3StatusFor (extracted status assembly)', () => {
  it('bx2StatusFor: not-applicable when nothing is expected to take a Tab stop', () => {
    assert.deepEqual(bx2StatusFor([], null), {
      status: 'not-applicable',
      reason: 'no interactive element is expected to take a Tab stop',
    });
  });

  it('bx2StatusFor: ok when expected stops exist and judgeTabOrder found nothing', () => {
    assert.deepEqual(bx2StatusFor([{ tag: 'button' }], null), { status: 'ok' });
  });

  it('bx2StatusFor: fail when judgeTabOrder returned a finding', () => {
    assert.deepEqual(bx2StatusFor([{ tag: 'button' }], { code: 'A11Y-BX2-TAB-ORDER-GAP' }), { status: 'fail' });
  });

  it('bx3StatusFor: not-applicable when the Tab walk produced no stops', () => {
    assert.deepEqual(bx3StatusFor([], false), {
      status: 'not-applicable',
      reason: 'the Tab walk produced no stops inside the component',
    });
  });

  it('bx3StatusFor: ok when every step had a visible focus ring', () => {
    assert.deepEqual(bx3StatusFor([{ tag: 'button' }], false), { status: 'ok' });
  });

  it('bx3StatusFor: fail when any step lacked a visible focus ring', () => {
    assert.deepEqual(bx3StatusFor([{ tag: 'button' }], true), { status: 'fail' });
  });
});
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';

describe('09-a11y-tree: S6 — A11Y-NO-STORY carries noTarget (Decision §5)', () => {
  it('a component whose stories file exports nothing emits noTarget: true, no browser touched', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'a11y-no-story-'));
    const storiesPath = join(dir, 'mud-fx.stories.ts');
    writeFileSync(storiesPath, '// no exports\n');
    const target = {
      found: true,
      name: 'mud-fx',
      bare: 'fx',
      exists: { stories: true },
      paths: { stories: storiesPath },
    };
    const { findings } = await analyzeComponent(target, {});
    const f = findings.find(x => x.code === 'A11Y-NO-STORY');
    assert.ok(f);
    assert.equal(f.noTarget, true);
    rmSync(dir, { recursive: true, force: true });
  });
});

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

describe('09-a11y-tree: judgeTabOrder (BX2, pure)', () => {
  it('returns null when the Tab walk covers every census element (multiset match)', () => {
    const census = [
      { tag: 'button', role: null },
      { tag: 'input', role: 'textbox' },
    ];
    const tabWalk = [
      { tag: 'button', role: null },
      { tag: 'input', role: 'textbox' },
    ];
    assert.equal(judgeTabOrder(census, tabWalk), null);
  });

  it('returns null for an empty census (nothing to reach)', () => {
    assert.equal(judgeTabOrder([], []), null);
  });

  it('does not require the Tab walk to match census ORDER — only coverage', () => {
    const census = [
      { tag: 'button', role: null },
      { tag: 'input', role: 'textbox' },
    ];
    const tabWalk = [
      { tag: 'input', role: 'textbox' },
      { tag: 'button', role: null },
    ];
    assert.equal(judgeTabOrder(census, tabWalk), null);
  });

  it('flags a census element the Tab walk never reached', () => {
    const census = [
      { tag: 'button', role: null },
      { tag: 'input', role: 'textbox' },
    ];
    const finding = judgeTabOrder(census, [{ tag: 'button', role: null }]);
    assert.equal(finding.code, 'A11Y-BX2-TAB-ORDER-GAP');
    assert.match(finding.message, /input/);
  });

  it('counts duplicates: two identical census entries need two matching Tab stops', () => {
    const census = [
      { tag: 'button', role: null },
      { tag: 'button', role: null },
    ];
    const finding = judgeTabOrder(census, [{ tag: 'button', role: null }]);
    assert.equal(finding.code, 'A11Y-BX2-TAB-ORDER-GAP');
  });
});

describe('09-a11y-tree: judgeFocusRingVisible (BX3, pure)', () => {
  it('returns null when the outline is visible', () => {
    assert.equal(
      judgeFocusRingVisible({ tag: 'button', outlineWidth: '2px', outlineStyle: 'solid', boxShadow: 'none' }),
      null,
    );
  });

  it('returns null when the box-shadow carries a focus ring', () => {
    assert.equal(
      judgeFocusRingVisible({ tag: 'button', outlineWidth: '0px', outlineStyle: 'none', boxShadow: '0 0 0 2px blue' }),
      null,
    );
  });

  it('flags an invisible ring (outline 0px, boxShadow none) — the Phase 0 mid-transition case', () => {
    const finding = judgeFocusRingVisible({
      tag: 'button',
      outlineWidth: '0px',
      outlineStyle: 'none',
      boxShadow: 'none',
    });
    assert.equal(finding.code, 'A11Y-BX3-FOCUS-RING-INVISIBLE');
  });

  it('flags outline: none even with a non-zero width', () => {
    const finding = judgeFocusRingVisible({
      tag: 'button',
      outlineWidth: '2px',
      outlineStyle: 'none',
      boxShadow: 'none',
    });
    assert.equal(finding.code, 'A11Y-BX3-FOCUS-RING-INVISIBLE');
  });

  it('returns null for a null step (nothing sampled)', () => {
    assert.equal(judgeFocusRingVisible(null), null);
  });
});

describe('09-a11y-tree: computeExpectedTabStops (Finding 2 — BX2 census exclusions)', () => {
  it('excludes the host-origin boundary marker', () => {
    const census = [
      { tag: 'mud-button', origin: 'host' },
      { tag: 'button', origin: 'shadow' },
    ];
    const expected = computeExpectedTabStops(census);
    assert.equal(expected.length, 1);
    assert.equal(expected[0].tag, 'button');
  });

  it('excludes a disabled control', () => {
    const census = [{ tag: 'button', origin: 'shadow', disabled: true }];
    assert.deepEqual(computeExpectedTabStops(census), []);
  });

  it('excludes an element with tabindex="-1" (roving-tabindex group member)', () => {
    const census = [{ tag: 'div', role: 'tab', origin: 'shadow', tabIndexAttr: '-1' }];
    assert.deepEqual(computeExpectedTabStops(census), []);
  });

  it('excludes an <a> with no href', () => {
    const census = [{ tag: 'a', origin: 'light', hasHref: false }];
    assert.deepEqual(computeExpectedTabStops(census), []);
  });

  it('keeps an <a> that has an href', () => {
    const census = [{ tag: 'a', origin: 'light', hasHref: true }];
    assert.equal(computeExpectedTabStops(census).length, 1);
  });

  it('keeps only one radio per name group — the checked one', () => {
    const census = [
      { tag: 'input', inputType: 'radio', role: 'radio', origin: 'shadow', groupName: 'plan', checkedState: false },
      { tag: 'input', inputType: 'radio', role: 'radio', origin: 'shadow', groupName: 'plan', checkedState: true },
      { tag: 'input', inputType: 'radio', role: 'radio', origin: 'shadow', groupName: 'plan', checkedState: false },
    ];
    const expected = computeExpectedTabStops(census);
    assert.equal(expected.length, 1);
    assert.equal(expected[0].checkedState, true);
  });

  it('keeps the first radio in a group when none is checked', () => {
    const first = {
      tag: 'input',
      inputType: 'radio',
      role: 'radio',
      origin: 'shadow',
      groupName: 'plan',
      checkedState: false,
    };
    const second = {
      tag: 'input',
      inputType: 'radio',
      role: 'radio',
      origin: 'shadow',
      groupName: 'plan',
      checkedState: false,
    };
    const expected = computeExpectedTabStops([first, second]);
    assert.equal(expected.length, 1);
    assert.equal(expected[0], first);
  });

  it('excludes a hidden element (e.g. a closed overlay panel present but untabbable)', () => {
    const census = [{ tag: 'button', origin: 'shadow', visible: false }];
    assert.deepEqual(computeExpectedTabStops(census), []);
  });

  it('keeps a plain interactive element untouched', () => {
    const census = [{ tag: 'button', origin: 'shadow', disabled: false, tabIndexAttr: null, hasHref: null }];
    assert.equal(computeExpectedTabStops(census).length, 1);
  });

  // Regression proof for the finding: before this filter, a mud-button
  // story's census (host + one shadow <button>) fed straight into
  // judgeTabOrder unfiltered except for `origin !== 'host'`; a radio group's
  // extra members had no exclusion at all and inflated the expected count
  // past what Tab could ever reach — producing a false A11Y-BX2-TAB-ORDER-GAP.
  it('a filtered radio-group census no longer trips judgeTabOrder when only one radio is walked', () => {
    const rawCensus = [
      { tag: 'input', inputType: 'radio', role: 'radio', origin: 'shadow', groupName: 'plan', checkedState: true },
      { tag: 'input', inputType: 'radio', role: 'radio', origin: 'shadow', groupName: 'plan', checkedState: false },
      { tag: 'input', inputType: 'radio', role: 'radio', origin: 'shadow', groupName: 'plan', checkedState: false },
    ];
    const tabWalk = [{ tag: 'input', role: 'radio' }];
    assert.equal(judgeTabOrder(computeExpectedTabStops(rawCensus), tabWalk), null);
    // Unfiltered, the same data would have flagged a gap (proves the old shape failed).
    assert.notEqual(judgeTabOrder(rawCensus, tabWalk), null);
  });
});
