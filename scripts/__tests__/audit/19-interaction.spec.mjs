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
  countRenderedChildren,
  judgeBx1Hydration,
  isBx4Applicable,
  judgeBx4Opened,
  declaresPopup,
  judgeBx4Escape,
  judgeBx5StructuralDiff,
  isBx7Applicable,
  isCheckableControl,
  judgeBx7,
  judgeBx7FormRoundTrip,
  notApplicable,
} from '../../audit/19-interaction.mjs';

describe('19-interaction: countRenderedChildren (S12)', () => {
  it('counts every node with no exclusion mark', () => {
    assert.equal(countRenderedChildren([{ noMotionMark: false }, { noMotionMark: false }]), 2);
  });

  it('excludes the audit-injected [data-audit-no-motion] style node', () => {
    // Before S12, the injected `<style data-audit-no-motion>` (applyNoMotionStyle,
    // 09-a11y-tree.mjs) counted as a rendered child of the shadow root.
    assert.equal(countRenderedChildren([{ noMotionMark: true }]), 0);
    assert.equal(countRenderedChildren([{ noMotionMark: true }, { noMotionMark: false }]), 1);
  });

  it('handles an empty or missing list', () => {
    assert.equal(countRenderedChildren([]), 0);
    assert.equal(countRenderedChildren(undefined), 0);
  });
});

describe('19-interaction: judgeBx1Hydration', () => {
  it('passes a hydrated host with rendered children', () => {
    assert.equal(judgeBx1Hydration({ found: true, hydrated: true, nodes: [{ noMotionMark: false }] }), null);
  });

  it('flags a missing host', () => {
    const f = judgeBx1Hydration({ found: false, hydrated: false, nodes: [] });
    assert.equal(f.code, 'INTERACTION-BX1-NOT-FOUND');
  });

  it('flags a host without the hydrated class', () => {
    const f = judgeBx1Hydration({ found: true, hydrated: false, nodes: [{ noMotionMark: false }] });
    assert.equal(f.code, 'INTERACTION-BX1-NOT-HYDRATED');
  });

  it('flags a hydrated host with zero rendered children', () => {
    const f = judgeBx1Hydration({ found: true, hydrated: true, nodes: [] });
    assert.equal(f.code, 'INTERACTION-BX1-NOT-HYDRATED');
  });

  it('flags a hydrated host whose only child is the audit-injected style node (S12)', () => {
    const f = judgeBx1Hydration({ found: true, hydrated: true, nodes: [{ noMotionMark: true }] });
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

  // mud-breadcrumb-item: `active` (a plain @Prop, not open/close/toggle) is not
  // an overlay, and the archetype is not OVERLAY — not applicable.
  it('mud-breadcrumb-item: active is not an overlay signal → not applicable', () => {
    assert.equal(isBx4Applicable({ archetype: { value: 'STATUS' }, methods: [], props: [{ name: 'active' }] }), false);
  });
});

describe('19-interaction: judgeBx4Opened (S12 — rendered change, never host.open)', () => {
  it('true when the visible tag signature changes', () => {
    // mud-accordion-item: setOpen(true) flips `hidden` on the panel
    // (role="region"), which VISIBLE_SIGNATURE_FN excludes while hidden.
    const before = { tags: ['button', 'div', 'span'], ariaExpanded: null };
    const after = { tags: ['button', 'div', 'div', 'div', 'span'], ariaExpanded: null };
    assert.equal(judgeBx4Opened(before, after), true);
  });

  it('true when aria-expanded flips from not-true to true', () => {
    const before = { tags: ['button'], ariaExpanded: false };
    const after = { tags: ['button'], ariaExpanded: true };
    assert.equal(judgeBx4Opened(before, after), true);
  });

  it('false when nothing rendered changes (e.g. mud-tooltip whose open method/prop produced no visible diff)', () => {
    const same = { tags: ['button', 'span'], ariaExpanded: null };
    assert.equal(judgeBx4Opened(same, { ...same }), false);
  });

  it('never reads a host `open` property — it is not part of the signature at all', () => {
    const before = { tags: ['button'], ariaExpanded: null, open: false };
    const after = { tags: ['button'], ariaExpanded: null, open: true };
    assert.equal(judgeBx4Opened(before, after), false);
  });

  it('handles missing captures', () => {
    assert.equal(judgeBx4Opened(null, { tags: [] }), false);
    assert.equal(judgeBx4Opened({ tags: [] }, null), false);
  });
});

describe('19-interaction: declaresPopup (S12)', () => {
  it('true for a dialog/alertdialog role', () => {
    assert.equal(declaresPopup(null, { hasDialog: true }), true);
  });

  it('true for a [popover] attribute', () => {
    assert.equal(declaresPopup(null, { hasPopover: true }), true);
  });

  it('true for [aria-haspopup]', () => {
    assert.equal(declaresPopup(null, { hasAriaHaspopup: true }), true);
  });

  it('true for [aria-modal="true"]', () => {
    assert.equal(declaresPopup(null, { hasAriaModal: true }), true);
  });

  it('false when none of the markers are present', () => {
    assert.equal(
      declaresPopup(null, { hasDialog: false, hasPopover: false, hasAriaHaspopup: false, hasAriaModal: false }),
      false,
    );
  });

  it('handles a missing dom capture', () => {
    assert.equal(declaresPopup(null, null), false);
  });
});

describe('19-interaction: judgeBx4Escape', () => {
  it('passes when the overlay closes and focus is not left inside it', () => {
    assert.equal(judgeBx4Escape({ opened: true, stillOpen: false, focusTrappedInClosedOverlay: false }), null);
  });

  it('flags a keyboard trap (overlay still open)', () => {
    const f = judgeBx4Escape({ opened: true, stillOpen: true, focusTrappedInClosedOverlay: false });
    assert.equal(f.code, 'INTERACTION-BX4-ESCAPE-NO-CLOSE');
  });

  it('flags focus stranded inside the now-closed overlay', () => {
    const f = judgeBx4Escape({ opened: true, stillOpen: false, focusTrappedInClosedOverlay: true });
    assert.equal(f.code, 'INTERACTION-BX4-FOCUS-TRAPPED');
  });

  it('returns null when it never opened (that case is a noTarget finding / not-applicable, decided by the caller)', () => {
    assert.equal(judgeBx4Escape({ opened: false, declaresPopup: true }), null);
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

describe('19-interaction: judgeBx7 (S12 — value comparison)', () => {
  it('false when the submitted value matches the expected one', () => {
    assert.equal(judgeBx7('audit-value', 'audit-value'), false);
  });

  it('true when the submitted value differs from the expected one', () => {
    assert.equal(judgeBx7('', 'audit-value'), true);
    assert.equal(judgeBx7(null, 'audit-value'), true);
  });
});

describe('19-interaction: judgeBx7FormRoundTrip', () => {
  it('passes when FormData carries the key, the expected value, and every setFormValue call used 2 args', () => {
    assert.equal(
      judgeBx7FormRoundTrip({
        found: true,
        formDataHasKey: true,
        formDataKey: 'value',
        formDataValue: 'audit-value',
        expectedValue: 'audit-value',
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
      formDataValue: 'audit-value',
      expectedValue: 'audit-value',
      setFormValueCallArgCounts: [2, 1],
    });
    assert.equal(f.code, 'INTERACTION-BX7-SETFORMVALUE-ONE-ARG');
  });

  // S12: before this fix, only `formDataHasKey` was checked — a component
  // submitting the wrong value under the right key passed silently.
  it('flags a submitted value that does not match the value the audit set', () => {
    const f = judgeBx7FormRoundTrip({
      found: true,
      formDataHasKey: true,
      formDataKey: 'value',
      formDataValue: 'wrong',
      expectedValue: 'audit-value',
      setFormValueCallArgCounts: [2],
    });
    assert.equal(f.code, 'INTERACTION-BX7-VALUE-MISMATCH');
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
