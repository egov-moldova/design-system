/**
 * Repo invariant: every repo path an npm script READS exists.
 *
 * A script that names a path which is not in the tree fails at the first thing
 * it does, and nothing catches it: npm scripts are strings, no linter resolves
 * them, and a script nobody has run this quarter can stay broken through any
 * number of green builds. Four were, at once — `format.icons` pointed at
 * `src/assets/images/icons`, and `svg:icons` read `assets/icons` while writing
 * a `local-icons.json` no component imports. See GitHub issue #50.
 *
 * Only READ positions are asserted. An output path is created by the run, so
 * requiring it to exist first would invert the check.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));

/**
 * Flags whose argument the command WRITES. Everything else that looks like a
 * path is read.
 *
 * A denylist rather than an allowlist, because the two mistakes are not
 * symmetric. Miss a read flag and the ratchet silently stops covering a script
 * — the failure it exists to prevent. Miss a write flag and one path is
 * asserted that should not be, which fails loudly, names itself, and is fixed
 * by adding one entry here.
 */
const WRITE_FLAGS = new Set(['-o', '--output', '--outFile']);

/**
 * A token names a repo path when it carries a separator or a source extension,
 * and no glob or shell metacharacter.
 *
 * The extension arm is not decoration: `--config svgo.config.icons.size.js`
 * has no separator, and a rule that required one would skip the config half of
 * every `svgo` invocation — the half that decides what the pass does.
 */
function isRepoPath(token) {
  if (!token || token.startsWith('-') || token.startsWith('@')) return false;
  // `STORYBOOK_BASE_PATH=/age/` is an assignment, not a path.
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) return false;
  if (!token.includes('/') && !/\.(m?js|cjs|json|m?ts)$/.test(token)) return false;
  if (/[*{}$"'`]/.test(token)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(token)) return false;
  return !token.startsWith('/');
}

/**
 * Every repo path a command reads.
 *
 * Every path-shaped token counts, in any position — the script handed to
 * `node`, the config `tokens.audit` passes after it, the argument of `-f` or
 * `--root` — except the argument of a write flag, which the run creates and
 * which requiring to exist first would invert the check.
 *
 * Both flag spellings are handled — `--config x` and `--config=x` — because
 * `format.icons` used the second, and a parser that knew only the first would
 * have called it clean.
 */
function readPaths(command) {
  const tokens = command.split(/\s+/);
  const found = [];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token) continue;

    if (token.startsWith('-')) {
      const equals = token.indexOf('=');
      if (equals === -1 || WRITE_FLAGS.has(token.slice(0, equals))) continue;
      const value = token.slice(equals + 1);
      if (isRepoPath(value)) found.push(value);
      continue;
    }

    const previous = tokens[index - 1];
    if (previous !== undefined && WRITE_FLAGS.has(previous)) continue;

    if (isRepoPath(token)) found.push(token);
  }

  return found;
}

describe('readPaths', () => {
  it('reads both the input directory and the config that decides what the pass does', () => {
    assert.deepEqual(readPaths('svgo -f assets/icons --config svgo.config.icons.js'), [
      'assets/icons',
      'svgo.config.icons.js',
    ]);
  });

  it('reads an `=`-joined flag argument', () => {
    assert.deepEqual(readPaths('svgo -f ./a/b --config=./c/d.js'), ['./a/b', './c/d.js']);
  });

  it('reads the script `node` runs, past its flags', () => {
    assert.deepEqual(readPaths('node --test scripts/x.mjs'), ['scripts/x.mjs']);
  });

  // The two shapes a first-flag-only reading misses. Both are live in this
  // `package.json` — `tokens.audit` and `tokens.lint` — so a parser blind to
  // them under-covers the very defect class this file exists for.
  it('reads a positional path AFTER the script', () => {
    assert.deepEqual(readPaths('node scripts/debug.mjs tokens/core/style-dictionary.config.json'), [
      'scripts/debug.mjs',
      'tokens/core/style-dictionary.config.json',
    ]);
  });

  it('reads every `--root`, not just the first', () => {
    assert.deepEqual(readPaths('node scripts/tokens-lint.mjs --root tokens/core --root tokens/core.dark'), [
      'scripts/tokens-lint.mjs',
      'tokens/core',
      'tokens/core.dark',
    ]);
  });

  it('ignores globs, URLs and bare words', () => {
    assert.deepEqual(readPaths('eslint "src/**/*.ts" --config https://x/y.js && vitest run'), []);
  });

  it('ignores an output path, which the run creates', () => {
    assert.deepEqual(readPaths('storybook build -o storybook-static'), []);
    assert.deepEqual(readPaths('node scripts/sync.mjs --input a/b.json --output tokens/figma-export'), [
      'scripts/sync.mjs',
      'a/b.json',
    ]);
  });

  it('ignores an environment assignment that looks like a path', () => {
    assert.deepEqual(readPaths('cross-env STORYBOOK_BASE_PATH=/age/ yarn sp.build'), []);
  });

  it('ignores a scoped workspace name, which is not a path', () => {
    assert.deepEqual(readPaths('yarn workspace @egov-moldova/mud-react build'), []);
  });
});

describe('every repo path an npm script reads exists', () => {
  const referenced = Object.entries(packageJson.scripts).flatMap(([name, command]) =>
    readPaths(command).map(referencedPath => ({ name, referencedPath })),
  );

  // Bound to ROWS, not to a count. A count floor only fires when the extractor
  // goes to zero; these three name one of each position it has to see — a read
  // flag's argument, a config with no separator in it, and a positional after
  // the script — so losing any one of the three fails instead of shrinking the
  // scan quietly.
  const COVERS = [
    ['svg:remove-size', 'src/components/mud-icon/assets'],
    ['svg:remove-fill', 'svgo.config.icons.fill.js'],
    ['tokens.audit', 'tokens/core/style-dictionary.config.json'],
  ];

  for (const [name, referencedPath] of COVERS) {
    it(`still sees \`${name}\` → ${referencedPath}`, () => {
      assert.ok(
        referenced.some(row => row.name === name && row.referencedPath === referencedPath),
        `the extractor no longer reads \`${referencedPath}\` out of \`${name}\`; it found: ${readPaths(packageJson.scripts[name] ?? '').join(', ') || 'nothing'}`,
      );
    });
  }

  for (const { name, referencedPath } of referenced) {
    it(`\`${name}\` reads ${referencedPath}`, () => {
      assert.ok(
        fs.existsSync(path.join(PROJECT_ROOT, referencedPath)),
        `\`yarn ${name}\` reads \`${referencedPath}\`, which is not in the tree — the script exits before it does anything`,
      );
    });
  }
});

describe('the SVG scripts do what their names say', () => {
  const scripts = packageJson.scripts;

  // Two names describing one behaviour means one of them describes something
  // that never happens, and `svg:icons` chains both — so the same pass runs
  // twice and the missing one is never noticed.
  it('`svg:remove-size` and `svg:remove-fill` are not the same command', () => {
    assert.notEqual(
      scripts['svg:remove-size'],
      scripts['svg:remove-fill'],
      'the two are byte-identical, so one of the two names strips something nothing strips',
    );
  });
});

/** The `<file>` in `import … from './assets/<file>'` inside a component source. */
function importedAssetJson(componentSource) {
  const match = /from '\.\/assets\/([\w.-]+\.json)'/.exec(componentSource);
  return match?.[1] ?? null;
}

describe('`svg:icons` produces the manifest the component imports', () => {
  const iconTsx = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/mud-icon/mud-icon.tsx'), 'utf8');
  const imported = importedAssetJson(iconTsx);

  it('finds the manifest `mud-icon.tsx` imports', () => {
    assert.ok(imported, "no `import … from './assets/<file>.json'` in src/components/mud-icon/mud-icon.tsx");
  });

  it('the generator `svg:icons` runs writes that same file', () => {
    const generator = readPaths(packageJson.scripts['svg:icons']).find(candidate => candidate.startsWith('scripts/'));
    assert.ok(generator, `\`svg:icons\` runs no first-party script: ${packageJson.scripts['svg:icons']}`);

    const source = fs.readFileSync(path.join(PROJECT_ROOT, generator), 'utf8');
    assert.ok(
      source.includes(imported),
      `\`svg:icons\` runs \`${generator}\`, which never names \`${imported}\` — the manifest mud-icon.tsx imports. It writes something nothing reads`,
    );
  });
});
