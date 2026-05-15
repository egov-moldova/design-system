import fs from 'node:fs';
import path from 'node:path';

const configPath = process.argv[2];
if (!configPath) {
  throw new Error('Usage: node scripts/debug-missing-token-references.mjs tokens/core/style-dictionary.config.json');
}

const ROOT = process.cwd();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// /**
//  * Supports patterns like:
//  *  - tokens/core/**/*.tokens.json
// *  - tokens/age/**/*.tokens.json
// */
function resolveSourcePattern(pattern) {
  const normalized = pattern.replaceAll('\\', '/');

  const idx = normalized.indexOf('/**/');
  if (idx === -1) {
    // exact file path
    const abs = path.join(ROOT, normalized);
    return fs.existsSync(abs) ? [abs] : [];
  }

  const baseDir = normalized.slice(0, idx);
  const suffix = normalized.slice(idx + '/**/'.length); // e.g. *.tokens.json

  const absBase = path.join(ROOT, baseDir);
  if (!fs.existsSync(absBase)) return [];

  const allFiles = walk(absBase);

  // very small matcher: only supports "*.tokens.json"
  if (suffix === '*.tokens.json') {
    return allFiles.filter(f => f.endsWith('.tokens.json'));
  }

  // fallback: include all .json if unknown suffix
  return allFiles.filter(f => f.endsWith('.json'));
}

function isTokenLeaf(obj) {
  return obj && typeof obj === 'object' && 'value' in obj && 'type' in obj;
}

function getNodeByPath(rootObj, dotPath) {
  const parts = dotPath.split('.');
  let cur = rootObj;

  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;

    // support keys that include dots in JSON by allowing direct access on full remaining path
    if (p in cur) {
      cur = cur[p];
      continue;
    }

    return undefined;
  }

  return cur;
}

function collectLeaves(obj, currentPath = [], filePath, out = []) {
  if (isTokenLeaf(obj)) {
    out.push({
      path: currentPath.join('.'),
      filePath,
      leaf: obj,
      rawValue: obj.value,
    });
    return out;
  }

  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      collectLeaves(v, currentPath.concat(k), filePath, out);
    }
  }
  return out;
}

const configAbs = path.isAbsolute(configPath) ? configPath : path.join(ROOT, configPath);
const config = readJson(configAbs);

const sources = config.source || [];
if (!Array.isArray(sources) || sources.length === 0) {
  throw new Error(`No "source" array found in config: ${configPath}`);
}

const sourceFiles = [...new Set(sources.flatMap(resolveSourcePattern))];
if (sourceFiles.length === 0) {
  throw new Error(`No token files matched config "source": ${JSON.stringify(sources)}`);
}

// Build a merged token object (later files override earlier ones)
const merged = {};
const allLeaves = [];

for (const file of sourceFiles) {
  const json = readJson(file);

  // merge shallow at root, deep merge objects
  const deepMerge = (a, b) => {
    for (const [k, v] of Object.entries(b)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) {
        deepMerge(a[k], v);
      } else {
        a[k] = v;
      }
    }
    return a;
  };

  deepMerge(merged, json);

  // collect leaves with their original file paths
  allLeaves.push(...collectLeaves(json, [], file, []));
}

const refRegex = /\{([^}]+)\}/g;

let missingCount = 0;

for (const t of allLeaves) {
  if (typeof t.rawValue !== 'string') continue;

  const refs = [...t.rawValue.matchAll(refRegex)].map(m => m[1]);

  for (const ref of refs) {
    // common pattern: {space.6xs.value} -> reference a leaf's value
    const node = getNodeByPath(merged, ref);

    const ok =
      node !== undefined &&
      (isTokenLeaf(node) ||
        typeof node === 'string' ||
        typeof node === 'number' ||
        (node && typeof node === 'object' && 'value' in node));

    if (!ok) {
      missingCount++;
      console.error(
        [
          'Missing reference',
          `  ref: {${ref}}`,
          `  tokenPath: ${t.path}`,
          `  tokenFile: ${path.relative(ROOT, t.filePath)}`,
          `  tokenValue: ${t.rawValue}`,
        ].join('\n'),
      );
    }
  }
}

if (missingCount) {
  console.error(`\nTotal missing references: ${missingCount}`);
  process.exit(1);
} else {
  console.log('No missing references found.');
}
