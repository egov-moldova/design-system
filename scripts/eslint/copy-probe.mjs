#!/usr/bin/env node
/**
 * copy-probe.mjs — issue #163's acceptance bar, second row: the RUNTIME net over
 * `storybook-static/`. Serves the build locally, opens every story of every Phase 1-5
 * component (the folders that own a `*.messages.ts` dictionary — derived from the tree,
 * never a hand-kept list) with the Storybook `lang` global forced to `ru-MD`
 * (`.storybook/preview.js`'s `langDecorator`, set via the `globals=lang:ru-MD` query param
 * rather than the toolbar UI), and inspects component-owned text: shadow-root text nodes
 * and shadow-internal copy attributes, excluding assigned/slotted nodes (a light-DOM child of
 * any custom element — the walk never treats it as owned, matching the bar's wording; a
 * literal written there by an outer component's own JSX is already caught statically by
 * `mud/no-hardcoded-copy`, so this probe existing only for the non-JSX heuristic's gap does
 * not need to re-open it).
 *
 * A hit is a component-owned instance that either:
 *   (a) equals a `ro-MD`/`en-US` dictionary value (a `{placeholder}` matches anything), or
 *   (b) contains a Latin-letter word of 3+ letters, UNLESS the WHOLE instance equals one of
 *       that instance's own host's current attribute values (consumer input, read from the
 *       rendered DOM) or a `ru-MD` dictionary value.
 * An instance whose closest owning host carries an explicit `locale` attribute is skipped
 * (its own `locale` beating the page `lang` is the designed behaviour) and counted separately.
 *
 * `--content-language` runs the OTHER direction (issue #163, round 2): the consumer content of
 * every story — light-DOM text, light-DOM attribute values and complex props such as `items` /
 * `rows` — must be English. It fails on a Romanian or Cyrillic letter, or on a string equal to
 * a component dictionary value (content must not look like component copy), except values in
 * `content-language.allow.json`, stories whose id appears in a `test/*.figma.json` manifest
 * (the pixel-perfect diff compares them to Figma), and `Locales` stories — recognised
 * structurally: a story whose rendered DOM holds instances with an explicit `locale`
 * resolving to each of `ro-MD`, `en-US` and `ru-MD`, never by name. The letter set,
 * dictionary check and allowlist live in `content-language.mjs`, shared with
 * `scripts/check-content-language.mjs` (the static sources).
 *
 * `--overflow` (issue #163, round 2) checks the layout cost of longer translations: under
 * `ru-MD`, in every story, no component-owned text element — an element inside a shadow root
 * with a text node of its own that contains a `ru-MD` dictionary value — may have
 * `scrollWidth > clientWidth` while its computed `overflow-x` is not `visible` (text clipped or
 * scrolled away). Consumer content (a deliberately long `label`) is not a translation cost and
 * is not checked; an element 1px wide or less is a visually-hidden text by design. A flag is fixed in the
 * component's CSS through tokens, or listed in `overflow.allow.json` with a reason:
 * `[{ component, element, story?, reason }]`, where `element` is `tag.class.class` as printed
 * in the report and an omitted `story` matches every story.
 *
 * Requires `yarn sp.build` to have produced `storybook-static/` first — this script only
 * serves what is already built, it never invokes Storybook itself.
 *
 * Usage: node scripts/eslint/copy-probe.mjs [--content-language | --overflow]
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { launchBrowser, mapLimit } from '../audit/lib/browser-context.mjs';
import { isEntrypoint } from '../lib/is-entrypoint.mjs';
import { dictionaryHit, loadAllowlist, loadDictionaryValues, makeChecker } from './content-language.mjs';

const ROOT = process.cwd();
const STATIC_DIR = join(ROOT, 'storybook-static');
const COMPONENTS_DIR = join(ROOT, 'src/components');
const CONCURRENCY = 6;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.map': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

/** "Shadow-internal copy attributes" — the same copy-bearing set `no-hardcoded-copy.mjs`
 * treats as JSX copy, plus the plain-HTML attributes a component's own template may set. */
const COPY_ATTRS = [
  'aria-label',
  'aria-roledescription',
  'aria-valuetext',
  'aria-placeholder',
  'aria-description',
  'aria-braillelabel',
  'title',
  'alt',
  'placeholder',
];

// ── Static server over storybook-static/ (no dependency on an installed `serve`) ──

/**
 * Resolves a request path under `dir`, refusing anything that escapes it. `path.relative`
 * (not `startsWith`) is what catches a sibling directory sharing `dir`'s prefix
 * (`storybook-static-x/` against `storybook-static/`) — a bare prefix check has no separator
 * boundary and passes it. The escape test is `isAbsolute(rel)` (a request path already absolute
 * on `dir`, e.g. reaching a different drive/root) or `rel` being exactly `..` or starting with
 * `..` + the path separator — never a bare `rel.startsWith('..')`, which would also refuse a
 * legitimately-named file or directory like `..foo`.
 */
export function resolveStaticPath(dir, urlPath) {
  const filePath = join(dir, urlPath === '/' ? 'index.html' : urlPath);
  const rel = relative(dir, filePath);
  const escapes = isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`);
  if (escapes || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    return join(dir, 'index.html');
  }
  return filePath;
}

/**
 * Decodes the path portion of a request URL, or `null` for a malformed percent-escape (a lone
 * `%` or an invalid UTF-8 sequence) — `decodeURIComponent` throws on those, and a request error
 * must never crash the probe's own server.
 */
export function decodeUrlPath(url) {
  try {
    return decodeURIComponent((url ?? '/').split('?')[0]);
  } catch {
    return null;
  }
}

function serveStatic(dir, port) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const urlPath = decodeUrlPath(req.url);
      if (urlPath === null) {
        res.writeHead(400);
        res.end();
        return;
      }
      const filePath = resolveStaticPath(dir, urlPath);
      try {
        const body = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

// ── Dictionaries: derived from the tree, never a hand-kept component list ──

/** `{ dir, path }` for every `src/components/<dir>/*.messages.ts` on disk. */
function findMessagesFiles() {
  const found = [];
  for (const dir of readdirSync(COMPONENTS_DIR)) {
    const dirPath = join(COMPONENTS_DIR, dir);
    if (!statSync(dirPath).isDirectory()) continue;
    for (const entry of readdirSync(dirPath)) {
      if (entry.endsWith('.messages.ts')) found.push({ dir, path: join(dirPath, entry) });
    }
  }
  return found;
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

const PLACEHOLDER_RE = /\{[a-zA-Z0-9_]+\}/g;

/** A dictionary string, with `{placeholder}` segments as wildcards, anchored to the whole text. */
function wildcardRegex(str, anchored = true) {
  const escaped = str
    .split(PLACEHOLDER_RE)
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*?');
  return new RegExp(anchored ? `^${escaped}$` : escaped, 's');
}

function buildMatcher(strings) {
  const regexes = strings.filter(Boolean).map(str => wildcardRegex(str));
  return text => regexes.some(re => re.test(text));
}

/**
 * Text that CONTAINS a dictionary value — component copy composed with other text (a
 * suffix after a label, a count before a unit). Values under three letters are skipped:
 * a short word such as `из` would match almost any Russian text.
 */
function buildContainsMatcher(strings) {
  const regexes = strings
    .filter(str => str && str.replace(PLACEHOLDER_RE, '').replace(/[^\p{L}]/gu, '').length >= 3)
    .map(str => wildcardRegex(str, false));
  return text => regexes.some(re => re.test(text));
}

/**
 * Loads every `*.messages.ts` dictionary directly (Node 24 strips `.ts` type syntax at
 * import time — no build step needed; these files carry only type-only imports and object
 * literals, which is exactly what stripping supports). Returns the matcher for `ro-MD`/
 * `en-US` values, the matcher for `ru-MD` values, and the set of component folders found
 * (Phases 1-5's target set for story filtering).
 */
async function loadDictionaries() {
  const files = findMessagesFiles();
  const roEn = [];
  const ru = [];
  const dirs = new Set();
  for (const { dir, path } of files) {
    dirs.add(dir);
    const mod = await import(pathToFileURL(path).href);
    for (const exported of Object.values(mod)) {
      if (!exported || typeof exported !== 'object') continue;
      const keys = Object.keys(exported);
      if (!['ro-MD', 'en-US', 'ru-MD'].every(k => keys.includes(k))) continue; // not a LocaleMessages export
      roEn.push(...stringsOf(exported['ro-MD']), ...stringsOf(exported['en-US']));
      ru.push(...stringsOf(exported['ru-MD']));
    }
  }
  return { matchesRoEn: buildMatcher(roEn), matchesRu: buildMatcher(ru), containsRu: buildContainsMatcher(ru), dirs };
}

// ── Story discovery ──

async function fetchStories(baseUrl, dirs) {
  const res = await fetch(`${baseUrl}/index.json`);
  if (!res.ok) throw new Error(`index.json → HTTP ${res.status}`);
  const data = await res.json();
  const entries = Object.values(data.entries ?? data.stories ?? {});
  return entries.filter(
    entry =>
      entry.type === 'story' &&
      (dirs
        ? [...dirs].some(dir => (entry.importPath ?? '').includes(`src/components/${dir}/`))
        : (entry.importPath ?? '').includes('src/components/')),
  );
}

// ── `--content-language`: consumer content must be English ──

// Story ids named by any `test/*.figma.json` manifest under src/components — the Figma-reference stories.
function protectedStoryIds() {
  const ids = new Set();
  for (const dir of readdirSync(COMPONENTS_DIR)) {
    const testDir = join(COMPONENTS_DIR, dir, 'test');
    if (!existsSync(testDir)) continue;
    for (const file of readdirSync(testDir)) {
      if (!file.endsWith('.figma.json')) continue;
      for (const m of readFileSync(join(testDir, file), 'utf8').matchAll(/"story"\s*:\s*"([^"]+)"/g)) ids.add(m[1]);
    }
  }
  return ids;
}

/**
 * Walks the light DOM of `document.body` — never a shadow root — and returns the consumer's
 * content: text nodes, attribute values, and the strings inside complex (array / plain-object)
 * props of custom elements (`items`, `rows`, … are never reflected to attributes). Also returns
 * the `locale` of every element that carries one, for the structural `Locales` test.
 * Serialised by `page.evaluate`: no closure over module scope.
 */
function collectConsumerContent() {
  const SKIP_ATTRS = new Set([
    'class',
    'style',
    'id',
    'slot',
    'for',
    'href',
    'src',
    'srcset',
    'd',
    'viewbox',
    'fill',
    'stroke',
    'width',
    'height',
    'x',
    'y',
    'cx',
    'cy',
    'r',
    'points',
    'transform',
    'role',
    'tabindex',
    'target',
    'rel',
    'xmlns',
  ]);
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);
  const content = [];
  const locales = [];
  const add = (text, kind, componentSet = false) => {
    const t = (text ?? '').trim();
    if (t) content.push({ text: t, kind, componentSet });
  };
  const visitData = (val, depth, seen) => {
    if (val == null || depth > 4) return;
    if (typeof val === 'string') return add(val, 'prop');
    if (typeof val !== 'object' || val instanceof Node || typeof val.then === 'function' || seen.has(val)) return;
    seen.add(val);
    if (Array.isArray(val)) return val.forEach(v => visitData(v, depth + 1, seen));
    const proto = Object.getPrototypeOf(val);
    if (proto !== Object.prototype && proto !== null) return;
    Object.values(val).forEach(v => visitData(v, depth + 1, seen));
  };
  const walk = node => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) add(child.nodeValue, 'text');
      else if (child.nodeType === Node.ELEMENT_NODE) {
        if (SKIP_TAGS.has(child.tagName)) continue;
        for (const attr of child.attributes) {
          const name = attr.name.toLowerCase();
          if (SKIP_ATTRS.has(name) || name.startsWith('data-') || name.startsWith('on')) continue;
          // A host attribute the component itself wrote (`aria-label` naming the host with its
          // built-in copy) is component-owned, not consumer content: see recordComponentAttributes.
          add(attr.value, `attr:${name}`, child.__componentSet?.get(name) === attr.value);
        }
        if (child.hasAttribute('locale')) locales.push(child.getAttribute('locale'));
        else if (child.tagName.includes('-') && typeof child.locale === 'string' && child.locale) {
          locales.push(child.locale);
        }
        if (child.tagName.includes('-')) {
          const seen = new WeakSet();
          for (const key in child) {
            if (key.startsWith('on') || key === 'style' || key === 'dataset') continue;
            let val;
            try {
              val = child[key];
            } catch {
              continue;
            }
            if (val && typeof val === 'object') visitData(val, 0, seen);
          }
        }
        walk(child);
      }
    }
  };
  walk(document.body);
  return { content, locales };
}

/** `ro…` → `ro-MD`, `ru…` → `ru-MD`, `en…` → `en-US`: the locale a `locale` value resolves to. */
function resolveLocale(value) {
  const lang = String(value).toLowerCase().split(/[-_]/)[0];
  return { ro: 'ro-MD', ru: 'ru-MD', en: 'en-US' }[lang] ?? null;
}

/**
 * Installed before any page script runs: records every attribute a custom element receives
 * through `setAttribute` (Stencil's reflect / host-naming path), so the collector can tell a
 * value the COMPONENT wrote from one the story's HTML parser set — only the latter is content.
 */
function recordComponentAttributes() {
  const original = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (this.tagName.includes('-')) (this.__componentSet ??= new Map()).set(String(name).toLowerCase(), String(value));
    return original.call(this, name, value);
  };
}

async function scanStoryContent(browser, baseUrl, storyId) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.addInitScript(recordComponentAttributes);
    const url = `${baseUrl}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(300); // Stencil hydration settling
    return await page.evaluate(collectConsumerContent);
  } finally {
    await context.close();
  }
}

async function mainContentLanguage() {
  if (!existsSync(STATIC_DIR)) {
    console.error(`[copy-probe] ${STATIC_DIR} does not exist. Run \`yarn sp.build\` first.`);
    process.exit(1);
  }
  const dictionary = await loadDictionaryValues(ROOT);
  const check = makeChecker({ allow: loadAllowlist(ROOT), dictionary });
  const protectedIds = protectedStoryIds();
  const server = await serveStatic(STATIC_DIR, 0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const { browser, close } = await launchBrowser({ headless: true });
  const hits = [];
  let scanned = 0;
  let exemptProtected = 0;
  const localesStories = [];
  try {
    const stories = await fetchStories(baseUrl, null);
    console.log(`[copy-probe --content-language] ${stories.length} stories, ${protectedIds.size} protected ids.`);
    await mapLimit(stories, CONCURRENCY, async story => {
      const { content, locales } = await scanStoryContent(browser, baseUrl, story.id);
      const resolved = new Set(locales.map(resolveLocale));
      if (['ro-MD', 'en-US', 'ru-MD'].every(l => resolved.has(l))) {
        localesStories.push(story.id);
        return;
      }
      if (protectedIds.has(story.id)) {
        exemptProtected++;
        return;
      }
      scanned++;
      const seen = new Set();
      for (const item of content) {
        // component-written and equal to a dictionary value: the component's own copy, not content
        if (item.componentSet && dictionaryHit(dictionary, item.text)) continue;
        const reason = check(item.text);
        const key = `${item.kind}|${item.text}`;
        if (reason && !seen.has(key)) {
          seen.add(key);
          hits.push({ story: story.id, kind: item.kind, text: item.text, reason });
        }
      }
    });
  } finally {
    await close();
    server.close();
  }
  for (const hit of hits.sort((a, b) => a.story.localeCompare(b.story))) {
    console.log(`${hit.story} · ${hit.kind} · ${hit.reason} · ${hit.text.slice(0, 120)}`);
  }
  console.log(
    `[copy-probe --content-language] scanned: ${scanned}, protected (exempt): ${exemptProtected}, ` +
      `Locales (exempt): ${localesStories.length} [${localesStories.sort().join(', ')}], hits: ${hits.length}`,
  );
  process.exit(hits.length > 0 ? 1 : 0);
}

// ── The in-page walk ──

/**
 * Walks `document.body`, collecting every component-owned text node and copy attribute
 * value (see the module doc for the ownership rule), each tagged with its closest owning
 * host's tag name, whether that string is one of the host's own attribute/prop values
 * (consumer input), and whether that host (or an ancestor host) carries an explicit
 * `locale` attribute.
 *
 * `page.evaluate` serializes ONLY this function's own source and runs it with no closure
 * over the module scope — `hostOwnStrings` below is nested rather than a sibling
 * declaration for that reason.
 */
function collectInPage(copyAttrs) {
  const hostStringsCache = new WeakMap();

  /**
   * Every string value reachable from a Stencil host's own props — attributes plus, for a
   * complex prop (`items`, an array of `{ label, href }`), the JS property itself, since a
   * non-primitive `@Prop()` is never reflected to a DOM attribute. Own props surface only
   * through `for…in` (Stencil defines them as prototype accessors, not own-enumerable
   * properties — confirmed empirically against a built `mud-breadcrumb` story: `items` and
   * its nested `label`s are absent from `Object.keys(host)` but present via `for…in`).
   * Recursion stops at depth 3, never enters a `Node`/thenable-valued property (the DOM's
   * own `offsetParent` etc. would otherwise walk the whole document), and never revisits an
   * object (cycle-safe). Cached per host: this runs `for…in` over the full HTMLElement
   * prototype chain, so it is paid once per host, not once per text/attribute instance
   * found inside it.
   */
  const hostOwnStrings = host => {
    const cached = hostStringsCache.get(host);
    if (cached) return cached;
    const out = new Set();
    // Trimmed: a copy attribute's rendered text node is trimmed too (`record()` below), and
    // a value carrying a deliberate trailing space for visual spacing — `ctaText: 'Drag and
    // drop or '`, the dictionary's own convention — would otherwise never equal/contain the
    // trimmed text it produces. Confirmed against `mud-file-input`'s `cta-text` override.
    for (const attr of host.attributes) if (attr.value.trim()) out.add(attr.value.trim());
    // The `observeAriaLabel` pattern (`src/utils/aria-label.ts`) reads the consumer's
    // `aria-label` once and STRIPS it from the host, mirroring it into a shadow-internal
    // element instead — by the time this walk runs, `host.attributes` no longer carries it.
    // `scanStory`'s `addInitScript` records every stripped value into
    // `window.__mudRemovedAriaLabels` before Stencil's own code can remove it.
    const removed = window.__mudRemovedAriaLabels?.get(host);
    if (removed) out.add(removed);
    const seen = new WeakSet();
    const visit = (val, depth) => {
      if (val == null || depth > 3) return;
      if (typeof val === 'string') {
        if (val) out.add(val);
        return;
      }
      if (typeof val !== 'object') return;
      if (val instanceof Node || typeof val.then === 'function') return; // never walk the DOM or a Promise
      if (seen.has(val)) return;
      seen.add(val);
      if (Array.isArray(val)) {
        for (const v of val) visit(v, depth + 1);
        return;
      }
      const proto = Object.getPrototypeOf(val);
      if (proto !== Object.prototype && proto !== null) return; // plain data objects only
      for (const v of Object.values(val)) visit(v, depth + 1);
    };
    for (const key in host) {
      if (key.startsWith('on') || key === 'style' || key === 'dataset') continue;
      let val;
      try {
        val = host[key];
      } catch {
        continue; // a getter that throws outside its normal lifecycle — not a copy source
      }
      if (typeof val === 'function' || val instanceof Node) continue;
      visit(val, 0);
    }
    // The host's own light-DOM subtree — the standard progressive-enhancement pattern
    // (native `<option>`/`<optgroup>` children a custom select relays into its own shadow
    // listbox; a nested `<mud-*-item>` custom element whose own prop the parent reads and
    // re-renders) is consumer input "read from the rendered DOM" just as much as an
    // attribute is, even though it is neither an attribute nor a prop OF THIS host.
    // Confirmed empirically against a built `mud-select` story: its light `<option>`
    // children's text is copied into shadow-DOM `.option-label` spans with no reflected
    // prop or attribute carrying it.
    const walkLight = el => {
      if (seen.has(el)) return;
      seen.add(el);
      const text = (el.textContent ?? '').trim();
      if (text) out.add(text);
      for (const attr of el.attributes ?? []) if (attr.value.trim()) out.add(attr.value.trim());
      if (el.tagName?.includes('-')) for (const s of hostOwnStrings(el)) out.add(s);
      for (const child of el.children ?? []) walkLight(child);
    };
    for (const child of host.children) walkLight(child);
    hostStringsCache.set(host, out);
    return out;
  };

  const results = [];
  const record = (text, hostChain) => {
    const host = hostChain[hostChain.length - 1];
    // Containment, not exact equality: a composite accessible name built by joining a
    // host-owned value with a locale-driven suffix (`mud-stepper`'s
    // `${step.label}${statusSuffix}`) is exempt because the Latin words in it sit "inside a
    // string equal to" the host's own value — the bar's own wording — even though the WHOLE
    // instance is not that value verbatim.
    const hostOwnValue = host ? [...hostOwnStrings(host)].some(v => v && text.includes(v)) : false;
    results.push({
      component: host ? host.tagName.toLowerCase() : null,
      text,
      hostOwnValue,
      explicitLocale: hostChain.some(h => h.hasAttribute('locale')),
    });
  };
  const walk = (node, insideShadow, hostChain) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = (child.nodeValue ?? '').trim();
        if (insideShadow && text) record(text, hostChain);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (insideShadow) {
          for (const attr of copyAttrs) {
            if (child.hasAttribute(attr)) {
              const text = child.getAttribute(attr).trim();
              if (text) record(text, hostChain);
            }
          }
        }
        // A custom element's own light-DOM children are assigned/slotted content — never
        // this element's own shadow-owned copy — so the walk drops `insideShadow` there,
        // regardless of nesting depth.
        const isCustomElement = child.tagName.includes('-');
        walk(child, isCustomElement ? false : insideShadow, hostChain);
        if (child.shadowRoot) walk(child.shadowRoot, true, [...hostChain, child]);
      }
    }
  };
  walk(document.body, false, []);
  return results;
}

/**
 * Installed before any page script runs (Stencil's bundle included): records every
 * `aria-label` value an element carries at the moment it is removed, into
 * `window.__mudRemovedAriaLabels`, so `hostOwnStrings` can still see a value the
 * `observeAriaLabel`/`nameHostWithFallback` pattern (`src/utils/aria-label.ts`) has already
 * stripped off the host by the time the walk runs.
 */
function recordRemovedAriaLabels() {
  window.__mudRemovedAriaLabels = new WeakMap();
  const original = Element.prototype.removeAttribute;
  Element.prototype.removeAttribute = function (name) {
    if (name === 'aria-label') {
      const value = this.getAttribute('aria-label');
      if (value) window.__mudRemovedAriaLabels.set(this, value);
    }
    return original.call(this, name);
  };
}

async function scanStory(browser, baseUrl, storyId) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.addInitScript(recordRemovedAriaLabels);
    const url = `${baseUrl}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story&globals=${encodeURIComponent(
      'lang:ru-MD',
    )}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(300); // Stencil hydration settling
    return await page.evaluate(collectInPage, COPY_ATTRS);
  } finally {
    await context.close();
  }
}

// ── `--overflow`: longer translations must not be clipped ──

/**
 * Walks every shadow root under `document.body` and returns the component-owned text elements
 * (an element with a non-empty text node of its own, inside a shadow root) whose content is
 * wider than its box while `overflow-x` is not `visible`. Serialised by `page.evaluate`.
 */
function collectOverflow() {
  const flags = [];
  const describe = el => {
    const classes = [...el.classList].sort().map(c => `.${c}`);
    return `${el.tagName.toLowerCase()}${classes.join('')}`;
  };
  const check = (el, host) => {
    const ownText = [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim());
    if (!ownText) return;
    const style = getComputedStyle(el);
    if (style.overflowX === 'visible') return;
    // A 1px slack absorbs sub-pixel rounding; a box 1px wide or less is visually hidden on purpose.
    if (el.scrollWidth - el.clientWidth <= 1 || el.clientWidth <= 1) return;
    flags.push({
      component: host.tagName.toLowerCase(),
      element: describe(el),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflow: style.overflowX,
      textOverflow: style.textOverflow,
      text: el.textContent.trim().slice(0, 60),
      fullText: el.textContent.trim(),
    });
  };
  const walk = (root, host) => {
    for (const el of root.querySelectorAll('*')) {
      if (host) check(el, host);
      if (el.shadowRoot) walk(el.shadowRoot, el);
    }
  };
  walk(document.body, null);
  return flags;
}

async function scanStoryOverflow(browser, baseUrl, storyId) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  try {
    const url = `${baseUrl}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story&globals=${encodeURIComponent(
      'lang:ru-MD',
    )}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(300); // Stencil hydration settling
    return await page.evaluate(collectOverflow);
  } finally {
    await context.close();
  }
}

function loadOverflowAllowlist() {
  const path = join(ROOT, 'scripts/eslint/overflow.allow.json');
  const entries = JSON.parse(readFileSync(path, 'utf8'));
  for (const e of entries) {
    if (!e.component || !e.element || !e.reason)
      throw new Error(`${path}: every entry needs component, element and reason`);
  }
  return entries;
}

async function mainOverflow() {
  const { containsRu } = await loadDictionaries();
  if (!existsSync(STATIC_DIR)) {
    console.error(`[copy-probe] ${STATIC_DIR} does not exist. Run \`yarn sp.build\` first.`);
    process.exit(1);
  }
  const allow = loadOverflowAllowlist();
  const used = new Set();
  const server = await serveStatic(STATIC_DIR, 0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const { browser, close } = await launchBrowser({ headless: true });
  const hits = [];
  let allowed = 0;
  let stories = [];
  try {
    stories = await fetchStories(baseUrl, null);
    console.log(`[copy-probe --overflow] ${stories.length} stories under ru-MD.`);
    await mapLimit(stories, CONCURRENCY, async story => {
      for (const flag of await scanStoryOverflow(browser, baseUrl, story.id)) {
        if (!containsRu(flag.fullText)) continue; // consumer content, not a translation
        const row = allow.find(
          e => e.component === flag.component && e.element === flag.element && (!e.story || e.story === story.id),
        );
        if (row) {
          used.add(row);
          allowed++;
        } else hits.push({ story: story.id, ...flag });
      }
    });
  } finally {
    await close();
    server.close();
  }
  for (const hit of hits.sort((a, b) => a.story.localeCompare(b.story))) {
    console.log(
      `${hit.story} · ${hit.component} · ${hit.element} · scrollWidth ${hit.scrollWidth} > clientWidth ${hit.clientWidth} · ` +
        `overflow ${hit.overflow} · text-overflow ${hit.textOverflow} · "${hit.text}"`,
    );
  }
  for (const row of allow.filter(e => !used.has(e))) {
    console.log(`[copy-probe --overflow] note: allowlist row never matched: ${row.component} ${row.element}`);
  }
  console.log(
    `[copy-probe --overflow] stories: ${stories.length}, allowlisted flags: ${allowed}, hits: ${hits.length}`,
  );
  process.exit(hits.length > 0 ? 1 : 0);
}

// ── Main ──

async function main() {
  if (process.argv.includes('--content-language')) return mainContentLanguage();
  if (process.argv.includes('--overflow')) return mainOverflow();
  if (!existsSync(STATIC_DIR)) {
    console.error(`[copy-probe] ${STATIC_DIR} does not exist. Run \`yarn sp.build\` first.`);
    process.exit(1);
  }

  const { matchesRoEn, matchesRu, dirs } = await loadDictionaries();
  console.log(`[copy-probe] ${dirs.size} component(s) with a *.messages.ts dictionary.`);

  const server = await serveStatic(STATIC_DIR, 0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const { browser, close } = await launchBrowser({ headless: true });
  const hits = [];
  let scanned = 0;
  let skipped = 0;

  try {
    const stories = await fetchStories(baseUrl, dirs);
    console.log(`[copy-probe] ${stories.length} stor${stories.length === 1 ? 'y' : 'ies'} to scan.`);

    await mapLimit(stories, CONCURRENCY, async story => {
      const items = await scanStory(browser, baseUrl, story.id);
      for (const item of items) {
        if (item.explicitLocale) {
          skipped++;
          continue;
        }
        scanned++;

        if (matchesRoEn(item.text)) {
          hits.push({ component: item.component, story: story.id, string: item.text });
          continue;
        }

        const hasWord = /[A-Za-z]{3,}/.test(item.text);
        if (!hasWord) continue;

        const exempt = item.hostOwnValue || matchesRu(item.text);
        if (!exempt) hits.push({ component: item.component, story: story.id, string: item.text });
      }
    });
  } finally {
    await close();
    server.close();
  }

  for (const hit of hits) {
    console.log(`${hit.component} · ${hit.story} · ${hit.string}`);
  }
  console.log(
    `[copy-probe] instances scanned: ${scanned}, skipped (explicit locale): ${skipped}, hits: ${hits.length}`,
  );

  process.exit(hits.length > 0 ? 1 : 0);
}

// Guarded so a test can `import` this module (for `resolveStaticPath`) without triggering the
// full probe run — importing a script must never have a side effect only running it should have.
if (isEntrypoint(import.meta.url)) {
  main().catch(err => {
    console.error('[copy-probe] failed:', err);
    process.exit(1);
  });
}
