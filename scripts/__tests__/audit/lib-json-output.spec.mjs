/**
 * Tests for scripts/audit/lib/json-output.mjs — the envelope writer every audit
 * script and `run-all.mjs` share.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const LIB = fileURLToPath(new URL('../../audit/lib/json-output.mjs', import.meta.url));

/**
 * Run a child that emits an envelope of `bytes` bytes as `--json` and then calls
 * `process.exit()` immediately — the exact shape of every audit script's
 * `main()` — and read its stdout through a pipe the way `run-all.mjs` does.
 */
function emitThroughPipe(bytes) {
  const child = `
    import { buildResult, emit } from ${JSON.stringify(LIB)};
    const result = buildResult({ tool: 'probe', target: 'x', findings: [], meta: { padding: 'x'.repeat(${bytes}) } });
    await emit(result, { json: true });
    process.exit(0);
  `;
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['--input-type=module', '-e', child], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let stdout = '';
    proc.stdout.on('data', chunk => {
      stdout += chunk;
    });
    proc.on('error', reject);
    proc.on('close', code => resolve({ code, stdout }));
  });
}

describe('json-output: emit', () => {
  it('delivers an envelope larger than the pipe buffer whole before the caller exits', async () => {
    // A pipe buffer is 64 KiB. Without awaiting the flush, `process.exit()` cut
    // the envelope off at exactly 65536 bytes and the reader's JSON.parse threw.
    const { code, stdout } = await emitThroughPipe(200_000);
    assert.equal(code, 0);
    assert.ok(stdout.length > 65_536, `expected more than one pipe buffer, got ${stdout.length} bytes`);
    const envelope = JSON.parse(stdout);
    assert.equal(envelope.meta.padding.length, 200_000);
  });
});
