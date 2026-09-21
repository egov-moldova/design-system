/**
 * Smoke tests for scripts/audit/19-interaction.mjs
 *
 * Pure judgment functions only, exercised against captured-data fixtures —
 * the browser-driving flow (BX1/BX4/BX5/BX7 capture) is integration-tested
 * manually against a live Storybook, same convention as 09/12.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  judgeBx1Hydration,
  isBx4Applicable,
  judgeBx4Escape,
  judgeBx5StructuralDiff,
  isBx7Applicable,
  isCheckableControl,
  judgeBx7FormRoundTrip,
  notApplicable,
} from '../../audit/19-interaction.mjs';

describe('19-interaction: judgeBx1Hydration', () => {
  it('passes a hydrated host with children', () => {
    assert.equal(judgeBx1Hydration({ found: true, hydrated: true, childCount: 3 }), null);
  });

  it('flags a missing host', () => {
    const f = judgeBx1Hydration({ found: false, hydrated: false, childCount: 0 });
    assert.equal(f.code, 'INTERACTION-BX1-NOT-FOUND');
  });

  it('flags a host without the hydrated class', () => {
    const f = judgeBx1Hydration({ found: true, hydrated: false, childCount: 2 });
    assert.equal(f.code, 'INTERACTION-BX1-NOT-HYDRATED');
  });

  it('flags a hydrated host with zero children', () => {
    const f = judgeBx1Hydration({ found: true, hydrated: true, childCount: 0 });
    assert.equal(f.code, 'INTERACTION-BX1-NOT-HYDRATED');
  });

  it('handles a null/undefined capture', () => {
    const f = judgeBx1Hydration(null);
    assert.equal(f.code, 'INTERACTION-BX1-NOT-FOUND');
  });
});

describe('19-interaction: isBx4Applicable', () => {
  it('applies for OVERLAY archetype', () => {
    assert.equal(isBx4Applicable({ archetype: { value: 'OVERLAY' }, methods: [] }), true);
  });

  it('applies when an open/close/toggle @Method exists regardless of archetype', () => {
    assert.equal(isBx4Applicable({ archetype: { value: 'ACTION' }, methods: [{ name: 'close' }] }), true);
    assert.equal(isBx4Applicable({ archetype: { value: 'ACTION' }, methods: [{ name: 'toggleOpen' }] }), false);
    assert.equal(isBx4Applicable({ archetype: { value: 'ACTION' }, methods: [{ name: 'toggle' }] }), true);
  });

  it('does not apply for a plain ACTION with no matching method', () => {
    assert.equal(isBx4Applicable({ archetype: { value: 'ACTION' }, methods: [{ name: 'submit' }] }), false);
  });

  it('handles a missing contract', () => {
    assert.equal(isBx4Applicable(null), false);
  });
});

describe('19-interaction: judgeBx4Escape', () => {
  it('passes when the overlay closes and focus is not left inside it', () => {
    assert.equal(judgeBx4Escape({ stillOpen: false, focusTrappedInClosedOverlay: false }), null);
  });

  it('flags a keyboard trap (overlay still open)', () => {
    const f = judgeBx4Escape({ stillOpen: true, focusTrappedInClosedOverlay: false });
    assert.equal(f.code, 'INTERACTION-BX4-ESCAPE-NO-CLOSE');
  });

  it('flags focus stranded inside the now-closed overlay', () => {
    const f = judgeBx4Escape({ stillOpen: false, focusTrappedInClosedOverlay: true });
    assert.equal(f.code, 'INTERACTION-BX4-FOCUS-TRAPPED');
  });

  it('returns null for a null capture (not applicable)', () => {
    assert.equal(judgeBx4Escape(null), null);
  });
});

describe('19-interaction: judgeBx5StructuralDiff', () => {
  it('passes when light and dark trees match', () => {
    const signature = { count: 3, tags: ['button', 'div', 'span'] };
    assert.equal(judgeBx5StructuralDiff({ light: signature, dark: { ...signature } }), null);
  });

  it('flags a differing element count', () => {
    const f = judgeBx5StructuralDiff({
      light: { count: 3, tags: ['button', 'div', 'span'] },
      dark: { count: 2, tags: ['button', 'div'] },
    });
    assert.equal(f.code, 'INTERACTION-BX5-STRUCTURAL-DIFF');
  });

  it('flags a same-count but differing tag set', () => {
    const f = judgeBx5StructuralDiff({
      light: { count: 2, tags: ['button', 'div'] },
      dark: { count: 2, tags: ['button', 'span'] },
    });
    assert.equal(f.code, 'INTERACTION-BX5-STRUCTURAL-DIFF');
  });

  it('returns null when data is missing', () => {
    assert.equal(judgeBx5StructuralDiff({}), null);
  });
});

describe('19-interaction: isBx7Applicable', () => {
  it('applies only to the FORM archetype', () => {
    assert.equal(isBx7Applicable({ archetype: { value: 'FORM' } }), true);
    assert.equal(isBx7Applicable({ archetype: { value: 'ACTION' } }), false);
    assert.equal(isBx7Applicable(null), false);
  });
});

describe('19-interaction: judgeBx7FormRoundTrip', () => {
  it('passes when FormData carries the key and every setFormValue call used 2 args', () => {
    assert.equal(
      judgeBx7FormRoundTrip({
        found: true,
        formDataHasKey: true,
        formDataKey: 'value',
        setFormValueCallArgCounts: [2, 2],
      }),
      null,
    );
  });

  it('flags a missing FormData key', () => {
    const f = judgeBx7FormRoundTrip({
      found: true,
      formDataHasKey: false,
      formDataKey: 'value',
      setFormValueCallArgCounts: [2],
    });
    assert.equal(f.code, 'INTERACTION-BX7-MISSING-FORMDATA-KEY');
  });

  it('flags a 1-arg setFormValue call', () => {
    const f = judgeBx7FormRoundTrip({
      found: true,
      formDataHasKey: true,
      formDataKey: 'value',
      setFormValueCallArgCounts: [2, 1],
    });
    assert.equal(f.code, 'INTERACTION-BX7-SETFORMVALUE-ONE-ARG');
  });

  it('returns null when not found (not applicable)', () => {
    assert.equal(judgeBx7FormRoundTrip({ found: false }), null);
  });

  // Finding 1 (BX7 no-name gate): before the fix, `runBx7` always probed
  // `data.get('')` for a story with no resolvable `name`, and
  // `judgeBx7FormRoundTrip` had no way to tell that apart from a real
  // missing-key defect — every unnamed story (e.g. mud-button's default
  // story) failed BX7 on every run. The fix makes `runBx7` report
  // `applicable: false` for that case; this proves the judge never turns it
  // into a finding.
  it('reports no finding when the capture is not applicable (no resolvable name)', () => {
    assert.equal(
      judgeBx7FormRoundTrip({ found: true, applicable: false, reason: 'story sets no resolvable "name"' }),
      null,
    );
  });
});

describe('19-interaction: isCheckableControl (Finding 1 — checked-based form round-trip)', () => {
  it('is true for a contract carrying a `checked` prop (mud-checkbox/mud-switch/mud-radio)', () => {
    assert.equal(isCheckableControl({ props: [{ name: 'checked' }, { name: 'disabled' }] }), true);
  });

  it('is false for a contract with no `checked` prop (e.g. mud-button)', () => {
    assert.equal(isCheckableControl({ props: [{ name: 'name' }, { name: 'disabled' }] }), false);
  });

  it('handles a missing contract', () => {
    assert.equal(isCheckableControl(null), false);
  });
});

describe('19-interaction: notApplicable (Finding 6)', () => {
  it('shapes a not-applicable meta.checks entry with its reason', () => {
    assert.deepEqual(notApplicable('no resolvable name'), { status: 'not-applicable', reason: 'no resolvable name' });
  });
});
