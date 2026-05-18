#!/usr/bin/env node
/**
 * measure-prompt-cost.mjs
 *
 * Static measurement of how many characters / tokens each AI-prompt file in
 * `.claude/` consumes when loaded into context. Used to validate slim-downs:
 * snapshot the size before, slim, snapshot after, diff the two.
 *
 * Token estimate uses the canonical "4 characters per token" heuristic that
 * matches GPT/Claude byte-pair-encoding within ±10% on English markdown. For
 * exact counts, install `gpt-tokenizer` and run with --tokenizer=gpt; otherwise
 * the heuristic is the default and adds no dependencies.
 *
 * Replaces AI work: nothing — this is meta-tooling used to prove the audit
 * suite is actually reducing AI cost. Output is a markdown report saved to
 * `reports/prompt-cost.md` by default plus the JSON envelope on stdout.
 *
 * Usage:
 *   node scripts/audit/measure-prompt-cost.mjs --json
 *   node scripts/audit/measure-prompt-cost.mjs --out reports/prompt-cost.md
 *   node scripts/audit/measure-prompt-cost.mjs --compare reports/prompt-cost-baseline.json
 *   node scripts/audit/measure-prompt-cost.mjs --root .claude/agents
 */
import { readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { glob } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib/component-paths.mjs';

const TOOL = 'measure-prompt-cost';

const USAGE = `Usage: node scripts/audit/measure-prompt-cost.mjs [options]

Static measurement of AI prompt sizes (chars + estimated tokens) across the
.claude/ folder. Used to validate slim-down work: run before + after + diff.

Default scan globs:
  .claude/agents/*.md
  .claude/commands/*.md
  .claude/skills/*/SKILL.md
  AGENTS.md
  _agents/*.md
  src/components/_agents/*.md
  tokens/_agents/*.md

Options:
  --root <glob>            Override scan target (repeatable). Default: all of the above.
  --json                   Emit JSON envelope to stdout
  --out <file>             Write markdown report to file (default: reports/prompt-cost.md
                           when no other --json/--out is given)
  --compare <baseline>     Diff against a previously-saved JSON snapshot; report
                           per-file delta in chars/tokens.
  --tokens-per-char <N>    Tokens-per-character ratio (default: 0.25 ≈ 4 chars/token)
  --help, -h               Show this help`;

const DEFAULT_GLOBS = [
  '.claude/agents/*.md',
  '.claude/commands/*.md',
  '.claude/skills/*/SKILL.md',
  '.claude/skills/*/references/*.md',
  'AGENTS.md',
  '_agents/*.md',
  'src/components/AGENTS.md',
  'src/components/_agents/*.md',
  'tokens/AGENTS.md',
  'tokens/_agents/*.md',
];

const DEFAULT_TOKENS_PER_CHAR = 0.25; // ≈ 4 chars per token

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'root': { type: 'string', multiple: true },
        'json': { type: 'boolean', default: false },
        'out': { type: 'string' },
        'compare': { type: 'string' },
        'tokens-per-char': { type: 'string', default: String(DEFAULT_TOKENS_PER_CHAR) },
        'help': { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: false,
      strict: true,
    });
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n${USAGE}\n`);
    process.exit(2);
  }
  if (parsed.values.help) {
    process.stdout.write(`${USAGE}\n`);
    process.exit(0);
  }
  const ratio = Number(parsed.values['tokens-per-char']);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    process.stderr.write(`${TOOL}: --tokens-per-char must be a positive number.\n`);
    process.exit(2);
  }
  return {
    globs: parsed.values.root && parsed.values.root.length > 0 ? parsed.values.root : DEFAULT_GLOBS,
    json: parsed.values.json,
    out: parsed.values.out ?? null,
    compare: parsed.values.compare ?? null,
    tokensPerChar: ratio,
  };
}

async function main() {
  const args = parseCli();
  const t0 = Date.now();

  const files = await collectFiles(args.globs);
  const measured = files.map(f => measureFile(f, args.tokensPerChar));
  measured.sort((a, b) => b.chars - a.chars);

  const totals = aggregateTotals(measured);

  let comparison = null;
  if (args.compare) {
    if (!existsSync(args.compare)) {
      process.stderr.write(`${TOOL}: baseline file ${args.compare} not found.\n`);
      process.exit(2);
    }
    const baseline = JSON.parse(readFileSync(args.compare, 'utf8'));
    comparison = diffAgainstBaseline(measured, baseline);
  }

  const envelope = {
    schemaVersion: '1.0.0',
    tool: TOOL,
    target: args.globs.join(','),
    summary: totals,
    files: measured,
    comparison,
    meta: {
      durationMs: Date.now() - t0,
      tokensPerChar: args.tokensPerChar,
      filesScanned: measured.length,
    },
  };

  // Default behavior: write markdown report unless --json was requested
  if (args.out || (!args.json && !args.compare)) {
    const outPath = args.out ?? join(REPO_ROOT, 'reports', 'prompt-cost.md');
    mkdirSync(dirname(outPath), { recursive: true });
    if (outPath.endsWith('.json')) {
      writeFileSync(outPath, JSON.stringify(envelope, null, 2), 'utf8');
    } else {
      writeFileSync(outPath, renderMarkdown(envelope), 'utf8');
    }
    process.stderr.write(`${TOOL}: wrote ${outPath}\n`);
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
  } else if (comparison) {
    // Show comparison summary on stdout for human readers
    process.stdout.write(renderComparisonSummary(envelope));
  } else if (!args.out) {
    process.stdout.write(renderMarkdown(envelope));
  }
}

async function collectFiles(globs) {
  const out = new Set();
  for (const pattern of globs) {
    for await (const p of glob(pattern, { cwd: REPO_ROOT })) {
      const abs = typeof p === 'string' ? join(REPO_ROOT, p) : p;
      if (/[\\/](node_modules|dist|loader|\.stencil|\.wireit|storybook-static)[\\/]/.test(abs)) continue;
      try {
        if (statSync(abs).isFile()) out.add(abs);
      } catch {
        // skip
      }
    }
  }
  return [...out];
}

/**
 * Measure a single markdown file. Pure — exported for tests.
 *
 * Returns { file, chars, lines, words, estimatedTokens }.
 */
export function measureFile(absPath, tokensPerChar = DEFAULT_TOKENS_PER_CHAR) {
  const content = readFileSync(absPath, 'utf8');
  const chars = content.length;
  const lines = content.split('\n').length;
  const words = (content.match(/\S+/g) ?? []).length;
  const estimatedTokens = Math.round(chars * tokensPerChar);
  return {
    file: relative(REPO_ROOT, absPath).split('\\').join('/'),
    chars,
    lines,
    words,
    estimatedTokens,
  };
}

export function aggregateTotals(entries) {
  return entries.reduce(
    (acc, e) => ({
      files: acc.files + 1,
      chars: acc.chars + e.chars,
      lines: acc.lines + e.lines,
      words: acc.words + e.words,
      estimatedTokens: acc.estimatedTokens + e.estimatedTokens,
    }),
    { files: 0, chars: 0, lines: 0, words: 0, estimatedTokens: 0 },
  );
}

/**
 * Diff a fresh measurement against a saved JSON baseline. Pure — exported for tests.
 *
 * Returns { perFile: [{ file, deltaChars, deltaTokens, status }], totals: {...} }
 *   status: 'unchanged' | 'shrunk' | 'grew' | 'added' | 'removed'
 */
export function diffAgainstBaseline(current, baseline) {
  const baselineFiles = baseline.files ?? [];
  const byPath = new Map(baselineFiles.map(f => [f.file, f]));
  const seen = new Set();
  const perFile = [];

  for (const cur of current) {
    seen.add(cur.file);
    const base = byPath.get(cur.file);
    if (!base) {
      perFile.push({
        file: cur.file,
        deltaChars: cur.chars,
        deltaTokens: cur.estimatedTokens,
        status: 'added',
      });
      continue;
    }
    const deltaChars = cur.chars - base.chars;
    const deltaTokens = cur.estimatedTokens - base.estimatedTokens;
    perFile.push({
      file: cur.file,
      baseChars: base.chars,
      currentChars: cur.chars,
      baseTokens: base.estimatedTokens,
      currentTokens: cur.estimatedTokens,
      deltaChars,
      deltaTokens,
      deltaPct: base.chars > 0 ? Number(((deltaChars / base.chars) * 100).toFixed(2)) : 0,
      status: deltaChars === 0 ? 'unchanged' : deltaChars < 0 ? 'shrunk' : 'grew',
    });
  }

  for (const base of baselineFiles) {
    if (seen.has(base.file)) continue;
    perFile.push({
      file: base.file,
      deltaChars: -base.chars,
      deltaTokens: -base.estimatedTokens,
      status: 'removed',
    });
  }

  perFile.sort((a, b) => (a.deltaTokens ?? 0) - (b.deltaTokens ?? 0));

  const totals = perFile.reduce(
    (acc, e) => ({
      deltaChars: acc.deltaChars + (e.deltaChars ?? 0),
      deltaTokens: acc.deltaTokens + (e.deltaTokens ?? 0),
      shrunkFiles: acc.shrunkFiles + (e.status === 'shrunk' ? 1 : 0),
      grewFiles: acc.grewFiles + (e.status === 'grew' ? 1 : 0),
      addedFiles: acc.addedFiles + (e.status === 'added' ? 1 : 0),
      removedFiles: acc.removedFiles + (e.status === 'removed' ? 1 : 0),
    }),
    { deltaChars: 0, deltaTokens: 0, shrunkFiles: 0, grewFiles: 0, addedFiles: 0, removedFiles: 0 },
  );

  return { perFile, totals };
}

function renderMarkdown(envelope) {
  const lines = [];
  lines.push(`# Prompt cost measurement`);
  lines.push('');
  lines.push(`- Tool: \`${envelope.tool}\``);
  lines.push(`- Files scanned: ${envelope.summary.files}`);
  lines.push(`- Total chars: ${envelope.summary.chars.toLocaleString()}`);
  lines.push(`- Total lines: ${envelope.summary.lines.toLocaleString()}`);
  lines.push(`- Total words: ${envelope.summary.words.toLocaleString()}`);
  lines.push(
    `- Estimated tokens: **${envelope.summary.estimatedTokens.toLocaleString()}** (at ${envelope.meta.tokensPerChar} tokens/char)`,
  );
  lines.push('');
  lines.push(`## Files (sorted by size, largest first)`);
  lines.push('');
  lines.push('| File | Lines | Chars | Est. Tokens |');
  lines.push('|------|-------|-------|-------------|');
  for (const f of envelope.files) {
    lines.push(`| \`${f.file}\` | ${f.lines} | ${f.chars.toLocaleString()} | ${f.estimatedTokens.toLocaleString()} |`);
  }

  if (envelope.comparison) {
    lines.push('');
    lines.push(`## Comparison vs baseline`);
    lines.push('');
    lines.push(
      `- Total token delta: **${envelope.comparison.totals.deltaTokens > 0 ? '+' : ''}${envelope.comparison.totals.deltaTokens.toLocaleString()}**`,
    );
    lines.push(`- Files shrunk: ${envelope.comparison.totals.shrunkFiles}`);
    lines.push(`- Files grew: ${envelope.comparison.totals.grewFiles}`);
    lines.push(`- Files added: ${envelope.comparison.totals.addedFiles}`);
    lines.push(`- Files removed: ${envelope.comparison.totals.removedFiles}`);
    lines.push('');
    lines.push('| File | Δ Tokens | Δ % | Status |');
    lines.push('|------|----------|-----|--------|');
    for (const d of envelope.comparison.perFile) {
      if ((d.deltaTokens ?? 0) === 0) continue;
      const sign = d.deltaTokens > 0 ? '+' : '';
      const pct = d.deltaPct !== undefined ? `${sign}${d.deltaPct}%` : '—';
      lines.push(`| \`${d.file}\` | ${sign}${d.deltaTokens} | ${pct} | ${d.status} |`);
    }
  }

  return lines.join('\n') + '\n';
}

function renderComparisonSummary(envelope) {
  const c = envelope.comparison;
  const lines = [];
  lines.push('');
  lines.push(`Comparison vs baseline:`);
  lines.push(`  Total token delta: ${c.totals.deltaTokens > 0 ? '+' : ''}${c.totals.deltaTokens.toLocaleString()}`);
  lines.push(
    `  Shrunk: ${c.totals.shrunkFiles}    Grew: ${c.totals.grewFiles}    Added: ${c.totals.addedFiles}    Removed: ${c.totals.removedFiles}`,
  );
  lines.push('');
  const movers = c.perFile.filter(d => (d.deltaTokens ?? 0) !== 0).slice(0, 10);
  if (movers.length > 0) {
    lines.push(`Top movers:`);
    for (const d of movers) {
      const sign = d.deltaTokens > 0 ? '+' : '';
      const pct = d.deltaPct !== undefined ? ` (${sign}${d.deltaPct}%)` : '';
      lines.push(`  ${sign}${d.deltaTokens} tokens${pct}  ${d.file}  [${d.status}]`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(2);
  });
}

export { TOOL, DEFAULT_GLOBS, DEFAULT_TOKENS_PER_CHAR };
