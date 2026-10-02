#!/usr/bin/env node
/**
 * `yarn countries.sync` — generate the country table of `mud-phone-input`.
 *
 * Source: libphonenumber-js (MIT), whose metadata is Google's libphonenumber (Apache-2.0), fetched
 * by exact version and checked against the registry's integrity hash before a byte of it is read:
 * the package is executed here (it formats the example numbers), so it is pinned like a dependency.
 *
 * Per region (245 in the metadata):
 *   - `code`: the calling code, and `main` when the region is the one libphonenumber names the main
 *     one for it (12 codes are shared, +1 by 25 regions), so a pasted `+1...` can pick the US;
 *   - `minLen` / `maxLen`: the lengths of the *mobile* number type, or the region's own lengths when
 *     the mobile type lists none. The maintainers' hand-set rows follow the same rule;
 *   - `mask`: the grouping of the library's example mobile number in international format, with
 *     every digit as `X` and every separator as one space, padded with `X` up to `maxLen` because
 *     the input stops at the end of the mask.
 *
 * Output: `src/components/mud-phone-input/mud-phone-input.countries.ts`. Rows are sorted by ISO code
 * so a rerun with the same input changes nothing. The English `name` comes from `Intl.DisplayNames`
 * of the Node that runs this, and is only the fallback for a runtime without it.
 *
 *   yarn countries.sync                  # fetch the pinned version and generate
 *   yarn countries.sync --from <dir>     # use an unpacked libphonenumber-js of that exact version
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as prettier from 'prettier';

import { isEntrypoint } from '../lib/is-entrypoint.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..');

export const PACKAGE_NAME = 'libphonenumber-js';
export const PINNED_VERSION = '1.13.14';
export const PINNED_INTEGRITY =
  'sha512-llihgCcx0BFLksecLP+x1J+6JDE1GsXS1RN/LoPF6qcwpeQcnjj0lcvZxY8AzbEpYwyZWPZW/nDuqkqzm3amiw==';
export const OUT_FILE = path.join(ROOT, 'src/components/mud-phone-input/mud-phone-input.countries.ts');

/** Positions in a country's raw metadata array (libphonenumber-js 1.13, `metadata.max.json`). */
const ENTRY = { callingCode: 0, lengths: 3, types: 11 };
/** Position of the mobile type in the `types` list. */
const MOBILE_TYPE = 1;
/** A national number is at most 15 digits (E.164); 17 leaves room for the library's own extremes. */
const MAX_DIGITS = 17;

export class InputError extends Error {}

const isLength = n => Number.isInteger(n) && n >= 1 && n <= MAX_DIGITS;

/** Sorted, de-duplicated mobile-number lengths of one raw country entry. */
export function mobileLengths(iso, entry) {
  const types = entry[ENTRY.types];
  const mobile = Array.isArray(types) ? types[MOBILE_TYPE] : undefined;
  const own = Array.isArray(mobile) && Array.isArray(mobile[1]) ? mobile[1] : undefined;
  const lengths = own ?? entry[ENTRY.lengths];
  if (!Array.isArray(lengths) || lengths.length === 0 || !lengths.every(isLength)) {
    throw new InputError(`${iso}: no usable number lengths (${JSON.stringify(lengths)})`);
  }
  return [...new Set(lengths)].sort((a, b) => a - b);
}

/**
 * The input mask for a region from its example mobile number in international format
 * (`+373 621 12 345`): digits become `X`, any run of separators becomes one space, and the last group
 * grows with `X` until the mask holds `maxLen` digits.
 */
export function maskFromExample({ iso, international, callingCode, nationalNumber, maxLen }) {
  const prefix = `+${callingCode}`;
  if (!international.startsWith(prefix)) {
    throw new InputError(`${iso}: example "${international}" does not start with ${prefix}`);
  }
  const grouped = international.slice(prefix.length).replace(/\D+/g, ' ').trim().replace(/\d/g, 'X');
  const digits = grouped.replace(/ /g, '').length;
  if (digits !== nationalNumber.length) {
    throw new InputError(
      `${iso}: example "${international}" groups ${digits} digits, its number has ${nationalNumber.length}`,
    );
  }
  if (digits > maxLen) {
    throw new InputError(`${iso}: the example has ${digits} digits but the longest mobile number has ${maxLen}`);
  }
  return grouped + 'X'.repeat(maxLen - digits);
}

/**
 * One row per region, sorted by ISO code.
 * `metadata` is `metadata.max.json`; `exampleOf(iso)` gives `{ international, nationalNumber }`;
 * `englishName(iso)` the fallback display name.
 */
export function buildRows({ metadata, exampleOf, englishName }) {
  const rows = [];
  for (const iso of Object.keys(metadata.countries).sort()) {
    const entry = metadata.countries[iso];
    const callingCode = String(entry[ENTRY.callingCode]);
    if (!/^\d{1,3}$/.test(callingCode)) throw new InputError(`${iso}: calling code "${callingCode}" is not 1-3 digits`);

    const lengths = mobileLengths(iso, entry);
    const minLen = lengths[0];
    const maxLen = lengths[lengths.length - 1];
    const example = exampleOf(iso);
    if (!example) throw new InputError(`${iso}: the library has no example mobile number`);
    if (example.nationalNumber.length < minLen || example.nationalNumber.length > maxLen) {
      throw new InputError(
        `${iso}: the example has ${example.nationalNumber.length} digits, outside ${minLen}-${maxLen}`,
      );
    }
    const name = englishName(iso);
    if (!name || name === iso) throw new InputError(`${iso}: no English name`);

    rows.push({
      iso,
      code: `+${callingCode}`,
      name,
      mask: maskFromExample({
        iso,
        international: example.international,
        callingCode,
        nationalNumber: example.nationalNumber,
        maxLen,
      }),
      minLen,
      maxLen,
      main: metadata.country_calling_codes[callingCode]?.[0] === iso,
    });
  }
  const noMain = [...new Set(rows.map(row => row.code))].filter(
    code => !rows.some(row => row.code === code && row.main),
  );
  if (noMain.length > 0) throw new InputError(`no main region for ${noMain.join(', ')}`);
  return rows;
}

const quote = text => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** The TypeScript module text, before Prettier. */
export function renderModule(rows) {
  const lines = rows.map(
    row =>
      `  [${[quote(row.iso), quote(row.code), quote(row.name), quote(row.mask), row.minLen, row.maxLen, row.main ? 1 : 0].join(', ')}],`,
  );
  return [
    `// Generated by scripts/countries/sync-countries.mjs — do not edit; run \`yarn countries.sync\`.`,
    `// Source: ${PACKAGE_NAME}@${PINNED_VERSION} (MIT). Its metadata is Google's libphonenumber (Apache-2.0).`,
    `//`,
    `// [iso, calling code, English name (fallback), mask, shortest and longest mobile number in digits,`,
    `//  1 when libphonenumber names the region the main one for its calling code]`,
    `export type GeneratedCountry = readonly [`,
    `  iso: string,`,
    `  code: string,`,
    `  name: string,`,
    `  mask: string,`,
    `  minLen: number,`,
    `  maxLen: number,`,
    `  main: 0 | 1,`,
    `];`,
    ``,
    `export const GENERATED_COUNTRIES: readonly GeneratedCountry[] = [`,
    ...lines,
    `];`,
    ``,
  ].join('\n');
}

/** Throws unless the tarball is the exact one the registry published for the pinned version. */
export function assertIntegrity(tarball, expected = PINNED_INTEGRITY) {
  const actual = `sha512-${crypto.createHash('sha512').update(fs.readFileSync(tarball)).digest('base64')}`;
  if (actual !== expected) {
    throw new InputError(
      `${path.basename(tarball)} does not match the pinned integrity\n  expected ${expected}\n  actual   ${actual}`,
    );
  }
}

/** An unpacked, integrity-checked libphonenumber-js at the pinned version. */
function fetchPackage() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'libphonenumber-js-'));
  const name = execFileSync(
    'npm',
    ['pack', `${PACKAGE_NAME}@${PINNED_VERSION}`, '--silent', '--pack-destination', dir],
    {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  ).trim();
  assertIntegrity(path.join(dir, name));
  execFileSync('tar', ['-xzf', name], { cwd: dir });
  return { dir: path.join(dir, 'package'), cleanup: dir };
}

function loadPackage(packageDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  if (manifest.name !== PACKAGE_NAME || manifest.version !== PINNED_VERSION) {
    throw new InputError(
      `${packageDir} is ${manifest.name}@${manifest.version}, not ${PACKAGE_NAME}@${PINNED_VERSION}`,
    );
  }
  const require = createRequire(path.join(packageDir, 'noop.js'));
  return {
    lib: require('./index.cjs'),
    metadata: require('./metadata.max.json'),
    examples: require('./examples.mobile.json'),
  };
}

function parseArgs(argv) {
  const opts = { from: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') {
      const next = argv[++i];
      if (next === undefined || next.startsWith('--')) throw new InputError('--from requires a value');
      opts.from = path.resolve(next);
    } else
      throw new InputError(
        `unknown argument ${argv[i]}\nusage: yarn countries.sync [--from <unpacked ${PACKAGE_NAME}>]`,
      );
  }
  return opts;
}

export async function generate({ lib, metadata, examples }) {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const rows = buildRows({
    metadata,
    englishName: iso => names.of(iso),
    exampleOf: iso => {
      const number = lib.getExampleNumber(iso, examples, metadata);
      return number && { international: number.formatInternational(), nationalNumber: number.nationalNumber };
    },
  });
  const options = (await prettier.resolveConfig(OUT_FILE)) ?? {};
  return { rows, text: await prettier.format(renderModule(rows), { ...options, filepath: OUT_FILE }) };
}

async function main(argv) {
  const opts = parseArgs(argv);
  const fetched = opts.from === undefined ? fetchPackage() : undefined;
  try {
    const { rows, text } = await generate(loadPackage(fetched?.dir ?? opts.from));
    const same = fs.existsSync(OUT_FILE) && fs.readFileSync(OUT_FILE, 'utf8') === text;
    if (!same) fs.writeFileSync(OUT_FILE, text);
    console.log(
      `countries: ${rows.length} rows from ${PACKAGE_NAME}@${PINNED_VERSION} (${same ? 'unchanged' : 'written'})`,
    );
  } finally {
    if (fetched) fs.rmSync(fetched.cleanup, { recursive: true, force: true });
  }
}

if (isEntrypoint(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    if (!(error instanceof InputError)) throw error;
    console.error(error.message);
    process.exit(1);
  });
}
