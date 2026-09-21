/**
 * Tests for scripts/audit/lib/fix-brief.mjs — every non-PASS entry carries
 * every field of its state's shape (Design §2), one case per state.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BRIEF_FIELDS, renderEntry, renderFixBrief } from '../../audit/lib/fix-brief.mjs';
import { computeVerdict } from '../../audit/verdict.mjs';
import { FIGMA_ABSENT, aiFindings, cleanEnvelope, withError } from './__fixtures__/verdict/envelope.mjs';

/** Each field of the kind's shape appears as its own `- <field>:` line of the entry's block. */
function assertShape(brief, entry) {
  const start = brief.indexOf(`### ${entry.id} · ${entry.kind}`);
  assert.ok(start >= 0, `block for ${entry.id} not rendered`);
  const end = brief.indexOf('\n### ', start + 1);
  const block = brief.slice(start, end === -1 ? undefined : end);
  for (const field of BRIEF_FIELDS[entry.kind]) {
    assert.match(block, new RegExp(`^- ${field}:`, 'm'), `${entry.id} lacks ${field}`);
  }
  return block;
}

describe('fix-brief: one shape per state', () => {
  it('FAIL: ID · severity · check · location · expected (value + source) · actual · verify · owner', () => {
    const v = computeVerdict({
      envelope: withError(cleanEnvelope(), '15', {
        code: 'STYLE-MISMATCH',
        file: '.audit-figma/mud-fx/manifest@HEAD.json',
        expected: { value: '#f5f5f5', source: 'Figma 489:9029' },
        actual: '#e8f0fb',
      }),
    });
    const brief = renderFixBrief(v);
    const entry = v.entries.find(e => e.kind === 'FAIL');
    const block = assertShape(brief, entry);
    assert.match(block, /- expected: #f5f5f5 \(source: Figma 489:9029\)/);
    assert.match(block, /- location: src\/components\/mud-fx\/test\/mud-fx\.figma\.json:7/);
    assert.match(block, /- verify: `node scripts\/audit\/run-all\.mjs mud-fx --depth standard --only 15 --json`/);
  });

  it('FAIL from a rule finding with no structured expected value still names a value and a source', () => {
    const v = computeVerdict({ envelope: withError(cleanEnvelope(), '02', { fix: 'use a token' }) });
    const block = assertShape(renderFixBrief(v), v.entries[0]);
    assert.match(block, /- expected: no FIXTURE-ERROR finding — use a token \(source: rule FIXTURE-ERROR/);
  });

  it('INCOMPLETE: ID · check · cause · prerequisite · verify', () => {
    const e = cleanEnvelope();
    Object.assign(
      e.results.find(r => r.id === '06'),
      {
        status: 'missing-prereq',
        summary: null,
        exitCode: 2,
        prerequisite: 'yarn vitest run --project spec --coverage src/components/mud-fx',
      },
    );
    const v = computeVerdict({ envelope: e });
    const block = assertShape(renderFixBrief(v), v.entries[0]);
    assert.match(block, /- prerequisite: yarn vitest run --project spec --coverage src\/components\/mud-fx/);
    assert.match(block, /- verify: `node scripts\/audit\/run-all\.mjs mud-fx --depth standard --only 06 --json`/);
  });

  it('NEEDS-DECISION: ID · Figma node (or "no manifest") · question · options', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ figma: FIGMA_ABSENT }) });
    const brief = renderFixBrief(v);
    const block = assertShape(brief, v.entries[0]);
    assert.match(block, /- node: no manifest/);
    assert.match(block, /^ {2}1\. /m);
    assert.match(block, /^ {2}3\. /m);
  });

  it('Advisory: AI findings at standard in the FAIL shape, under "Advisory"', () => {
    const v = computeVerdict({
      envelope: cleanEnvelope(),
      aiFiles: [
        {
          leg: 'a11y-verifier',
          data: aiFindings('a11y-verifier', { findings: [{ severity: 'error', code: 'CX1', message: 'focus lost' }] }),
        },
      ],
    });
    const brief = renderFixBrief(v, { run: 'run-7' });
    assert.equal(v.state, 'PASS');
    const advisoryAt = brief.indexOf('## Advisory');
    assert.ok(advisoryAt > 0);
    const block = assertShape(brief.slice(advisoryAt), v.advisory[0]);
    assert.match(block, /audit\/mud-fx\/runs\/run-7/, 'the run placeholder is filled in the brief');
  });

  it('lists the Figma checks that did not run under --no-figma', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ noFigma: true, figma: null }) });
    const brief = renderFixBrief(v);
    assert.match(brief, /## Checks not run \(excused\)/);
    assert.match(brief, /- 11 — figma: waived \(flag\)/);
    assert.match(brief, /- 15 — figma: waived \(flag\)/);
  });
});

describe('fix-brief: a missing field fails the renderer', () => {
  const complete = {
    'FAIL': {
      id: 'F1',
      kind: 'FAIL',
      severity: 'error',
      check: '02 antipatterns',
      location: 'a.tsx:1',
      expected: { value: 'x', source: 'rule' },
      actual: 'y',
      verify: 'cmd',
      owner: '/modify-component',
    },
    'INCOMPLETE': { id: 'I1', kind: 'INCOMPLETE', check: '06', cause: 'c', prerequisite: 'p', verify: 'v' },
    'NEEDS-DECISION': { id: 'D1', kind: 'NEEDS-DECISION', node: 'no manifest', question: 'q?', options: ['a'] },
  };

  for (const [kind, entry] of Object.entries(complete)) {
    for (const field of BRIEF_FIELDS[kind]) {
      it(`${kind} without ${field} throws`, () => {
        assert.doesNotThrow(() => renderEntry(entry));
        const broken = { ...entry };
        delete broken[field];
        assert.throws(() => renderEntry(broken), new RegExp(`missing ${field}`));
      });
    }
  }

  it('an expected value without its source throws', () => {
    assert.throws(() => renderEntry({ ...complete.FAIL, expected: { value: 'x' } }), /missing expected/);
  });
});
