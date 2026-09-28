#!/usr/bin/env node
/**
 * copy-probe.mjs — issue #163's acceptance bar, second row: the RUNTIME net over
 * `storybook-static/`. Serves the build locally, opens every story of every Phase 1-5
 * component (the folders that own a `*.messages.ts` dictionary — derived from the tree,
 * never a hand-kept list) with the Storybook `lang` global forced to `ru-RU`
 * (`.storybook/preview.js`'s `langDecorator`, set via the `globals=lang:ru-RU` query param
 * rather than the toolbar UI), and inspects component-owned text: shadow-root text nodes
 * and shadow-internal copy attributes, excluding assigned/slotted nodes (a light-DOM child of
 * any custom element — the walk never treats it as owned, matching the bar's wording; a
 * literal written there by an outer component's own JSX is already caught statically by
 * `mud/no-hardcoded-copy`, so this probe existing only for the non-JSX heuristic's gap does
 * not need to re-open it).
 *
 * A hit is a component-owned instance that either:
 *   (a) equals a `ro-RO`/`en-US` dictionary value (a `{placeholder}` matches anything), or
 *   (b) contains a Latin-letter word of 3+ letters, UNLESS the WHOLE instance equals one of
 *       that instance's own host's current attribute values (consumer input, read from the
 *       rendered DOM) or a `ru-RU` dictionary value.
 * An instance whose closest owning host carries an explicit `locale` attribute is skipped
 * (its own `locale` beating the page `lang` is the designed behaviour) and counted separately.
 *
 * Requires `yarn sp.build` to have produced `storybook-static/` first — this script only
 * serves what is already built, it never invokes Storybook itself.
 *
 * Usage: node scripts/eslint/copy-probe.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { launchBrowser, mapLimit } from '../audit/lib/browser-context.mjs';

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

function serveStatic(dir, port) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
      let filePath = join(dir, urlPath === '/' ? 'index.html' : urlPath);
      if (!filePath.startsWith(dir) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = join(dir, 'index.html');
      }
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
function wildcardRegex(str) {
  const escaped = str
    .split(PLACEHOLDER_RE)
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*?');
  return new RegExp(`^${escaped}$`, 's');
}

function buildMatcher(strings) {
  const regexes = strings.filter(Boolean).map(wildcardRegex);
  return text => regexes.some(re => re.test(text));
}

/**
 * Loads every `*.messages.ts` dictionary directly (Node 24 strips `.ts` type syntax at
 * import time — no build step needed; these files carry only type-only imports and object
 * literals, which is exactly what stripping supports). Returns the matcher for `ro-RO`/
 * `en-US` values, the matcher for `ru-RU` values, and the set of component folders found
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
      if (!['ro-RO', 'en-US', 'ru-RU'].every(k => keys.includes(k))) continue; // not a LocaleMessages export
      roEn.push(...stringsOf(exported['ro-RO']), ...stringsOf(exported['en-US']));
      ru.push(...stringsOf(exported['ru-RU']));
    }
  }
  return { matchesRoEn: buildMatcher(roEn), matchesRu: buildMatcher(ru), dirs };
}

// ── Story discovery ──

async function fetchStories(baseUrl, dirs) {
  const res = await fetch(`${baseUrl}/index.json`);
  if (!res.ok) throw new Error(`index.json → HTTP ${res.status}`);
  const data = await res.json();
  const entries = Object.values(data.entries ?? data.stories ?? {});
  return entries.filter(
    entry =>
      entry.type === 'story' && [...dirs].some(dir => (entry.importPath ?? '').includes(`src/components/${dir}/`)),
  );
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
      'lang:ru-RU',
    )}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(300); // Stencil hydration settling
    return await page.evaluate(collectInPage, COPY_ATTRS);
  } finally {
    await context.close();
  }
}

// ── Main ──

async function main() {
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

main().catch(err => {
  console.error('[copy-probe] failed:', err);
  process.exit(1);
});
