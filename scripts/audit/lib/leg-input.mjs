/**
 * leg-input.mjs — what an AI leg judges: a component's source files plus the
 * leg's own prompt text (Design §1 of `2026-09-21-audit-component-depths.md`),
 * and the table of which `ai-*` id maps to which leg, CX/DX ids and prompt
 * file. Shared by `run-all.mjs` (opens a deep row with the hash of what the
 * leg is about to judge) and `verdict.mjs` (re-hashes the same input at every
 * recompute and compares against the opened row — Decision §7 of
 * `2026-09-22-audit-depths-sentinel-fixes.md`). `verdict.mjs` importing this
 * module instead of `run-all.mjs` is what keeps it out of the whole script
 * registry and figma-refs.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Every `ai-*` id a depth can require: the leg that closes it, the CX/DX ids
 * it judges, and the prompt file whose text is part of the input hash.
 */
export const AI_LEG_TABLE = Object.freeze({
  'ai-stencil': Object.freeze({
    leg: 'stencil-compliance',
    idsJudged: Object.freeze(['DX-stencil-manual']),
    prompt: '.claude/skills/stencil-compliance/SKILL.md',
  }),
  'ai-wcag': Object.freeze({
    leg: 'a11y-verifier',
    idsJudged: Object.freeze(['DX-wcag']),
    prompt: '.claude/agents/a11y-verifier.md',
  }),
  'ai-media': Object.freeze({
    leg: 'a11y-verifier',
    idsJudged: Object.freeze(['DX-media']),
    prompt: '.claude/agents/a11y-verifier.md',
  }),
  'ai-figma-themes': Object.freeze({
    leg: 'pixel-perfect-verifier',
    idsJudged: Object.freeze(['DX-figma-themes']),
    prompt: '.claude/agents/pixel-perfect-verifier.md',
  }),
  'ai-archetype': Object.freeze({
    leg: 'audit-component',
    idsJudged: Object.freeze(['CX1', 'CX2', 'CX3', 'CX4']),
    prompt: '.claude/skills/audit-component/SKILL.md',
  }),
  'ai-security': Object.freeze({
    leg: 'audit-component',
    idsJudged: Object.freeze(['DX-security']),
    prompt: '.claude/skills/audit-component/SKILL.md',
  }),
});

/** A component's own directory, `src/hidden/<name>` when it lives there instead. */
export function componentDirFor(repoRoot, component) {
  const hidden = `src/hidden/${component}`;
  return existsSync(join(repoRoot, hidden)) && !existsSync(join(repoRoot, 'src/components', component))
    ? hidden
    : `src/components/${component}`;
}

function walkFiles(root) {
  const out = [];
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root)) {
    const abs = join(root, entry);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs));
    else out.push(abs);
  }
  return out;
}

/** Every source file of a component, as `{ path, content }` sorted by path. */
export function defaultReadSources(repoRoot, component) {
  const root = join(repoRoot, componentDirFor(repoRoot, component));
  return walkFiles(root)
    .map(abs => ({ path: relative(repoRoot, abs), content: readFileSync(abs, 'utf8') }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** A leg's prompt file text, or `''` when it is not on this branch yet. */
export function defaultReadPrompt(repoRoot, rel) {
  const abs = join(repoRoot, rel);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
}

/**
 * SHA-256 of what an AI leg judges: the component's source files plus the
 * leg prompt. Recorded on the opened row when the leg is dispatched; a
 * recompute re-hashes the current sources and compares against that
 * recorded value — the leg's own self-reported hash is never consulted
 * (Decision §7). Pure.
 */
export function hashLegInput(sources, promptText) {
  const h = createHash('sha256');
  for (const s of sources) h.update(`${s.path}\u0000${s.content}\u0000`);
  h.update(`prompt\u0000${promptText ?? ''}`);
  return `sha256:${h.digest('hex')}`;
}

/**
 * The current input hash of every `ai-*` id, as of right now on disk — what
 * `verdict.mjs`'s recompute compares an opened row's recorded hash against
 * (Decision §7). Impure by default; `readSources` / `readPrompt` are an
 * injection seam for tests.
 *
 * @returns {Record<string, string>} id → `sha256:...`
 */
export function currentLegHashes(
  repoRoot,
  component,
  { readSources = defaultReadSources, readPrompt = defaultReadPrompt } = {},
) {
  const sources = readSources(repoRoot, component);
  const out = {};
  for (const [id, entry] of Object.entries(AI_LEG_TABLE)) {
    out[id] = hashLegInput(sources, readPrompt(repoRoot, entry.prompt));
  }
  return out;
}
