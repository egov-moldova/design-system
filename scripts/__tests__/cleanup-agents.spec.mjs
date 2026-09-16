/**
 * `cleanup-agents.mjs` refused to run anywhere but Windows — `snapshotProcesses`
 * threw on any other platform, so `yarn cleanup:agents:dry` exited 1 on the
 * macOS and Linux this repo actually targets (`engines.node`, and CI's
 * `ubuntu-latest`). See GitHub issue #50.
 *
 * The POSIX path reads `ps` twice and joins the two by pid. These tests cover
 * the parsing, which is where that decision is load-bearing: `comm` and `args`
 * can both contain spaces, so neither read can be split on whitespace, and a
 * single `ps` carrying both would not be parseable at all.
 *
 * Killing processes is not exercised here — a test that kills is a test that
 * can kill the wrong thing. `--dry-run` is the behavioural check, and it is a
 * command, not an assertion: `node scripts/cleanup-agents.mjs --dry-run`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyExecutable,
  isOrphan,
  joinCimRows,
  joinPsReads,
  parsePsArgs,
  parsePsComm,
} from '../cleanup-agents.mjs';

describe('classifyExecutable', () => {
  it('names node on both platforms', () => {
    assert.equal(classifyExecutable('node'), 'node');
    assert.equal(classifyExecutable('node.exe'), 'node');
  });

  it('names every Chrome build chrome', () => {
    const builds = [
      'chrome',
      'chrome.exe',
      'Chromium',
      'chromium-browser',
      'chrome-headless-shell',
      'headless_shell',
      'Google Chrome',
      'Google Chrome Helper (Renderer)',
    ];
    for (const executable of builds) assert.equal(classifyExecutable(executable), 'chrome', executable);
  });

  // The reason the pattern is anchored. `chrome-devtools-mcp` is a live MCP
  // server, not a browser; an unanchored /chrome|chromium/ claims all three.
  it('does not claim a tool whose name merely contains chrome', () => {
    for (const tool of ['chrome-devtools-mcp', 'chromedriver', 'chrome_crashpad_handler']) {
      assert.equal(classifyExecutable(tool), null, tool);
    }
  });

  it('returns null for anything else', () => {
    assert.equal(classifyExecutable('bash'), null);
    // `node` must match whole, or every Node-adjacent binary joins the sweep.
    assert.equal(classifyExecutable('nodemon'), null);
  });
});

describe('parsePsComm', () => {
  it('reads an executable that contains spaces', () => {
    const rows = parsePsComm(' 4321  1  204800  /Applications/Google Chrome.app/Contents/MacOS/Google Chrome Helper\n');
    assert.deepEqual(rows.get(4321), {
      ParentProcessId: 1,
      WorkingSetSize: 204800 * 1024,
      Name: 'chrome',
    });
  });

  it('converts RSS from KiB to bytes, matching the Windows branch', () => {
    assert.equal(parsePsComm('  7  1  1024  node\n').get(7).WorkingSetSize, 1024 * 1024);
  });

  it('skips the header and any line that is not three numbers then a name', () => {
    const rows = parsePsComm('  PID  PPID   RSS COMMAND\n  7  1  10  node\n\n');
    assert.deepEqual([...rows.keys()], [7]);
  });
});

describe('parsePsArgs', () => {
  it('keeps the whole command line, spaces and all', () => {
    const line = '  9  /usr/bin/node /x/@playwright/mcp/cli.js --headless --port 0\n';
    assert.equal(parsePsArgs(line).get(9), '/usr/bin/node /x/@playwright/mcp/cli.js --headless --port 0');
  });
});

describe('joinPsReads', () => {
  const comm = '  7  1  10  node\n  8  7  20  Chromium\n  9  1  30  bash\n';

  it('joins the two reads by pid and drops what is neither node nor chrome', () => {
    const { processes } = joinPsReads(comm, '  7  node a.js\n  8  chromium --headless\n  9  bash\n');
    assert.deepEqual(
      processes.map(row => [row.ProcessId, row.Name, row.CommandLine]),
      [
        [7, 'node', 'node a.js'],
        [8, 'chrome', 'chromium --headless'],
      ],
    );
  });

  // What `--orphans-only` rests on. A parent is usually a shell or `npm exec`,
  // which classify as neither — read the live set off the classified rows and
  // every such child reads as an orphan.
  it('reports every pid as live, including the ones it filtered out', () => {
    const { livePids } = joinPsReads(comm, '  7  node a.js\n  8  chromium --headless\n  9  bash\n');
    assert.deepEqual(
      [...livePids].sort((a, b) => a - b),
      [7, 8, 9],
    );
  });

  it('drops a row whose command line carries a control character', () => {
    const forged = '  7  node a.js\u0000 --headless\n';
    assert.deepEqual(joinPsReads(comm, forged).processes, []);
  });

  it('drops a pid that exited between the two reads rather than half-filling it', () => {
    const { processes } = joinPsReads(comm, '  7  node a.js\n');
    assert.deepEqual(
      processes.map(row => row.ProcessId),
      [7],
    );
  });
});

describe('isOrphan', () => {
  // What `--orphans-only` rests on, and the reason the help text calls that flag
  // the one to reach for while other sessions are alive: a process whose parent
  // is still running belongs to a live session, and is not this sweep's to kill.
  const live = new Set([1, 42]);

  it('is not an orphan while its parent is still in the list', () => {
    assert.equal(isOrphan({ ParentProcessId: 42 }, live), false);
  });

  it('is an orphan once its parent is gone', () => {
    assert.equal(isOrphan({ ParentProcessId: 99 }, live), true);
  });

  it('treats a missing or zero parent as an orphan', () => {
    assert.equal(isOrphan({ ParentProcessId: 0 }, live), true);
    assert.equal(isOrphan({}, live), true);
  });

  // `parsePsComm` yields numbers and the live set is built with `Number(...)`,
  // but a string ppid from any other source must not read as a live parent.
  it('compares numerically, so a string ppid is not mistaken for absent', () => {
    assert.equal(isOrphan({ ParentProcessId: '42' }, live), false);
  });
});

describe('joinCimRows (the Windows projection)', () => {
  // Unverified on Windows — no host here runs it. These pin the shape the
  // PowerShell query is asked to produce, which is the half that can be tested
  // off-platform, and nothing more.
  const rows = [
    { ProcessId: '7', ParentProcessId: '1', Name: 'node.exe', CommandLine: 'node a.js', WorkingSetSize: 1024 },
    {
      ProcessId: '8',
      ParentProcessId: '7',
      Name: 'chrome.exe',
      CommandLine: 'chrome --headless',
      WorkingSetSize: 2048,
    },
    { ProcessId: '9', ParentProcessId: '1', Name: 'explorer.exe', CommandLine: 'explorer', WorkingSetSize: 4096 },
  ];

  it('keeps only node and chrome, with the extension stripped', () => {
    const { processes } = joinCimRows(rows);
    assert.deepEqual(
      processes.map(row => [row.ProcessId, row.Name]),
      [
        [7, 'node'],
        [8, 'chrome'],
      ],
    );
  });

  it('reports every pid as live, including the ones it filtered out', () => {
    assert.deepEqual(
      [...joinCimRows(rows).livePids].sort((a, b) => a - b),
      [7, 8, 9],
    );
  });
});
