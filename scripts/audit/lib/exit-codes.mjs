/**
 * Standard exit codes for all scripts/audit/* scripts.
 *
 * Convention:
 *   0 — clean: no errors and no warnings that block CI
 *   1 — findings: at least one ERROR-severity finding (blocks CI / pre-PR)
 *   2 — internal: script crashed or input was invalid (usage error, file not found, etc.)
 *
 * Warning-only findings DO NOT change the exit code from 0. Callers that want
 * stricter behavior can read the JSON output and decide.
 */
import { STATE } from './json-output.mjs';

export const EXIT_CLEAN = 0;
export const EXIT_FINDINGS = 1;
export const EXIT_INTERNAL = 2;

/**
 * Choose exit code from a summary `{ errors, warnings, info }`.
 * Only `errors > 0` is fatal — warnings do not block.
 */
export function exitCodeFromSummary(summary) {
  return summary && summary.errors > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
}

/**
 * Exit status of `verdict.mjs` (and `yarn audit:component`), one per verdict
 * `state` (Design §1). Gate callers branch on this status, never on their own
 * reading of the verdict. 0 only on PASS; 2 stays "internal error", so no
 * state uses it. `run-all.mjs` does NOT use this map — its own exit keeps the
 * 0 / 1 / 2 meaning above.
 */
export const STATE_EXIT_CODES = Object.freeze({
  [STATE.PASS]: 0,
  [STATE.FAIL]: 1,
  [STATE.INCOMPLETE]: 3,
  [STATE.NEEDS_DECISION]: 4,
});

/** Exit code for a verdict state; an unknown state is INCOMPLETE, never PASS. */
export function exitCodeForState(state) {
  return STATE_EXIT_CODES[state] ?? STATE_EXIT_CODES[STATE.INCOMPLETE];
}
