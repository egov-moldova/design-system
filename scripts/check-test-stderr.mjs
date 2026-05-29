#!/usr/bin/env node
/**
 * Test wrapper that fails the build if `stencil-test --project spec` produces
 * unexpected stderr noise — i.e. a `console.warn`/`console.error` from a
 * `cor-*` component that wasn't silenced by a `vi.spyOn(console, …)` in the
 * test itself.
 *
 * Why: every component-level warning exists to flag misuse. Tests that hit
 * those code paths must silence them via the canonical pattern:
 *
 *   const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
 *   // … assertions, optionally including expect(warn.mock.calls…) …
 *   warn.mockRestore();
 *
 * Without that, warnings leak into stderr and obscure real failures. This
 * wrapper turns the leak into a hard build failure so the convention is
 * mechanically enforced in CI.
 *
 * Ignored noise: Node deprecation lines (e.g. DEP0190 from @stencil/vitest's
 * own `spawn('npx', …, { shell: true })`) — those are printed by Node as
 * `(node:NNNN) [DEPxxxx] …` and never start with the `stderr |` prefix that
 * Vitest emits for test-captured output, so they don't trip this check.
 *
 * Escape hatch: set `SKIP_STDERR_CHECK=1` to bypass the assertion (still
 * forwards exit code from stencil-test).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `@stencil/vitest` doesn't list the binary under `exports`, only under `bin`,
// so `require.resolve('@stencil/vitest/dist/bin/stencil-test.js')` is blocked
// by ERR_PACKAGE_PATH_NOT_EXPORTED. Resolve via the workspace's node_modules
// layout instead — works under yarn 4 nodeLinker: node-modules.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stencilTestBin = path.join(
  __dirname,
  '..',
  'node_modules',
  '@stencil',
  'vitest',
  'dist',
  'bin',
  'stencil-test.js',
);

// Vitest's default reporter hides captured `console.warn`/`error` blocks when
// stdout is piped (not a TTY) — they only render with the verbose reporter or
// when running interactively. This wrapper always pipes vitest's output, so
// force verbose mode to surface every `stderr |` block regardless of TTY.
// Args are forwarded to vitest via stencil-test's pass-through.
const userArgs = process.argv.slice(2);
const hasReporter = userArgs.some(a => a === '--reporter' || a.startsWith('--reporter='));
const reporterArgs = hasReporter ? [] : ['--reporter=verbose'];

const child = spawn(process.execPath, [stencilTestBin, ...userArgs, ...reporterArgs], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
});

let combined = '';

child.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  combined += chunk.toString('utf8');
});

child.stderr.on('data', chunk => {
  process.stderr.write(chunk);
  combined += chunk.toString('utf8');
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  if (code !== 0) {
    process.exit(code);
  }
  if (process.env.SKIP_STDERR_CHECK === '1') {
    process.exit(0);
  }

  // Strip ANSI escape sequences before matching so colored output still works.
  const plain = combined.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');

  // Vitest emits one "stderr | <file> > <test name>" header per stderr capture.
  // Any such header means a test wrote to stderr without a spy catching it.
  const stderrBlocks = plain.match(/^stderr \| .+$/gm) ?? [];

  // Belt-and-braces: detect bare `[cor-*]` warnings even if Vitest's framing
  // ever changes (e.g. captured during render but printed outside a test).
  const componentWarnings = plain.match(/^\s*\[cor-[a-z-]+\][^\n]*/gm) ?? [];

  if (stderrBlocks.length > 0 || componentWarnings.length > 0) {
    process.stderr.write(
      '\n❌  Spec suite produced unexpected console output.\n' +
        `   stderr blocks    : ${stderrBlocks.length}\n` +
        `   [cor-*] warnings : ${componentWarnings.length}\n\n` +
        'Every component console.warn / console.error must be silenced inside the test that triggers it:\n' +
        "   const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});\n" +
        '   /* … assertions … */\n' +
        '   warn.mockRestore();\n\n' +
        'Canonical references:\n' +
        '   src/components/mud-chip/test/mud-chip.spec.tsx   (silence + assert)\n' +
        '   src/components/mud-button/test/mud-button.spec.tsx (silence only)\n\n' +
        'Escape hatch (use sparingly):  SKIP_STDERR_CHECK=1 yarn test\n\n',
    );
    process.exit(1);
  }

  process.exit(0);
});
