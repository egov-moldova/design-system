/**
 * Smoke tests for scripts/audit/01-component-structure.mjs
 *
 * Strategy:
 *   - Use a real repo component (cor-button) as the "happy path" — it should pass.
 *   - Fabricate target objects with selective `exists` flags to exercise the
 *     pure analyzeComponent() without touching the filesystem.
 *   - Verify the JSON envelope shape (severity codes, exit-code derivation).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeComponent, REQUIRED_KINDS, OPTIONAL_KINDS, TOOL } from '../../audit/01-component-structure.mjs';
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';
import { buildResult } from '../../audit/lib/json-output.mjs';

describe('01-component-structure', () => {
  describe('analyzeComponent — real component', () => {
    it('cor-button passes (all required files present, components location)', () => {
      const target = resolveComponentPaths('cor-button');
      assert.equal(target.found, true);
      assert.equal(target.location, 'components');

      const { findings, requiredMissing } = analyzeComponent(target);
      assert.equal(requiredMissing, 0, 'cor-button must have all required files');

      const errors = findings.filter(f => f.severity === 'error');
      assert.deepEqual(errors, [], 'cor-button should produce zero errors');
    });

    it('cor-input and cor-tooltip both have all required files', () => {
      for (const name of ['cor-input', 'cor-tooltip']) {
        const target = resolveComponentPaths(name);
        assert.equal(target.found, true, `${name} should be found`);
        const { requiredMissing } = analyzeComponent(target);
        assert.equal(requiredMissing, 0, `${name} should have all required files`);
      }
    });
  });

  describe('analyzeComponent — synthetic missing-file targets', () => {
    function makeTarget(overrides = {}) {
      const base = resolveComponentPaths('cor-button');
      // Clone exists map so we can mutate
      return {
        ...base,
        exists: { ...base.exists, ...overrides },
      };
    }

    it('flags missing required file as error with STRUCTURE-MISSING-REQUIRED code', () => {
      const target = makeTarget({ tsx: false });
      const { findings, requiredMissing } = analyzeComponent(target);
      assert.equal(requiredMissing, 1);

      const errors = findings.filter(f => f.code === 'STRUCTURE-MISSING-REQUIRED');
      assert.equal(errors.length, 1);
      assert.equal(errors[0].severity, 'error');
      assert.match(errors[0].file, /cor-button\.tsx$/);
    });

    it('flags missing tokens file as warning, not error', () => {
      const target = makeTarget({ tokens: false });
      const { findings } = analyzeComponent(target);
      const warns = findings.filter(f => f.code === 'STRUCTURE-MISSING-TOKENS');
      assert.equal(warns.length, 1);
      assert.equal(warns[0].severity, 'warning');
    });

    it('reports hidden components as STRUCTURE-UNGRADUATED (info, not blocking)', () => {
      const target = { ...makeTarget(), location: 'hidden' };
      const { findings } = analyzeComponent(target);
      const ungraduated = findings.find(f => f.code === 'STRUCTURE-UNGRADUATED');
      assert.ok(ungraduated, 'expected STRUCTURE-UNGRADUATED finding');
      assert.equal(ungraduated.severity, 'info');
    });

    it('all optional missing → info-level only (never errors)', () => {
      const target = makeTarget({ types: false, enums: false, constants: false, e2e: false });
      const { findings } = analyzeComponent(target);
      const optionalErrors = findings.filter(f => f.code === 'STRUCTURE-OPTIONAL-MISSING' && f.severity === 'error');
      assert.deepEqual(optionalErrors, []);
    });
  });

  describe('analyzeComponent — invalid/not-found input', () => {
    it('returns STRUCTURE-NOT-FOUND error for invalid name', () => {
      const target = resolveComponentPaths('NOT a valid component!');
      const { findings } = analyzeComponent(target);
      assert.equal(findings[0].code, 'STRUCTURE-NOT-FOUND');
      assert.equal(findings[0].severity, 'error');
    });

    it('returns STRUCTURE-NOT-FOUND for component that does not exist', () => {
      const target = resolveComponentPaths('cor-this-does-not-exist-xyz');
      const { findings } = analyzeComponent(target);
      assert.equal(findings.find(f => f.code === 'STRUCTURE-NOT-FOUND')?.severity, 'error');
    });
  });

  describe('JSON envelope', () => {
    it('exit-code rule: ok iff zero errors (warnings are non-fatal)', () => {
      const result = buildResult({
        tool: TOOL,
        target: 'cor-fake',
        findings: [
          { severity: 'warning', code: 'X', message: 'w' },
          { severity: 'info', code: 'Y', message: 'i' },
        ],
      });
      assert.equal(result.ok, true);
      assert.equal(result.summary.errors, 0);
      assert.equal(result.summary.warnings, 1);
    });

    it('errors flip ok=false', () => {
      const result = buildResult({
        tool: TOOL,
        target: 'cor-fake',
        findings: [{ severity: 'error', code: 'X', message: 'e' }],
      });
      assert.equal(result.ok, false);
      assert.equal(result.summary.errors, 1);
    });
  });

  describe('constants sanity', () => {
    it('REQUIRED_KINDS covers tsx/css/stories/spec/readme (production gate)', () => {
      for (const k of ['tsx', 'css', 'stories', 'spec', 'readme']) {
        assert.ok(REQUIRED_KINDS.includes(k), `REQUIRED_KINDS should include ${k}`);
      }
    });

    it('OPTIONAL_KINDS includes types/enums/constants/e2e', () => {
      for (const k of ['types', 'enums', 'constants', 'e2e']) {
        assert.ok(OPTIONAL_KINDS.includes(k), `OPTIONAL_KINDS should include ${k}`);
      }
    });
  });
});
