#!/usr/bin/env node
/**
 * 08-bundle-size.mjs
 *
 * Reports the size of Stencil's compiled output and, best-effort, the chunks
 * that contain a target component's tag.
 *
 * Stencil emits hashed chunks (e.g. `p-07883e4d.entry.js`) — there is no clean
 * 1:1 mapping from component name to file. We use two signals:
 *   1. Total dist size  (everything under `dist/design-system/`)
 *   2. Per-chunk listing of `.entry.js` files sorted by size
 *   3. For a single component target: grep the chunks for the literal tag and
 *      sum the matching chunks (rough upper bound).
 *
 * Replaces AI work in:
 *   - `.claude/agents/audit-production.md` Phase 6.1 (bundle size)
 *
 * Caveats:
 *   - This reads existing build artifacts. Run `yarn build` first or use --build.
 *   - The per-component size is an upper bound; multiple components may share
 *     a chunk, so attributing the entire chunk to one component over-reports.
 *
 * Usage:
 *   yarn build
 *   node scripts/audit/08-bundle-size.mjs cor-button --json
 *   node scripts/audit/08-bundle-size.mjs --all --json
 */
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo, REPO_ROOT } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';

const TOOL = 'bundle-size';

const USAGE = defaultUsage(
  '08-bundle-size',
  'Report total Stencil bundle size + per-chunk sizes. For a single component, best-effort chunk attribution.',
  [
    '',
    'Extra options:',
    '  --build              Run `yarn build` first (slow)',
    '  --warn-threshold-kb  Per-chunk warning threshold (default: 50)',
  ],
);

const DIST_DIR_REL = 'dist/design-system';
const DEFAULT_WARN_KB = 50;

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      'build': { type: 'boolean', default: false },
      'warn-threshold-kb': { type: 'string', default: String(DEFAULT_WARN_KB) },
    },
  });
  const t0 = Date.now();
  const warnKb = Number(args.extras['warn-threshold-kb']);
  if (!Number.isFinite(warnKb) || warnKb <= 0) {
    process.stderr.write(`${TOOL}: --warn-threshold-kb must be a positive number.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const targets = await resolveTargets(args);
  if (!targets.length) {
    if (args.changed) {
      await emit(
        buildResult({
          tool: TOOL,
          target: 'changed',
          findings: [],
          meta: { durationMs: Date.now() - t0, componentsScanned: 0 },
        }),
        args,
      );
      process.exit(0);
    }
    process.stderr.write(`${TOOL}: no components matched.\n`);
    process.exit(EXIT_INTERNAL);
  }

  if (args.extras.build) {
    const buildRes = runStencilBuild();
    if (!buildRes.ok) {
      process.stderr.write(`${TOOL}: build failed (exit ${buildRes.exitCode}).\n`);
      process.exit(EXIT_INTERNAL);
    }
  }

  const distAbs = join(REPO_ROOT, DIST_DIR_REL);
  if (!existsSync(distAbs)) {
    process.stderr.write(`${TOOL}: ${DIST_DIR_REL} not found. Run \`yarn build\` first or pass --build.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const chunks = await collectChunks(distAbs);
  const totals = computeTotals(chunks);
  const findings = [];

  // Single-component target: best-effort chunk attribution.
  let perComponent = null;
  if (!args.all && !args.changed && targets.length === 1) {
    const target = targets[0];
    if (target.found) {
      const attribution = attributeChunksToTag(target.name, chunks);
      perComponent = { component: target.name, ...attribution };
      if (attribution.estimatedKb > warnKb) {
        findings.push(
          finding({
            severity: 'warning',
            code: 'BUNDLE-SIZE-OVER-THRESHOLD',
            message: `${target.name}: estimated bundle attribution ${attribution.estimatedKb}KB exceeds threshold ${warnKb}KB across ${attribution.chunkCount} chunk(s).`,
            fix: 'Inspect the chunks listed in meta.perComponent.chunks; consider code splitting heavy deps.',
          }),
        );
      }
    } else {
      findings.push(
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      );
    }
  }

  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: targets.length,
      totalKb: totals.totalKb,
      chunkCount: chunks.length,
      largestChunks: chunks.slice(0, 10).map(c => ({ file: c.rel, sizeKb: c.sizeKb })),
    },
  });

  if (perComponent) result.meta.perComponent = perComponent;

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * List every .entry.js / .esm.js / .css file under dist/design-system/, sorted
 * by descending size. Pure async — exported for tests via runtime injection.
 */
export async function collectChunks(distAbs) {
  const chunks = [];
  const patterns = ['**/*.entry.js', '**/*.esm.js', '**/*.css', '**/*.js'];
  const seen = new Set();
  for (const pattern of patterns) {
    for await (const p of glob(pattern, { cwd: distAbs })) {
      const abs = typeof p === 'string' ? join(distAbs, p) : p;
      if (seen.has(abs)) continue;
      seen.add(abs);
      try {
        const st = statSync(abs);
        if (!st.isFile()) continue;
        chunks.push({
          file: abs,
          rel: relativeToRepo(abs),
          sizeBytes: st.size,
          sizeKb: Number((st.size / 1024).toFixed(2)),
        });
      } catch {
        // skip
      }
    }
  }
  chunks.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return chunks;
}

export function computeTotals(chunks) {
  const totalBytes = chunks.reduce((sum, c) => sum + c.sizeBytes, 0);
  return {
    totalBytes,
    totalKb: Number((totalBytes / 1024).toFixed(2)),
  };
}

/**
 * Best-effort attribution: find chunks whose content contains the component
 * tag (e.g. `"cor-button"`). Sum their sizes. This is an UPPER BOUND because
 * multiple components may share a chunk.
 *
 * Exported for tests.
 */
export function attributeChunksToTag(componentName, chunks) {
  const matchingChunks = [];
  for (const chunk of chunks) {
    if (!chunk.file.endsWith('.entry.js') && !chunk.file.endsWith('.js')) continue;
    let content;
    try {
      content = readFileSync(chunk.file, 'utf8');
    } catch {
      continue;
    }
    if (content.includes(`"${componentName}"`) || content.includes(`'${componentName}'`)) {
      matchingChunks.push({ file: chunk.rel, sizeKb: chunk.sizeKb });
    }
  }
  const estimatedBytes = matchingChunks.reduce((sum, c) => sum + Math.round(c.sizeKb * 1024), 0);
  return {
    chunkCount: matchingChunks.length,
    estimatedKb: Number((estimatedBytes / 1024).toFixed(2)),
    chunks: matchingChunks,
    note: 'Upper bound — chunks may be shared with other components.',
  };
}

function runStencilBuild() {
  const res = spawnSync('yarn', ['build'], { stdio: 'inherit', shell: true });
  return { ok: res.status === 0, exitCode: res.status };
}

async function resolveTargets(args) {
  if (args.all) return listAllComponents().map(c => resolveComponentPaths(c.name));
  if (args.changed) return listChangedComponents().map(n => resolveComponentPaths(n));
  return [resolveComponentPaths(args.component)];
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL, DEFAULT_WARN_KB };
