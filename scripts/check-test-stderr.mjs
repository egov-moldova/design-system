#!/usr/bin/env node
/**
 * Test wrapper that fails the build if `vitest run --project spec` produces
 * unexpected stderr noise — i.e. a `console.warn`/`console.error` from a
 * `mud-*` component that wasn't silenced by a `vi.spyOn(console, …)` in the
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
 * Ignored noise: Node deprecation lines are printed as `(node:NNNN) [DEPxxxx] …`
 * and never start with the `stderr |` prefix Vitest emits for test-captured
 * output, so they don't trip this check. (Until this wrapper spawned Vitest
 * directly, the usual source was DEP0190 from `@stencil/vitest`'s own
 * `spawn('npx', …, { shell: true })`; that spawn is gone.)
 *
 * Escape hatch: set `SKIP_STDERR_CHECK=1` to bypass the assertion (still
 * forwards Vitest's exit code).
 *
 * Vitest is spawned directly rather than through `@stencil/vitest`'s
 * `stencil-test` binary, which runs `stencil build --dev` first. That build
 * suppressed dist/collection, dist/esm, dist/cjs, dist/index.js and loader/,
 * so running the tests destroyed a production dist/. The `spec` project
 * compiles components from source via `stencilVitestPlugin()`, so no built
 * bundle is needed — see `vitest.config.mts` and `vitest-setup.ts`.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// Vitest doesn't list `./vitest.mjs` under `exports`, but it does export
// `./package.json` — so resolve the manifest and read its own `bin` entry.
// That reaches the same file through an exported surface instead of a
// hand-built node_modules path, so it survives a linker change and follows
// the package if it ever moves the file.
const require = createRequire(import.meta.url);
const vitestManifestPath = require.resolve('vitest/package.json');
const vitestBin = path.resolve(
  path.dirname(vitestManifestPath),
  JSON.parse(readFileSync(vitestManifestPath, 'utf8')).bin.vitest,
);

// Vitest's default reporter hides captured `console.warn`/`error` blocks when
// stdout is piped (not a TTY) — they only render with the verbose reporter or
// when running interactively. This wrapper always pipes vitest's output, so
// force verbose mode to surface every `stderr |` block regardless of TTY.
// Args are forwarded straight to Vitest.
const userArgs = process.argv.slice(2);
const hasReporter = userArgs.some(a => a === '--reporter' || a.startsWith('--reporter='));
const reporterArgs = hasReporter ? [] : ['--reporter=verbose'];

const child = spawn(process.execPath, [vitestBin, 'run', ...userArgs, ...reporterArgs], {
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

  // Belt-and-braces: detect bare `[mud-*]` warnings even if Vitest's framing
  // ever changes (e.g. captured during render but printed outside a test).
  const componentWarnings = plain.match(/^\s*\[mud-[a-z-]+\][^\n]*/gm) ?? [];

  if (stderrBlocks.length > 0 || componentWarnings.length > 0) {
    process.stderr.write(
      '\n❌  Spec suite produced unexpected console output.\n' +
        `   stderr blocks    : ${stderrBlocks.length}\n` +
        `   [mud-*] warnings : ${componentWarnings.length}\n\n` +
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
