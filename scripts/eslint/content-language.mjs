/**
 * content-language.mjs — the one module behind issue #163's "demo content is English" rule.
 * `copy-probe.mjs --content-language` (rendered stories) and `check-content-language.mjs`
 * (static sources) both import it, so the letter set, the dictionary-value check and the
 * allowlist cannot drift apart.
 *
 * A piece of consumer content is a violation when it
 *   (a) contains a Romanian letter or a Cyrillic letter, or
 *   (b) equals a component dictionary value (`ro-MD`, `ru-MD` or `en-US`; a `{placeholder}`
 *       matches anything) — content must never look like component copy.
 * Text listed in `content-language.allow.json` (`[{ value, reason }]`: proper nouns and
 * realistic data such as `Chișinău`) is exempt: an exact match exempts the whole text, and a
 * listed value inside a longer text is removed before the letter check.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const ROMANIAN_LETTERS = 'ăâîșțşţĂÂÎȘȚŞŢ';
export const ROMANIAN_RE = new RegExp(`[${ROMANIAN_LETTERS}]`);
export const CYRILLIC_RE = /[Ѐ-ӿ]/;

const LOCALE_KEYS = ['ro-MD', 'en-US', 'ru-MD'];
const PLACEHOLDER_RE = /\{[a-zA-Z0-9_]+\}/g;

/** `[{ value, reason }]`, every entry validated to carry both. */
export function loadAllowlist(root = DEFAULT_ROOT) {
  const path = join(root, 'scripts/eslint/content-language.allow.json');
  const entries = JSON.parse(readFileSync(path, 'utf8'));
  for (const entry of entries) {
    if (!entry.value || !entry.reason) throw new Error(`${path}: every entry needs a value and a reason`);
  }
  return entries;
}

/** Every plain-string value of a locale's message table, flattening a `Plural`'s forms too. */
function stringsOf(table) {
  const out = [];
  for (const value of Object.values(table ?? {})) {
    if (typeof value === 'string') out.push(value);
    else if (value && typeof value === 'object') {
      for (const form of Object.values(value)) if (typeof form === 'string') out.push(form);
    }
  }
  return out;
}

function wildcardRegex(str) {
  const escaped = str
    .split(PLACEHOLDER_RE)
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*?');
  return new RegExp(`^${escaped}$`, 's');
}

/**
 * `{ locale, value, test }` for every dictionary value in `src/components/<dir>/*.messages.ts`
 * (Node 24 strips the type syntax at import time). A value whose literal part, placeholders
 * removed, is shorter than 3 characters would match nearly anything and is skipped.
 */
export async function loadDictionaryValues(root = DEFAULT_ROOT) {
  const componentsDir = join(root, 'src/components');
  const out = [];
  for (const dir of readdirSync(componentsDir)) {
    const dirPath = join(componentsDir, dir);
    if (!statSync(dirPath).isDirectory()) continue;
    for (const entry of readdirSync(dirPath)) {
      if (!entry.endsWith('.messages.ts')) continue;
      const mod = await import(pathToFileURL(join(dirPath, entry)).href);
      for (const exported of Object.values(mod)) {
        if (!exported || typeof exported !== 'object') continue;
        if (!LOCALE_KEYS.every(k => k in exported)) continue;
        for (const locale of LOCALE_KEYS) {
          for (const value of stringsOf(exported[locale])) {
            if (value.replace(PLACEHOLDER_RE, '').trim().length < 3) continue;
            const re = wildcardRegex(value);
            out.push({ locale, value, test: text => re.test(text) });
          }
        }
      }
    }
  }
  return out;
}

/** The dictionary entry a text equals (a `{placeholder}` matches anything), or `undefined`. */
export function dictionaryHit(dictionary, text) {
  const t = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return dictionary.find(d => d.test(t));
}

/** Builds `check(text)` → `null` (fine) or a reason string. */
export function makeChecker({ allow, dictionary }) {
  const allowed = [...allow].map(e => e.value).sort((a, b) => b.length - a.length);
  const allowedSet = new Set(allowed);
  return function check(text) {
    const t = String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!t || allowedSet.has(t)) return null;
    let rest = t;
    for (const value of allowed) rest = rest.split(value).join(' ');
    if (ROMANIAN_RE.test(rest)) return 'Romanian letter';
    if (CYRILLIC_RE.test(rest)) return 'Cyrillic letter';
    const hit = dictionaryHit(dictionary, t);
    if (hit) return `equals the ${hit.locale} dictionary value "${hit.value}"`;
    return null;
  };
}

/** String literals of a script or TypeScript source, with 1-based line numbers. */
export function extractLiterals(source, lineOffset = 0) {
  const out = [];
  const re = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  for (const m of source.matchAll(re)) {
    const line = lineOffset + source.slice(0, m.index).split('\n').length;
    out.push({ text: m[0].slice(1, -1), line });
  }
  return out;
}

/** Text runs and attribute values of an HTML/MDX source; `<script>` bodies as literals. */
export function extractMarkup(source) {
  const out = [];
  const scripts = [];
  const withoutScripts = source.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (whole, body, offset) => {
    scripts.push({ body, line: source.slice(0, offset + whole.indexOf(body)).split('\n').length - 1 });
    return whole.replace(/[^\n]/g, ' ');
  });
  for (const { body, line } of scripts) out.push(...extractLiterals(body, line));
  const cleaned = withoutScripts.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  const tagRe = /<[^>]*>/g;
  let last = 0;
  const pushText = (chunk, base) => {
    let offset = 0;
    for (const line of chunk.split('\n')) {
      if (line.trim()) out.push({ text: line, line: cleaned.slice(0, base + offset).split('\n').length });
      offset += line.length + 1;
    }
  };
  for (const m of cleaned.matchAll(tagRe)) {
    pushText(cleaned.slice(last, m.index), last);
    for (const a of m[0].matchAll(/\s[\w:@.-]+\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      out.push({ text: a[1] ?? a[2], line: cleaned.slice(0, m.index).split('\n').length });
    }
    last = m.index + m[0].length;
  }
  pushText(cleaned.slice(last), last);
  return out;
}

/** Violations of one static source: `[{ line, text, reason }]`. */
export function checkSource(source, kind, check) {
  const strings = kind === 'ts' ? extractLiterals(source) : extractMarkup(source);
  const violations = [];
  for (const { text, line } of strings) {
    const reason = check(text);
    if (reason) violations.push({ line, text: text.trim(), reason });
  }
  return violations;
}
