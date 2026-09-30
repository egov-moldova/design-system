/**
 * Repo invariant: a wireit entry must declare, in its own `env`, every
 * environment variable that changes what its command produces — whether a
 * wrapper script hands it in through `cross-env`, or the entry's own
 * `scripts/*.mjs` reads it from `process.env`.
 *
 * The entry's own `env` is the only route by which an environment variable
 * reaches wireit's cache key: `Fingerprint.compute` copies `script.env` and
 * reads `process.env` nowhere.
 * Baseline: `grep -n 'process\.env\|env:' node_modules/wireit/lib/fingerprint.js`
 * -> one line, `env: script.env`.
 * A variable the command reads but the entry does not declare is therefore
 * invisible to the key, so every
 * wrapper that differs only by that variable collides on one cache entry:
 * whichever ran first wins, and the rest are reported as skipped while the
 * first one's output stays on disk. `build.age` and `sp.build` hit exactly
 * that, and published a Storybook with the wrong `config.base`. See GitHub
 * issue #48.
 *
 * `{ "external": true }` is the shape that reads the variable from the outer
 * environment at analysis time; a plain string would pin one constant value and
 * collide again.
 *
 * This is a script-wiring ratchet: it proves no entry is declared in the shape
 * known to collide, never that a given build output is correct.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));

const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

/**
 * The environment variables a command sets before delegating to `yarn
 * <script>`, and the script it delegates to. Both vehicles count: `cross-env
 * VAR=v yarn x` and the POSIX inline `VAR=v yarn x`. Matching only the first
 * would let a new wrapper introduce a new variable and emit no row at all,
 * which is the silent shrink the anti-vacuity guards below exist to prevent.
 *
 * Returns `null` when the command does not delegate, and throws when it looks
 * like a delegation but cannot be read literally — quoting, substitution or a
 * shell operator. Refusing beats guessing: a parser that returned `null` on a
 * command it half-understood would drop the very wrapper it exists to check.
 */
function parseEnvDelegation(command) {
  const tokens = command.trim().split(/\s+/);
  const env = {};
  const readAssignments = from => {
    let index = from;
    for (; index < tokens.length; index++) {
      const assignment = ASSIGNMENT.exec(tokens[index]);
      if (!assignment) break;
      env[assignment[1]] = assignment[2];
    }
    return index;
  };

  const start = tokens.findIndex(
    token => ASSIGNMENT.test(token) || token === 'cross-env' || token.endsWith('/cross-env'),
  );
  if (start === -1) return null;
  const index = readAssignments(ASSIGNMENT.test(tokens[start]) ? start : start + 1);

  if (tokens[index] !== 'yarn') return null;

  const target = tokens[index + 1];
  if (target === undefined) {
    throw new Error(`Cannot read the delegation target of: ${command}`);
  }
  // Only the tokens this parse consumed. Judging the whole command string would
  // refuse `cross-env A=1 yarn sp.build && node scripts/x.mjs`, whose
  // assignments and target are unambiguous — the operator sits past them.
  const consumed = tokens.slice(start, index + 2).join(' ');
  if (/["'`$]/.test(consumed) || /(^|\s)(&&|\|\||\||;)(\s|$)/.test(consumed)) {
    throw new Error(`Cannot read literally — quoting, substitution or a shell operator: ${command}`);
  }
  if (Object.keys(env).length === 0) {
    throw new Error(`no assignment before \`yarn ${target}\`: ${command}`);
  }

  return { env, target };
}

/** Every `VAR=v … yarn <script>` wrapper declared in `scripts`. */
function delegations(scripts) {
  return Object.entries(scripts)
    .map(([name, command]) => {
      const parsed = parseEnvDelegation(command);
      return parsed === null ? null : { name, ...parsed };
    })
    .filter(Boolean);
}

const FIRST_PARTY_SCRIPT = /(?:^|\s)(scripts\/[\w./-]+\.mjs)(?=\s|$)/g;
const ENV_READ = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;

/**
 * The other vehicle for the same defect, and the one the wrapper scan above is
 * structurally blind to: a wireit entry whose own command runs a first-party
 * `scripts/*.mjs` that reads `process.env` directly. No `cross-env` appears
 * anywhere, so nothing in `scripts` gives the variable away — only the script's
 * source does. `SKIP_STDERR_CHECK` is the live instance: `yarn test`'s own help
 * text advertises it as an escape hatch, and one run that used it used to make
 * every later `yarn test` a cache hit that never re-ran the stderr assertion.
 */
function scriptEnvReads(wireit) {
  return Object.entries(wireit).flatMap(([name, entry]) =>
    [...String(entry.command ?? '').matchAll(FIRST_PARTY_SCRIPT)].flatMap(([, scriptPath]) => {
      const absolute = path.join(PROJECT_ROOT, scriptPath);
      // A path that does not resolve produces no row rather than throwing here:
      // a throw in this function body kills the whole suite before a single
      // assertion registers, which reads as a smaller green run. The anchor
      // test below is what turns a vanished row into a failure.
      if (!fs.existsSync(absolute)) return [];
      const source = fs.readFileSync(absolute, 'utf8');
      const variables = new Set([...source.matchAll(ENV_READ)].map(([, variable]) => variable));
      return [...variables].map(variable => ({ name, scriptPath, variable }));
    }),
  );
}

describe('parseEnvDelegation', () => {
  it('reads the assignments and the delegation target', () => {
    assert.deepEqual(parseEnvDelegation('yarn cross-env STORYBOOK_BASE_PATH=/age/ yarn sp.build'), {
      env: { STORYBOOK_BASE_PATH: '/age/' },
      target: 'sp.build',
    });
  });

  it('reads several assignments', () => {
    assert.deepEqual(parseEnvDelegation('cross-env CI=1 NODE_ENV=production yarn build'), {
      env: { CI: '1', NODE_ENV: 'production' },
      target: 'build',
    });
  });

  it('reads the POSIX inline form, which uses no `cross-env` at all', () => {
    assert.deepEqual(parseEnvDelegation('STORYBOOK_BASE_PATH=/beta/ yarn sp.build'), {
      env: { STORYBOOK_BASE_PATH: '/beta/' },
      target: 'sp.build',
    });
  });

  it('ignores a command that sets nothing', () => {
    assert.equal(parseEnvDelegation('yarn sp.build'), null);
  });

  it('ignores `cross-env` that runs a binary rather than delegating', () => {
    assert.equal(parseEnvDelegation('cross-env CI=1 storybook build -o storybook-static'), null);
  });

  it('refuses a delegation it cannot read literally', () => {
    assert.throws(() => parseEnvDelegation('cross-env BASE="$SOME_VAR" yarn sp.build'), /Cannot read literally/);
  });
});

/**
 * One row per (wrapper, variable) that this file can actually assert on: a
 * delegation to a plain npm script caches nothing, so there is no key to
 * collide on and no row to emit.
 */
function coveredPairs(scripts) {
  return delegations(scripts).flatMap(({ name, env, target }) =>
    packageJson.wireit[target] === undefined ? [] : Object.keys(env).map(variable => ({ name, target, variable })),
  );
}

describe('wireit cache keys cover the wrapper environment', () => {
  const covered = coveredPairs(packageJson.scripts);

  // Binds the guard to a ROW, not to a parsed wrapper. Retargeting `build.age`
  // at a script with no wireit entry — a rename, a typo, one more `yarn` hop —
  // drops its row and every assertion below it, and the suite still reports a
  // pass on a smaller test count. Issue #48 is the wrapper it was filed on.
  it('covers `build.age` → wireit `sp.build`, STORYBOOK_BASE_PATH', () => {
    assert.ok(
      covered.some(
        row => row.name === 'build.age' && row.target === 'sp.build' && row.variable === 'STORYBOOK_BASE_PATH',
      ),
      `nothing below asserts on build.age; covered rows: ${covered.map(r => `${r.name}→${r.target}:${r.variable}`).join(', ') || 'none'}`,
    );
  });

  for (const { name, target, variable } of covered) {
    it(`\`${name}\` → wireit \`${target}\` declares ${variable}`, () => {
      assert.equal(
        packageJson.wireit[target].env?.[variable]?.external,
        true,
        `wireit \`${target}\` must declare "${variable}": { "external": true }, or \`${name}\` and a plain \`yarn ${target}\` share one cache entry`,
      );
    });
  }
});

describe('wireit cache keys cover the environment its own scripts read', () => {
  const reads = scriptEnvReads(packageJson.wireit);

  // Same anti-vacuity role as above: a rename of `check-test-stderr.mjs`, or a
  // command rewritten so the path no longer appears literally, empties this
  // scan without failing it.
  it('covers wireit `test` → `scripts/check-test-stderr.mjs`, SKIP_STDERR_CHECK', () => {
    assert.ok(
      reads.some(
        row =>
          row.name === 'test' &&
          row.scriptPath === 'scripts/check-test-stderr.mjs' &&
          row.variable === 'SKIP_STDERR_CHECK',
      ),
      `nothing below asserts on the test entry; scanned rows: ${reads.map(r => `${r.name}→${r.scriptPath}:${r.variable}`).join(', ') || 'none'}`,
    );
  });

  for (const { name, scriptPath, variable } of reads) {
    it(`wireit \`${name}\` declares ${variable}, read by ${scriptPath}`, () => {
      assert.equal(
        packageJson.wireit[name].env?.[variable]?.external,
        true,
        `wireit \`${name}\` must declare "${variable}": { "external": true }, or a run that set it poisons the cache for every run that does not`,
      );
    });
  }
});

/**
 * A declared `default` is a second copy of a constant the build already has.
 * They agree today, and only while they agree does the default do what it is
 * for: making an unset variable and an explicit `/` hash the same because they
 * produce the same build. Let the two drift and that equality becomes a lie —
 * two different base paths sharing one cache entry, which is issue #48 again
 * with the copies swapped.
 */
describe('a declared wireit `default` matches the fallback the build applies', () => {
  const mainMjs = fs.readFileSync(path.join(PROJECT_ROOT, '.storybook/main.mjs'), 'utf8');
  const fallback = /config\.base\s*=\s*process\.env\.STORYBOOK_BASE_PATH\s*\|\|\s*'([^']*)'/.exec(mainMjs);

  it('finds the fallback in `.storybook/main.mjs`', () => {
    assert.ok(fallback, "no `config.base = process.env.STORYBOOK_BASE_PATH || '…'` in .storybook/main.mjs");
  });

  it("wireit `sp.build`'s STORYBOOK_BASE_PATH default equals it", () => {
    assert.equal(
      packageJson.wireit['sp.build'].env?.STORYBOOK_BASE_PATH?.default,
      fallback?.[1],
      "the declared default and `.storybook/main.mjs`'s fallback must be the same string, or an unset variable hashes as one base path and builds another",
    );
  });
});
