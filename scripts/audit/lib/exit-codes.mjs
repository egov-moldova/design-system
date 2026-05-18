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
