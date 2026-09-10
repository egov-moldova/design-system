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
 * than directories: `mud-accordion-item.tsx` lives inside `mud-accordion/`, so
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

const contracts = listComponentSources().map(tsxPath => ({
  tsxPath,
  // The extractor returns an envelope, not the contract: `contract` is null on
  // any file with no @Component class, which is why every read below is guarded.
  contract: extractContractFromTsx(tsxPath, path.basename(tsxPath, '.tsx')).contract,
}));

describe('form-associated components', () => {
  // A file the extractor cannot read returns a null contract, and a null drops
  // out of BOTH the count below and the offenders loop underneath it — so a
  // component whose `@Component` decorator the TypeScript scan stops matching
  // would be graded by neither, silently, while both tests stayed green. The
  // floor below cannot catch that: it only counts what survived. Every `.tsx`
  // under `src/components` parses today, so this needs no exemption list.
  it('reads a contract from every component source (no silent drops)', () => {
    const unreadable = contracts
      .filter(({ contract }) => contract === null)
      .map(({ tsxPath }) => path.relative(COMPONENTS_ROOT, tsxPath));
    assert.deepEqual(
      unreadable,
      [],
      `the contract extractor returned nothing for these files, so they were graded by no assertion below:\n  ${unreadable.join('\n  ')}`,
    );
  });

  it('finds the form-associated set (guards against a vacuous scan)', () => {
    const formAssociated = contracts.filter(c => c.contract?.formAssociated === true);
    assert.ok(
      formAssociated.length >= 16,
      `expected at least 16 form-associated components, found ${formAssociated.length} — ` +
        'either the extractor stopped reading decorator options or the scan root is wrong',
    );
  });

  it('declares `name` with reflect: true on every one of them', () => {
    const offenders = [];
    for (const { tsxPath, contract } of contracts) {
      if (contract?.formAssociated !== true) continue;
      const nameProp = (contract.props ?? []).find(p => p.name === 'name');
      if (!nameProp) continue;
      if (nameProp.reflect !== true) {
        offenders.push(`${path.relative(COMPONENTS_ROOT, tsxPath)}:${nameProp.line}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `these form-associated components declare \`name\` without reflect: true, so a ` +
        `property-assigned name is dropped from FormData:\n  ${offenders.join('\n  ')}`,
    );
  });
});
