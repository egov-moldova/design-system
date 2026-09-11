/**
 * Repo invariant: every form-associated component reflects its `name`.
 *
 * A form-associated custom element is submitted under its host `name` CONTENT
 * attribute — `ElementInternals` never consults the IDL property. A `@Prop()`
 * that does not reflect therefore drops the control from the submission
 * whenever `name` is assigned as a property, which is what every framework
 * binding does. The failure is silent: no error, no warning, just a missing
 * field. See GitHub issue #10.
 *
 * This is a source-shape ratchet, not a substitute for the behavioural tests in
 * `src/components/mud-checkbox/test/`: it cannot prove submission works, only
 * that no component is declared in the shape known to break it.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { extractContractFromTsx } from '../audit/14-component-contract.mjs';

const COMPONENTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/components');

/**
 * Every component `.tsx` under `src/components`, found by walking files rather
 * than directories: `mud-header-nav-item.tsx` lives inside `mud-header/`, so
 * a directory-per-component listing would silently skip it — and skipping is
 * the one failure mode a ratchet must not have.
 */
function listComponentSources(dir = COMPONENTS_ROOT, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'test' || entry === '_agents') continue;
      listComponentSources(full, out);
      continue;
    }
    if (!entry.endsWith('.tsx') || entry.endsWith('.spec.tsx')) continue;
    out.push(full);
  }
  return out;
}

/**
 * Read every component source, turning a THROW into data rather than letting it
 * escape. Called from inside each test, not at module scope: a throw during
 * module evaluation aborts the whole file before a single `it()` registers, so
 * `node --test` reports a load failure with a raw compiler stack and names no
 * path — the silent-drop failure this suite exists to prevent, wearing a
 * different hat.
 */
function readContracts() {
  return listComponentSources().map(tsxPath => {
    try {
      // The extractor returns an envelope, not the contract: `contract` is null
      // on any file with no @Component class, so every read below is guarded.
      return {
        tsxPath,
        contract: extractContractFromTsx(tsxPath, path.basename(tsxPath, '.tsx')).contract,
        threw: null,
      };
    } catch (error) {
      return { tsxPath, contract: null, threw: error };
    }
  });
}

describe('form-associated components', () => {
  // A file the extractor cannot read yields a null contract, and a null drops
  // out of BOTH the count below and the offenders loop underneath it — so a
  // component whose `@Component` decorator the TypeScript scan stops matching
  // would be graded by neither, silently, while both tests stayed green. The
  // floor below cannot catch that: it only counts what survived. Every `.tsx`
  // under `src/components` parses today, so this needs no exemption list.
  it('reads a contract from every component source (no silent drops)', () => {
    const unreadable = readContracts()
      .filter(({ contract }) => contract === null)
      .map(
        ({ tsxPath, threw }) =>
          `${path.relative(COMPONENTS_ROOT, tsxPath)}${threw ? ` — threw: ${threw.message}` : ''}`,
      );
    assert.deepEqual(
      unreadable,
      [],
      `the contract extractor returned nothing for these files, so they were graded by no assertion below:\n  ${unreadable.join('\n  ')}`,
    );
  });

  it('finds the form-associated set (guards against a vacuous scan)', () => {
    const formAssociated = readContracts().filter(c => c.contract?.formAssociated === true);
    // A floor, not an equality: adding a form-associated component must not
    // fail this. It sits at today's count because the point is to catch the
    // scan collapsing, not to track the roster — so a legitimate REMOVAL is
    // expected to fail here once, and the fix is to lower the number in the
    // same commit that removes the component.
    assert.ok(
      formAssociated.length >= 16,
      `expected at least 16 form-associated components, found ${formAssociated.length}. ` +
        'Either a component was legitimately removed — lower this floor in that same commit — ' +
        'or the scan stopped seeing them, in which case every assertion below is grading a subset.',
    );
  });

  it('declares `name` with reflect: true on every one of them', () => {
    const offenders = [];
    for (const { tsxPath, contract } of readContracts()) {
      if (contract?.formAssociated !== true) continue;
      const where = path.relative(COMPONENTS_ROOT, tsxPath);
      const nameProp = (contract.props ?? []).find(p => p.name === 'name');
      // A missing `name` prop is an offender, never a `continue`. Skipping it
      // would make this assertion vacuous exactly when the extractor stops
      // reporting props under that key — the assertion would then grade nothing
      // and still pass, which is the failure the guard above exists to prevent,
      // one level down. A form-associated control with no `name` cannot take
      // part in a submission anyway, so there is nothing to exempt.
      if (!nameProp) {
        offenders.push(`${where} — form-associated but declares no \`name\` prop`);
        continue;
      }
      if (nameProp.reflect !== true) {
        offenders.push(`${where}:${nameProp.line} — \`name\` without reflect: true`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `these form-associated components cannot submit a property-assigned name:\n  ${offenders.join('\n  ')}`,
    );
  });
});
