/**
 * Storybook environment helpers shared by Tier 2 (browser) audit scripts.
 *
 *  - DEFAULT_PORT             — 6007 (per repo convention, see AGENTS.md)
 *  - DEFAULT_BASE_URL         — http://localhost:6007
 *  - isStorybookReachable     — async TCP probe; resolves true/false
 *  - storyUrl                 — build iframe URL for a Storybook story id
 *  - inferStoryId             — best-effort `<category>-<bare>--<exportName>` builder
 *
 *  - ensureWorktreeStorybook — reuse or start THIS worktree's Storybook (Design §9)
 *
 * Worktree-aware: callers may pass `port` (e.g. 6008 when a parallel git
 * worktree runs Storybook on a custom port). Defaults keep single-checkout
 * workflows simple.
 */
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const DEFAULT_PORT = 6007;
export const DEFAULT_BASE_URL = `http://localhost:${DEFAULT_PORT}`;

/**
 * Probe a TCP port without using shell commands (cross-platform, no `lsof`/`netstat`).
 * Resolves to `true` if something is listening on `host:port` within the timeout.
 */
export function isStorybookReachable({ host = 'localhost', port = DEFAULT_PORT, timeoutMs = 1500 } = {}) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let settled = false;
    const finish = val => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        /* noop */
      }
      resolve(val);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

/**
 * Build a Storybook iframe URL for a given story id.
 *
 *   storyUrl({ storyId: 'atoms-button--default' })
 *     → 'http://localhost:6007/iframe.html?id=atoms-button--default&viewMode=story'
 */
export function storyUrl({ storyId, baseUrl = DEFAULT_BASE_URL, viewMode = 'story', args = null } = {}) {
  if (!storyId) throw new Error('storyUrl: storyId is required');
  const params = new URLSearchParams({ id: storyId, viewMode });
  if (args && typeof args === 'object') {
    const encoded = Object.entries(args)
      .map(([k, v]) => `${k}:${String(v)}`)
      .join(';');
    if (encoded) params.set('args', encoded);
  }
  return `${baseUrl.replace(/\/$/, '')}/iframe.html?${params.toString()}`;
}

/**
 * Best-effort story id constructor matching Storybook's own kebab-case rules.
 * Used as a fallback when the caller doesn't have a story export name.
 *
 *   inferStoryId('Atoms/Button', 'Default')
 *     → 'atoms-button--default'
 *   inferStoryId('Molecules/Tooltip', 'AllPlacements')
 *     → 'molecules-tooltip--all-placements'
 *
 * For canonical mapping, prefer scripts/audit/05-story-exports.mjs which
 * parses the actual *.stories.ts file.
 */
export function inferStoryId(title, exportName) {
  if (!title || !exportName) return null;
  const titlePart = title.split('/').map(kebabCase).join('-');
  return `${titlePart}--${kebabCase(exportName)}`;
}

function kebabCase(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Git-ignored record of the Storybook this worktree started: `{ port, pid }`. */
export const STORYBOOK_RECORD = '.audit-storybook.json';

/** Resolve a port nothing listens on, by letting the OS pick one. */
export function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

/**
 * A pid's process-start time, as `ps` reports it — the pid-reuse discriminant
 * shared by R9 (seeded-defects, below) and R3's locks (plan
 * `2026-09-22-audit-depths-sentinel-fixes.md` Decision §3): a bare pid match
 * is not proof of identity once the original process has exited and the OS
 * has recycled the number. `null` when the process is gone or `ps` itself is
 * unavailable — callers treat that as "cannot verify", never as "verified".
 * Exported so R3's lock code and tests can inject a fake `ps`.
 */
export function getProcessStartTime(pid, { run = spawnSync } = {}) {
  const res = run('ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const line = (res.stdout ?? '').trim();
  return line || null;
}

/**
 * Spawn Storybook detached. A missing binary (`node_modules/.bin/storybook`
 * not installed — ENOENT) or any other launch failure emits `'error'` on the
 * child ASYNCHRONOUSLY; with no listener that is an uncaught exception that
 * crashes the whole run-all process. `child.pid` is `undefined` in exactly
 * that failure case (Node: pid is only set once the process actually
 * spawned), so the caller can detect the failure without waiting on the
 * event — the listener below exists only to stop the crash.
 *
 * @returns {number|undefined} the child's pid, or undefined if it never spawned
 */
export function startStorybookProcess({ repoRoot, port }) {
  const bin = join(repoRoot, 'node_modules', '.bin', 'storybook');
  const child = spawn(bin, ['dev', '-p', String(port), '--no-open', '--ci'], {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {
    // Swallowed: a launch failure is reported through the undefined pid above,
    // not through this event. Without this listener the unhandled 'error'
    // event throws and takes the whole run-all process down with it.
  });
  child.unref();
  return child.pid;
}

/**
 * Return the port of a Storybook that belongs to THIS worktree, starting one
 * if needed (Design §9). Nine worktrees of this repo share port 6007 and
 * `isStorybookReachable` is a bare TCP connect, so a reachable 6007 may serve
 * another branch: a server is reused only when this worktree's
 * `.audit-storybook.json` names a live process that answers on its port.
 * Otherwise a new one starts on a free port and is recorded; it is left
 * running (detached) so the next audit reuses it.
 *
 * Every side effect is injectable so tests never start a server.
 *
 * @returns {Promise<{ ok: true, port: number, reused: boolean } | { ok: false, cause: string }>}
 */
export async function ensureWorktreeStorybook({
  repoRoot,
  readRecord = () => {
    const file = join(repoRoot, STORYBOOK_RECORD);
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  },
  writeRecord = record => writeFileSync(join(repoRoot, STORYBOOK_RECORD), `${JSON.stringify(record, null, 2)}\n`),
  isAlive = isProcessAlive,
  reachable = port => isStorybookReachable({ port }),
  freePort = findFreePort,
  start = startStorybookProcess,
  startTimeOf = getProcessStartTime,
  sleep = ms => new Promise(r => setTimeout(r, ms)),
  timeoutMs = 120_000,
  pollMs = 500,
} = {}) {
  let record = null;
  try {
    record = readRecord();
  } catch {
    // An unreadable record is treated as no record: start a fresh server.
  }
  if (record?.pid && record?.port && isAlive(record.pid) && (await reachable(record.port))) {
    return { ok: true, port: record.port, reused: true };
  }
  const port = await freePort();
  const pid = start({ repoRoot, port });
  if (!pid) {
    // The process never spawned (e.g. node_modules/.bin/storybook is missing) —
    // never record an undefined pid, and never poll for a server that will
    // never answer. The caller (run-all's runPrerequisites) turns this into
    // missing-prereq rows for every check that requires the browser.
    return { ok: false, cause: `Storybook failed to start on port ${port} (spawn error — is Storybook installed?)` };
  }
  // R9: record the start time alongside the pid, the pid-reuse discriminant
  // seeded-defects (and R3's locks) need — a null (ps unavailable) is written
  // as-is; a legacy reader treats a missing startTime as "cannot verify".
  writeRecord({ port, pid, startTime: startTimeOf(pid) });
  for (let waited = 0; waited < timeoutMs; waited += pollMs) {
    if (await reachable(port)) return { ok: true, port, reused: false };
    await sleep(pollMs);
  }
  return { ok: false, cause: `Storybook did not answer on port ${port} within ${timeoutMs} ms` };
}

// ─── R3 locks (plan 2026-09-22-audit-depths-sentinel-fixes.md, Decision §3) ─
//
// Two lock scopes, each a `wx`-created file holding `{ pid, startTime, nonce }`:
//   - the worktree lock (`<repoRoot>/audit/_run/.worktree.lock`) guards `dist/`
//     and the worktree Storybook record — taken by `runAudit` (run-all.mjs).
//   - the audit-dir lock (`<auditDir>/_run/.lock`) guards `_run/summary.json`,
//     `_run/envelope.json`, `_run/vitest-results.json` and each `verdict.json`
//     — taken by `runFresh` and by `--run-dir` recompute (verdict.mjs).
// A lock is STALE (safe to take over) when its pid is dead, or alive but its
// current start time no longer matches the recorded one (pid reuse) — the
// same discriminant as R9's `shouldSignalRecordedPid`. A live lock refuses
// with the pid and path so the caller can name what to wait on.

/**
 * Whether an existing lock file is safe to take over. Pure — exported for
 * tests. `currentStartTime` is `null` when the pid is not running at all.
 */
export function isLockStale(existing, currentStartTime) {
  if (!existing?.pid) return true;
  if (currentStartTime === null) return true; // pid dead
  if (!existing.startTime) return false; // legacy record: cannot verify identity, treat as live
  return currentStartTime !== existing.startTime; // pid reused
}

/**
 * Take a lock file at `lockPath`, replacing it if stale. Returns
 * `{ ok: true, token }` (the nonce, to hand a spawned child via
 * `AUDIT_LOCK_TOKEN`) or `{ ok: false, cause }` naming the live pid and path.
 * Every side effect is injectable for tests.
 */
export function acquireLock(
  lockPath,
  {
    isAlive = isProcessAlive,
    startTimeOf = getProcessStartTime,
    pid = process.pid,
    nonce = randomBytes(8).toString('hex'),
  } = {},
) {
  mkdirSync(dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(lockPath, JSON.stringify({ pid, startTime: startTimeOf(pid), nonce }), { flag: 'wx' });
      return { ok: true, token: nonce, lockPath };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      let existing = null;
      try {
        existing = JSON.parse(readFileSync(lockPath, 'utf8'));
      } catch {
        existing = null;
      }
      const currentStartTime = existing?.pid && isAlive(existing.pid) ? startTimeOf(existing.pid) : null;
      if (isLockStale(existing, currentStartTime)) {
        rmSync(lockPath, { force: true });
        continue;
      }
      return {
        ok: false,
        cause: `audit already running: pid ${existing.pid} holds the lock at ${lockPath}`,
      };
    }
  }
  return { ok: false, cause: `could not take the lock at ${lockPath} (still contended after taking over a stale one)` };
}

/** Release a lock this process holds — a no-op if the token does not match (never releases another holder's lock). */
export function releaseLock(lockPath, token) {
  let existing = null;
  try {
    existing = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch {
    return;
  }
  if (existing?.nonce !== token) return;
  rmSync(lockPath, { force: true });
}

/**
 * Whether a token handed to a spawned child (`AUDIT_LOCK_TOKEN`) is a valid
 * hand-off of an already-held lock: the lock file exists, its nonce matches
 * the token, and its pid is alive. A forged, stale, or absent token is never
 * honoured — the child must take the lock itself. Pure over its inputs —
 * exported for tests.
 */
export function isValidLockToken(existing, token, { isAlive = isProcessAlive } = {}) {
  return Boolean(existing && token && existing.nonce === token && existing.pid && isAlive(existing.pid));
}
