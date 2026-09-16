#!/usr/bin/env node

/**
 * cleanup-agents.mjs
 *
 * Kills orphaned Node and Chrome processes left behind by parallel Claude Code
 * agent sessions (Playwright MCP servers, agentation, context7, image-compare).
 *
 * Run after heavy parallel-agent sessions when RAM/CPU stays high:
 *   node scripts/cleanup-agents.mjs                # full sweep, verbose
 *   node scripts/cleanup-agents.mjs --dry-run      # preview only
 *   node scripts/cleanup-agents.mjs --orphans-only # only kill procs whose parent is dead (safe mid-session)
 *   node scripts/cleanup-agents.mjs --quiet        # suppress output unless something was killed
 *   node scripts/cleanup-agents.mjs --help
 *
 * Runs on macOS and Linux via `ps`, and on Windows via Win32_Process.
 *
 * `--orphans-only` is the flag to reach for while other sessions are alive: the
 * patterns below match any agent's MCP servers, not only this session's, so a
 * full sweep on a shared machine takes down someone else's too.
 *
 * Equivalent to the /cleanup-agents Claude slash command, but standalone —
 * no AI roundtrip, faster, and scriptable from package.json.
 */

import { execFileSync } from 'child_process';
import process from 'process';
import { pathToFileURL } from 'url';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const DRY_RUN = process.argv.includes('--dry-run');
const ORPHANS_ONLY = process.argv.includes('--orphans-only');
const QUIET = process.argv.includes('--quiet');

// Patterns identifying processes that belong to MCP / Playwright agent infra.
const PLAYWRIGHT_CHROME_PATTERN = /remote-debugging-port|--no-sandbox.*--disable-background|playwright/;
/** Any C0 control or DEL. Nothing a real command line carries — see `joinPsReads`. */
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

const MCP_NODE_PATTERN = /agentation-mcp|context7-mcp|mcp-image-compare|@playwright[/\\]mcp|@upstash[/\\]context7/;

function log(msg, color = colors.reset) {
  if (QUIET) return;
  console.log(`${color}${msg}${colors.reset}`);
}

function logAlways(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function isWindows() {
  return process.platform === 'win32';
}

/**
 * A process record, normalized across platforms:
 *   { ProcessId, ParentProcessId, Name: 'node' | 'chrome', CommandLine, WorkingSetSize }
 *
 * `Name` drops the Windows `.exe` so one set of comparisons serves both.
 */

/**
 * Which of the two families an executable basename belongs to, or `null`.
 *
 * Both patterns are anchored, and the trailing group requires a SPACE. An
 * unanchored `/chrome|chromium/` also claims `chrome-devtools-mcp` — a live MCP
 * server, not a browser — along with `chromedriver` and
 * `chrome_crashpad_handler`, widening the pool this script may kill to anything
 * whose name merely contains the word. The multi-word forms are real: macOS
 * ships `Google Chrome Helper (Renderer)`.
 */
const NODE_EXECUTABLE = /^node$/i;
const CHROME_EXECUTABLE =
  /^(google chrome|chromium|chromium-browser|chrome|chrome-headless-shell|headless_shell)( .*)?$/i;

export function classifyExecutable(name) {
  const base = String(name).replace(/\.exe$/i, '');
  if (NODE_EXECUTABLE.test(base)) return 'node';
  if (CHROME_EXECUTABLE.test(base)) return 'chrome';
  return null;
}

/**
 * Parse `ps -axo pid=,ppid=,rss=,comm=`: three numeric columns, then the
 * executable, which may itself contain spaces ("Google Chrome Helper"). Read
 * positionally from the left and take the remainder as `comm` — splitting on
 * whitespace would lose every multi-word executable, which on macOS is every
 * Chrome process there is.
 */
export function parsePsComm(stdout) {
  const rows = new Map();
  for (const line of stdout.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const [, pid, ppid, rss, comm] = match;
    rows.set(Number(pid), {
      ParentProcessId: Number(ppid),
      // `ps` reports RSS in KiB; the Windows branch reports bytes.
      WorkingSetSize: Number(rss) * 1024,
      Name: classifyExecutable(comm.slice(comm.lastIndexOf('/') + 1)),
    });
  }
  return rows;
}

/** Parse `ps -axo pid=,args=`: one numeric column, then the whole command line. */
export function parsePsArgs(stdout) {
  const rows = new Map();
  for (const line of stdout.split('\n')) {
    const match = /^\s*(\d+)\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    rows.set(Number(match[1]), match[2]);
  }
  return rows;
}

/**
 * Join the two `ps` reads into the record shape above.
 *
 * Two reads rather than one because `comm` and `args` can BOTH contain spaces,
 * and a single `ps` line carrying both is not parseable positionally. The pair
 * races — a process can exit between them — so a pid missing from either read
 * is dropped rather than half-filled.
 */
export function joinPsReads(commStdout, argsStdout) {
  const byPid = parsePsComm(commStdout);
  const args = parsePsArgs(argsStdout);
  const processes = [];
  for (const [pid, row] of byPid) {
    if (row.Name === null) continue;
    const commandLine = args.get(pid);
    if (commandLine === undefined) continue;
    // A process controls its own argv, and argv may hold any byte but NUL. If a
    // `ps` implementation passes a raw newline through rather than escaping it
    // (macOS prints `\012`; procps was not verified here), a crafted argv would
    // read as an extra row and could overwrite a real pid's record — attributing
    // a matching command line to a process that does not have one, and getting
    // it killed. Nothing legitimate here carries a control character.
    if (CONTROL_CHARACTER.test(commandLine)) continue;
    processes.push({ ProcessId: pid, CommandLine: commandLine, ...row });
  }
  // Every pid `ps` reported, not just the classified ones. `isOrphan` asks
  // whether a parent is still alive, and a parent is usually a shell, `npm
  // exec` or `launchd` — none of which classify. Answering that question from
  // the filtered list marks live children of live parents as orphans, which is
  // exactly what `--orphans-only` promises not to touch.
  return { processes, livePids: new Set(byPid.keys()) };
}

function snapshotPosix() {
  const read = args => execFileSync('ps', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return joinPsReads(read(['-axo', 'pid=,ppid=,rss=,comm=']), read(['-axo', 'pid=,args=']));
}

/**
 * The Windows half of `joinPsReads`, over a `Win32_Process` projection.
 *
 * Exported for the same reason the `ps` parsers are: it is the half that can be
 * tested off-platform. The `-Filter` this used to carry is gone — it kept only
 * `chrome.exe` and `node.exe`, which meant the live-pid set could not see a
 * parent that is anything else, the flaw described in `joinPsReads`.
 * `Win32_Process` reports the executable with its extension; `classifyExecutable`
 * strips it, so both platforms compare against the same two names.
 */
export function joinCimRows(rows) {
  const processes = [];
  const livePids = new Set();
  for (const row of rows) {
    livePids.add(Number(row.ProcessId));
    const Name = classifyExecutable(row.Name);
    if (Name === null) continue;
    processes.push({ ...row, ProcessId: Number(row.ProcessId), Name });
  }
  return { processes, livePids };
}

function snapshotWindows() {
  const ps = [
    'Get-CimInstance Win32_Process',
    '| Select-Object ProcessId, ParentProcessId, Name, CommandLine, WorkingSetSize',
    '| ConvertTo-Json -Compress',
  ].join(' ');

  const stdout = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  const trimmed = stdout.trim();
  if (!trimmed) return { processes: [], livePids: new Set() };

  const parsed = JSON.parse(trimmed);
  return joinCimRows(Array.isArray(parsed) ? parsed : [parsed]);
}

/**
 * Every Node and Chrome process with its command line and resident size, and
 * separately every pid `ps` reported — see `joinPsReads` for why the second is
 * not derivable from the first.
 */
function snapshotProcesses() {
  return isWindows() ? snapshotWindows() : snapshotPosix();
}

function totals(processes) {
  const acc = { node: 0, chrome: 0 };
  for (const p of processes) {
    const ws = Number(p.WorkingSetSize) || 0;
    if (p.Name === 'node') acc.node += ws;
    else if (p.Name === 'chrome') acc.chrome += ws;
  }
  return acc;
}

function formatGB(bytes) {
  return (bytes / 1024 ** 3).toFixed(2);
}

function killPids(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Process may already be gone, or we lack permission — ignore.
    }
  }
}

export function isOrphan(proc, livePidSet) {
  const ppid = Number(proc.ParentProcessId);
  if (!ppid) return true;
  return !livePidSet.has(ppid);
}

function main() {
  const { processes: before, livePids } = snapshotProcesses();
  const beforeTotals = totals(before);

  log(`Before: Node ${formatGB(beforeTotals.node)} GB | Chrome ${formatGB(beforeTotals.chrome)} GB`, colors.gray);
  log('');

  let playwrightChrome = before.filter(
    p => p.Name === 'chrome' && p.CommandLine && PLAYWRIGHT_CHROME_PATTERN.test(p.CommandLine),
  );
  let mcpNodes = before.filter(p => p.Name === 'node' && p.CommandLine && MCP_NODE_PATTERN.test(p.CommandLine));

  if (ORPHANS_ONLY) {
    // A process is an "orphan" if its parent PID no longer exists in the live
    // process list (parent crashed / exited without reaping its children).
    // Safe to run mid-session: won't touch agents whose parent (Claude Code) is
    // still alive — which is why `livePids` is every pid, not the classified ones.
    playwrightChrome = playwrightChrome.filter(p => isOrphan(p, livePids));
    mcpNodes = mcpNodes.filter(p => isOrphan(p, livePids));
  }

  if (DRY_RUN) {
    log(`[dry-run] Would kill ${playwrightChrome.length} Playwright Chrome process(es):`, colors.yellow);
    for (const p of playwrightChrome) log(`  PID ${p.ProcessId}  ${(p.CommandLine || '').slice(0, 120)}`, colors.gray);
    log(`[dry-run] Would kill ${mcpNodes.length} MCP node process(es):`, colors.yellow);
    for (const p of mcpNodes) log(`  PID ${p.ProcessId}  ${(p.CommandLine || '').slice(0, 120)}`, colors.gray);
    return;
  }

  const totalKilled = playwrightChrome.length + mcpNodes.length;

  if (playwrightChrome.length) {
    killPids(playwrightChrome.map(p => p.ProcessId));
    log(`Killed ${playwrightChrome.length} Playwright Chrome process(es).`, colors.green);
  } else {
    log('No orphaned Playwright Chrome processes found.', colors.gray);
  }

  if (mcpNodes.length) {
    killPids(mcpNodes.map(p => p.ProcessId));
    log(`Killed ${mcpNodes.length} MCP node process(es).`, colors.green);
  } else {
    log('No orphaned MCP node processes found.', colors.gray);
  }

  // In quiet mode, surface a single line if anything was actually killed — so
  // the hook leaves a breadcrumb in the transcript when it does real work.
  if (QUIET && totalKilled > 0) {
    logAlways(
      `cleanup-agents: reaped ${totalKilled} orphan(s) (${playwrightChrome.length} chrome, ${mcpNodes.length} node)`,
      colors.gray,
    );
    return;
  }

  if (QUIET) return;

  // Give the kernel a moment to release the memory before re-snapshotting.
  const start = Date.now();
  while (Date.now() - start < 1000) {
    // Synchronous wait — keeps the script single-shot without async ceremony.
  }

  const afterTotals = totals(snapshotProcesses().processes);

  log('');
  log(`After:  Node ${formatGB(afterTotals.node)} GB | Chrome ${formatGB(afterTotals.chrome)} GB`, colors.gray);
  log(
    `${colors.bold}Freed:${colors.reset}  Node ${formatGB(beforeTotals.node - afterTotals.node)} GB | Chrome ${formatGB(beforeTotals.chrome - afterTotals.chrome)} GB`,
    colors.green,
  );
}

const HELP = `cleanup-agents — kill orphaned Node and Chrome processes left by parallel agent sessions

Usage: node scripts/cleanup-agents.mjs [options]

  --dry-run        list what would be killed, kill nothing
  --orphans-only   only processes whose parent is already gone (safe mid-session)
  --quiet          print nothing unless something was killed
  --help           this text

Platforms: macOS and Linux (via \`ps\`), and Windows (via Win32_Process).
`;

/**
 * Only when run as the CLI. An ES import executes the whole module body, so
 * without this guard anything importing the parsers below — the spec, or any
 * future reuse — performs a real, non-dry-run SIGKILL sweep as a side effect of
 * the import. `process.argv` carries no `--dry-run` under `node --test`, so it
 * would be the full sweep, not the preview.
 */
const isEntrypoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    logAlways(HELP);
    process.exit(0);
  }

  try {
    main();
  } catch (err) {
    // Deliberately `logAlways`: this used to go through `log`, which `--quiet`
    // suppresses, so a failed run printed nothing at all and exited 1.
    logAlways(`cleanup-agents failed: ${err.message}`, colors.red);
    process.exit(1);
  }
}
