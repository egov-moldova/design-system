#!/usr/bin/env node
/**
 * `yarn svg:flags` — vendor the flag-icons "4x3" flag set into `mud-phone-input`.
 *
 * Source: https://github.com/lipis/flag-icons, folder `flags/4x3` (640 x 480, MIT). It is the
 * set the Figma Foundations "Flags" frame (3950:138) is made of: the 1024px bitmaps there are
 * pixel-identical to the `flags/1x1` drawings of the same release. The 4x3 drawings are used
 * because the flag is shown in a 20 x 14 box, where they show the whole flag.
 *
 * The files are optimised with SVGO (`svgo.config.flags.js`) and written to
 * `src/components/mud-phone-input/assets/flags/<code>.svg`, together with the upstream
 * `LICENSE` and a `SOURCE.json` that pins the upstream commit. Stencil copies the whole
 * `assets/` folder to `dist/`, so the licence travels with the flags.
 *
 *   yarn svg:flags                        # fetch the pinned commit and sync
 *   yarn svg:flags --from <checkout>      # use a local flag-icons checkout
 *   yarn svg:flags --ref <sha>            # sync another upstream commit (then update PINNED_COMMIT)
 *
 * Idempotent: a second run with the same input changes nothing. Files that upstream no longer
 * has are removed, so the folder always mirrors one upstream commit.
 *
 * Third-party art is shipped to every consumer, so each file is checked after optimisation:
 * a script, a style sheet, an embedded raster or an external reference stops the run.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { optimize } from 'svgo';

import { isEntrypoint } from '../lib/is-entrypoint.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..');

export const REPOSITORY = 'https://github.com/lipis/flag-icons';
/** The commit of the `v7.5.0` tag. */
export const PINNED_COMMIT = '7aa5b2bdddd570ece62c812c0cb588ccdc099e2e';
export const SOURCE_FOLDER = 'flags/4x3';
export const OUT_DIR = path.join(ROOT, 'src/components/mud-phone-input/assets/flags');

/** `md`, `ro`, the sub-national `gb-sct`, `sh-ac`, and the groups upstream names `eac`, `cefta`, `asean`. */
export const FLAG_CODE = /^[a-z]{2,5}(?:-[a-z]{2,3})?$/;

/** What a flag drawing may never contain: it is third-party markup shown on every consumer's page. */
// A `href` may only point inside the file (`<use href="#a">`): anything else is a request.
const FORBIDDEN = [/<script/i, /<style/i, /<image/i, /<foreignObject/i, /\bhref\s*=\s*["'](?!#)/i, /\son\w+\s*=/i];

export class InputError extends Error {}

const svgoConfig = () => require('../../svgo.config.flags.js');

/** The optimised text of one flag. Throws `InputError` when the drawing is not safe to ship. */
export function optimiseFlag(code, svgText) {
  let data;
  try {
    ({ data } = optimize(svgText, { ...svgoConfig(), path: `${code}.svg` }));
  } catch (error) {
    throw new InputError(`${code}.svg cannot be optimised: ${error.message}`);
  }
  const forbidden = FORBIDDEN.find(pattern => pattern.test(data));
  if (forbidden) throw new InputError(`${code}.svg matches ${forbidden}: not a plain vector drawing`);
  if (!/viewBox="/.test(data)) throw new InputError(`${code}.svg has no viewBox after optimisation`);
  return data;
}

/** Flag codes (file stems) of every `.svg` in `dir`, sorted. Rejects a name that is not a flag code. */
export function listFlagCodes(dir) {
  return fs
    .readdirSync(dir)
    .filter(name => name.endsWith('.svg'))
    .map(name => name.slice(0, -'.svg'.length))
    .map(code => {
      if (!FLAG_CODE.test(code)) throw new InputError(`${code}.svg is not named like a flag code`);
      return code;
    })
    .sort();
}

function writeIfChanged(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  fs.writeFileSync(file, text);
  return true;
}

/** Mirror `checkout/svg/l` into `outDir`. Returns what changed. */
export function syncFlags({ checkout, commit, outDir = OUT_DIR }) {
  const sourceDir = path.join(checkout, SOURCE_FOLDER);
  if (!fs.existsSync(sourceDir)) throw new InputError(`${sourceDir} does not exist: is this a flag-icons checkout?`);
  const licenseFile = path.join(checkout, 'LICENSE');
  if (!fs.existsSync(licenseFile))
    throw new InputError(`${licenseFile} does not exist: the licence must travel with the files`);

  const codes = listFlagCodes(sourceDir);
  if (codes.length === 0) throw new InputError(`${sourceDir} holds no .svg files`);

  fs.mkdirSync(outDir, { recursive: true });
  let changed = 0;
  for (const code of codes) {
    const optimised = optimiseFlag(code, fs.readFileSync(path.join(sourceDir, `${code}.svg`), 'utf8'));
    if (writeIfChanged(path.join(outDir, `${code}.svg`), optimised)) changed++;
  }

  const wanted = new Set(codes);
  let removed = 0;
  for (const code of listFlagCodes(outDir)) {
    if (wanted.has(code)) continue;
    fs.rmSync(path.join(outDir, `${code}.svg`));
    removed++;
  }

  writeIfChanged(path.join(outDir, 'LICENSE'), fs.readFileSync(licenseFile, 'utf8'));
  const source = {
    repository: REPOSITORY,
    commit,
    folder: SOURCE_FOLDER,
    license: 'MIT',
    optimiser: 'svgo (svgo.config.flags.js)',
    count: codes.length,
  };
  writeIfChanged(path.join(outDir, 'SOURCE.json'), `${JSON.stringify(source, null, 2)}\n`);
  return { count: codes.length, changed, removed };
}

function parseArgs(argv) {
  const opts = { from: undefined, ref: PINNED_COMMIT };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined || next.startsWith('--')) throw new InputError(`${arg} requires a value`);
      return next;
    };
    if (arg === '--from') opts.from = path.resolve(value());
    else if (arg === '--ref') opts.ref = value();
    else throw new InputError(`unknown argument ${arg}\nusage: yarn svg:flags [--from <checkout>] [--ref <sha>]`);
  }
  if (!/^[0-9a-f]{40}$/.test(opts.ref))
    throw new InputError(`--ref must be a full 40-character commit sha, got "${opts.ref}"`);
  return opts;
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

/** A shallow checkout of exactly `ref`, in a temporary folder. */
function fetchCommit(ref) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flag-icons-'));
  git(dir, 'init', '-q');
  git(dir, 'fetch', '-q', '--depth', '1', REPOSITORY, ref);
  git(dir, 'checkout', '-q', 'FETCH_HEAD');
  return dir;
}

function main(argv) {
  const opts = parseArgs(argv);
  const fetched = opts.from === undefined;
  const checkout = fetched ? fetchCommit(opts.ref) : opts.from;
  try {
    const commit = fetched ? opts.ref : git(checkout, 'rev-parse', 'HEAD');
    if (!fetched && commit !== opts.ref) {
      console.warn(`note: ${checkout} is at ${commit}, not the pinned ${opts.ref}; SOURCE.json records ${commit}`);
    }
    const { count, changed, removed } = syncFlags({ checkout, commit });
    console.log(`flags: ${count} files from flag-icons@${commit.slice(0, 7)} (${changed} written, ${removed} removed)`);
  } finally {
    if (fetched) fs.rmSync(checkout, { recursive: true, force: true });
  }
}

if (isEntrypoint(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
}
