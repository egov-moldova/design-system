#!/usr/bin/env node
/**
 * Stand-in audit script for run-all / verdict specs. Emits a real envelope
 * through lib/json-output.mjs for the component it is given, with two info
 * findings a spec can read back through run-all's `findingsByTool`:
 * FIXTURE-ARGV (the argv run-all passed: `--manifest`, `--port`, `--part`)
 * and FIXTURE-MANIFEST (the text of the `--manifest` file it was given).
 *
 *   FIXTURE_FAIL_FOR=<component>  → one error-severity finding for that component
 *   FIXTURE_CRASH=1               → exit 2 with no envelope
 */
import { readFileSync } from 'node:fs';
import { buildResult, emit, finding } from '../../../../../audit/lib/json-output.mjs';

const [target, ...argv] = process.argv.slice(2);
const rest = argv.filter(a => a !== '--json');
if (process.env.FIXTURE_CRASH === '1') {
  process.stderr.write(`fixture-check: crashed at ${Date.now()}\n`);
  process.exit(2);
}
const findings = [finding({ severity: 'info', code: 'FIXTURE-ARGV', message: JSON.stringify(rest) })];
const manifestAt = rest.indexOf('--manifest');
if (manifestAt >= 0) {
  findings.push(
    finding({ severity: 'info', code: 'FIXTURE-MANIFEST', message: readFileSync(rest[manifestAt + 1], 'utf8') }),
  );
}
if (process.env.FIXTURE_FAIL_FOR === target) {
  findings.push(
    finding({
      severity: 'error',
      code: 'FIXTURE-ERROR',
      file: `src/components/${target}/${target}.tsx`,
      line: 3,
      message: 'seeded error',
    }),
  );
}
const result = buildResult({ tool: 'fixture-check', target, findings, meta: { durationMs: 1 } });
await emit(result, { json: true });
process.exit(result.summary.errors ? 1 : 0);
