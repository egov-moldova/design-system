#!/usr/bin/env node

/**
 * cleanup-agents.mjs
 *
 * Kills orphaned Node and Chrome processes left behind by parallel Claude Code
 * agent sessions (Playwright MCP servers, agentation, context7, image-compare).
 *
 * Run after heavy parallel-agent sessions when RAM/CPU stays high:
 *   node scripts/cleanup-agents.mjs
 *   node scripts/cleanup-agents.mjs --dry-run
 *
 * Equivalent to the /cleanup-agents Claude slash command, but standalone —
 * no AI roundtrip, faster, and scriptable from package.json.
 */

import { execFileSync } from 'child_process';
import process from 'process';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const DRY_RUN = process.argv.includes('--dry-run');

// Patterns identifying processes that belong to MCP / Playwright agent infra.
const PLAYWRIGHT_CHROME_PATTERN = /remote-debugging-port|--no-sandbox.*--disable-background|playwright/;
const MCP_NODE_PATTERN = /agentation-mcp|context7-mcp|mcp-image-compare|@playwright[/\\]mcp|@upstash[/\\]context7/;

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function isWindows() {
  return process.platform === 'win32';
}

/**
 * Snapshot all running processes with their CommandLine and WorkingSetSize.
 * Uses a single PowerShell invocation that returns JSON — much faster than
 * spawning one query per process.
 */
function snapshotProcesses() {
  if (!isWindows()) {
    throw new Error('cleanup-agents.mjs currently only supports Windows.');
  }

  const ps = [
    'Get-CimInstance Win32_Process',
    "-Filter \"Name='chrome.exe' OR Name='node.exe'\"",
    '| Select-Object ProcessId, Name, CommandLine, WorkingSetSize',
    '| ConvertTo-Json -Compress',
  ].join(' ');

  const stdout = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  const trimmed = stdout.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function totals(processes) {
  const acc = { node: 0, chrome: 0 };
  for (const p of processes) {
    const ws = Number(p.WorkingSetSize) || 0;
    if (p.Name === 'node.exe') acc.node += ws;
    else if (p.Name === 'chrome.exe') acc.chrome += ws;
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

function main() {
  const before = snapshotProcesses();
  const beforeTotals = totals(before);

  log(`Before: Node ${formatGB(beforeTotals.node)} GB | Chrome ${formatGB(beforeTotals.chrome)} GB`, colors.gray);
  log('');

  const playwrightChrome = before.filter(
    p => p.Name === 'chrome.exe' && p.CommandLine && PLAYWRIGHT_CHROME_PATTERN.test(p.CommandLine),
  );
  const mcpNodes = before.filter(p => p.Name === 'node.exe' && p.CommandLine && MCP_NODE_PATTERN.test(p.CommandLine));

  if (DRY_RUN) {
    log(`[dry-run] Would kill ${playwrightChrome.length} Playwright Chrome process(es):`, colors.yellow);
    for (const p of playwrightChrome) log(`  PID ${p.ProcessId}  ${(p.CommandLine || '').slice(0, 120)}`, colors.gray);
    log(`[dry-run] Would kill ${mcpNodes.length} MCP node process(es):`, colors.yellow);
    for (const p of mcpNodes) log(`  PID ${p.ProcessId}  ${(p.CommandLine || '').slice(0, 120)}`, colors.gray);
    return;
  }

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

  // Give the kernel a moment to release the memory before re-snapshotting.
  const start = Date.now();
  while (Date.now() - start < 1000) {
    // Synchronous wait — keeps the script single-shot without async ceremony.
  }

  const after = snapshotProcesses();
  const afterTotals = totals(after);

  log('');
  log(`After:  Node ${formatGB(afterTotals.node)} GB | Chrome ${formatGB(afterTotals.chrome)} GB`, colors.gray);
  log(
    `${colors.bold}Freed:${colors.reset}  Node ${formatGB(beforeTotals.node - afterTotals.node)} GB | Chrome ${formatGB(beforeTotals.chrome - afterTotals.chrome)} GB`,
    colors.green,
  );
}

try {
  main();
} catch (err) {
  log(`cleanup-agents failed: ${err.message}`, colors.red);
  process.exit(1);
}
