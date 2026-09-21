/**
 * Builders for verdict fixtures: a per-component envelope in the shape
 * run-all.mjs writes to `audit/<component>/runs/<run>/envelope.json`, and the
 * files a run directory holds. Shared by verdict / fix-brief / callers specs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REQUIRED_CHECKS, excuseFor } from '../../../../audit/verdict.mjs';
import { AI_FINDINGS_SCHEMA_VERSION, SCHEMA_VERSION } from '../../../../audit/lib/json-output.mjs';

export const COMMIT = '0123456789abcdef0123456789abcdef01234567';

export const FIGMA_PRESENT = Object.freeze({
  status: 'present',
  rel: 'src/components/mud-fx/test/mud-fx.figma.json',
  path: '.audit-figma/mud-fx/manifest@HEAD.json',
  commit: COMMIT,
  pending: false,
  workingTreeOnly: false,
  design: null,
  overrides: [],
  skips: [],
});

export const FIGMA_DESIGN_NONE = Object.freeze({
  ...FIGMA_PRESENT,
  status: 'design-none',
  design: { reason: 'internal utility', decidedBy: 'Dan' },
});

export const FIGMA_ABSENT = Object.freeze({
  ...FIGMA_PRESENT,
  status: 'absent',
  path: null,
  commit: null,
});

export const LEGS = Object.freeze({
  'ai-stencil': { leg: 'stencil-compliance', idsJudged: ['DX-stencil-manual'] },
  'ai-wcag': { leg: 'a11y-verifier', idsJudged: ['DX-wcag'] },
  'ai-media': { leg: 'a11y-verifier', idsJudged: ['DX-media'] },
  'ai-figma-themes': { leg: 'pixel-perfect-verifier', idsJudged: ['DX-figma-themes'] },
  'ai-archetype': { leg: 'audit-component', idsJudged: ['CX1', 'CX2', 'CX3', 'CX4'] },
  'ai-security': { leg: 'audit-component', idsJudged: ['DX-security'] },
});

export const INPUT_HASH = 'sha256:aaaa';

/**
 * A clean envelope: every required, non-excused id ran with no findings;
 * at deep every required, non-excused AI leg is opened.
 */
export function cleanEnvelope({
  component = 'mud-fx',
  depth = 'standard',
  figma = depth === 'quick' ? null : FIGMA_PRESENT,
  noFigma = false,
  browserWaiver = null,
  filters = { only: [], skip: [] },
  durationMs = 10,
} = {}) {
  const ctx = { noFigma, figma, browserWaiver };
  const ids = REQUIRED_CHECKS[depth].filter(id => !excuseFor(id, ctx));
  const results = ids
    .filter(id => !id.startsWith('ai-'))
    .map(id => ({
      id,
      name: `check-${id}`,
      wave: 'A',
      ok: true,
      status: 'ok',
      exitCode: 0,
      durationMs,
      summary: { errors: 0, warnings: 0, info: 0 },
      error: null,
      component,
    }));
  const aiLegs = ids
    .filter(id => id.startsWith('ai-'))
    .map(id => ({
      id,
      schemaVersion: AI_FINDINGS_SCHEMA_VERSION,
      ...LEGS[id],
      status: 'open',
      inputHash: INPUT_HASH,
      findings: [],
    }));
  return {
    schemaVersion: SCHEMA_VERSION,
    tool: 'run-all',
    target: component,
    ok: true,
    summary: { errors: 0, warnings: 0, info: 0, incomplete: 0 },
    blockers: [],
    results,
    findingsByTool: Object.fromEntries(results.map(r => [r.name, []])),
    meta: { totalDurationMs: durationMs * 3, scriptsRun: results.length, parallel: true },
    audit: { component, depth, noFigma, browserWaiver, filters, figma, aiLegs, prerequisites: [] },
  };
}

/** Add an error finding to a row of an envelope (mutates and returns it). */
export function withError(envelope, id, f = {}) {
  const row = envelope.results.find(r => r.id === id);
  row.ok = false;
  row.exitCode = 1;
  row.summary = { errors: 1, warnings: 0, info: 0 };
  envelope.findingsByTool[row.name] = [
    {
      severity: 'error',
      code: 'FIXTURE-ERROR',
      file: `src/components/${envelope.audit.component}/x.tsx`,
      line: 7,
      message: 'seeded',
      ...f,
    },
  ];
  envelope.ok = false;
  return envelope;
}

/** An ai-findings.json that closes every row a leg was opened for. */
export function aiFindings(leg, { findings = [], schemaVersion = AI_FINDINGS_SCHEMA_VERSION, idsJudged = null } = {}) {
  const ids =
    idsJudged ??
    Object.values(LEGS)
      .filter(l => l.leg === leg)
      .flatMap(l => l.idsJudged);
  return { schemaVersion, leg, idsJudged: ids, inputHash: INPUT_HASH, findings };
}

/** Every leg's closing file, with no findings. */
export function allLegsClosed() {
  return [...new Set(Object.values(LEGS).map(l => l.leg))].map(leg => ({ leg, data: aiFindings(leg) }));
}

/**
 * Lay a run directory out on disk: `<auditDir>/<component>/runs/<run>/`
 * with `envelope.json` and `ai/<leg>/ai-findings.json`. Returns the run dir.
 */
export function writeRunDir(auditDir, envelope, { run = 'run-1', ai = [] } = {}) {
  const runDir = join(auditDir, envelope.audit.component, 'runs', run);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'envelope.json'), JSON.stringify(envelope, null, 2));
  for (const { leg, data } of ai) {
    mkdirSync(join(runDir, 'ai', leg), { recursive: true });
    writeFileSync(join(runDir, 'ai', leg, 'ai-findings.json'), JSON.stringify(data, null, 2));
  }
  return runDir;
}
