# Plan de implementare — `mud-icon` lazy-load via assets

## Context

După build, `dist/esm/mud-icon.entry.js` are **528 KB** — 96% din masă vine dintr-un singur fișier: [src/components/mud-icon/assets/icons.registry.ts](x:/WORK/corlab/age-design/src/components/mud-icon/assets/icons.registry.ts) (516 KB). Registry-ul este un obiect TypeScript care conține markup-ul SVG inline pentru toate 195 iconițe × până la 4 mărimi (12/16/20/24).

[mud-icon.providers.ts:2](x:/WORK/corlab/age-design/src/components/mud-icon/mud-icon.providers.ts#L2) face un **import static** al întregului registry, iar [mud-icon.tsx:91](x:/WORK/corlab/age-design/src/components/mud-icon/mud-icon.tsx#L91) face lookup prin `registry[name]` — indexare dinamică pe care bundlerele nu o pot tree-shake. Orice consumator al `<mud-icon>` primește toate 195 iconițele, indiferent dacă folosește doar una.

**Pragul de avertizare la audit** = 50 KB. mud-icon este la **10.5× pragul**.

**Outcome dorit:**
- `dist/esm/mud-icon.entry.js` să scadă la **~5–8 KB** (componenta + manifest)
- SVG-urile să fie servite ca **assets statici individuali** prin `getAssetPath()`, fetch-uite on-demand și cached în memorie după prima încărcare
- **API-ul public neschimbat** (`name`, `size`, `color`, `interactive`, `disabled`, `ariaLabel`) → cele 59 callsite-uri rămân intacte
- Sanitizarea și fallback-ul de mărime păstrate

---

## Strategie aleasă: Asset fetch on-demand cu `getAssetPath()`

Pattern-ul este deja folosit intern în [src/legacy/mud-illustration/mud-illustration.tsx:10,62](x:/WORK/corlab/age-design/src/legacy/mud-illustration/mud-illustration.tsx#L10) — există precedent verificat. `.storybook/main.mjs` are deja config pentru rezolvarea path-urilor (linia 25–34).

### Arhitectura propusă

```
┌─────────────────────────────────────────────────────────────┐
│ <mud-icon name="search" size="20">                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ componentWillLoad / @Watch(name|size)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ resolveIconUrl(name, size)                                  │
│  1. lookup în manifest (sync) → sizes disponibile           │
│  2. aplică fallback de size: prefer larger, then smaller    │
│  3. construiește URL via getAssetPath()                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ 
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ svgCache.get(url) ?? svgCache.set(url, fetch(url).then(...))│
│  - Cache modul-scope: Map<url, Promise<Element>>            │
│  - dedup paralel pentru aceeași iconiță folosită simultan   │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch().text() → sanitizeSvgToElement()
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ container.appendChild(svgElement.cloneNode(true))           │
└─────────────────────────────────────────────────────────────┘
```

### Cheile deciziei

1. **Manifestul rămâne importat static** ([icons.manifest.json](x:/WORK/corlab/age-design/src/components/mud-icon/assets/icons.manifest.json), 12 KB). Trebuie cunoscut sincron pentru:
   - validare runtime a numelui de iconiță
   - rezolvarea fallback-ului de mărime **înainte** de fetch (zero 404-uri)
   - storybook controls + tests
   
   12 KB în bundle este acceptabil (de la 528 KB → ~20 KB total component + manifest).

2. **Sanitizer-ul `sanitizeSvgMarkup`/`sanitizeSvgToElement` ([src/utils/svg-sanitizer.ts](x:/WORK/corlab/age-design/src/utils/svg-sanitizer.ts)) rămâne fără modificări** — SVG fetched este injectat tot via `innerHTML`/`appendChild`, deci protecția XSS este în continuare critică. Acoperă chiar și scenariul în care un atacator înlocuiește un fișier `.svg` de pe CDN.

3. **NU folosim `<img src>`** — pierde `fill: var(--icon-color)` din CSS (linia 31, [mud-icon.css](x:/WORK/corlab/age-design/src/components/mud-icon/mud-icon.css)), iar cele 8 token-uri de culoare din demo nu mai funcționează.

4. **Cache la nivel de modul** (nu per-instanță) — dacă 50 de butoane folosesc `name="check" size="16"`, se face un singur fetch. `Map<url, Promise<Element>>` cu `cloneNode(true)` la fiecare consumator.

5. **Build script simplificat** — [scripts/icons/build-registry.mjs](x:/WORK/corlab/age-design/scripts/icons/build-registry.mjs) emite acum manifestul și registry-ul. Devine: emite doar manifestul; SVG-urile rămân deja ca fișiere individuale în `assets/{12,16,20,24}/*.svg`, deci `icons.registry.ts` se șterge complet.

---

## Modificări file-by-file

### 1. `src/components/mud-icon/mud-icon.tsx` — restructurare async
- Adaugă `assetsDirs: ['assets']` la decoratorul `@Component`
- Importă `getAssetPath` din `@stencil/core`
- Înlocuiește `resolveIcon` sincron cu un flow async (pattern din `mud-illustration`):
  - `@State() private svgElement: Element | null = null`
  - `componentWillLoad()` async → `await this.loadSvg()`
  - `@Watch('name')` și `@Watch('size')` async → `await this.loadSvg()`
- `loadSvg()`:
  1. validează numele față de manifest → warn + return dacă nu există
  2. apelează `resolveIconAsset(name, size)` (vezi #3 mai jos) → primește `{ url, resolvedSize }`
  3. cache lookup → `fetch` dacă miss
  4. sanitize cu `sanitizeSvgToElement`
  5. setează `this.svgElement` (clonă)
- `componentDidRender` injectează `this.svgElement` clonat în `.svg-icon`
- Logica de cache-key (`this.svgCacheKey`) per-instanță rămâne pentru a evita re-injecții inutile la re-render

### 2. `src/components/mud-icon/mud-icon.providers.ts` — rescriere
Înlocuiește `resolveIcon` (sincron, citește din registry) cu:

```ts
// nou: pure sync — primește manifestul, returnează URL-ul + resolvedSize
export function resolveIconAsset(
  name: string,
  size: IconSize,
  manifest: IconManifest = defaultManifest,
): { url: string; resolvedSize: IconSize } | undefined;

// nou: shared module-level cache — Map<url, Promise<Element | null>>
export function fetchIconSvg(url: string): Promise<Element | null>;
```

- `resolveIconAsset` aplică EXACT aceeași logică de fallback (prefer larger, then smaller) dar peste `manifest[name].sizes` (sync), apoi compune `getAssetPath('./assets/{resolvedSize}/{name}.svg')`
- `fetchIconSvg`:
  - `if (cache.has(url)) return cache.get(url)!;`
  - `const p = fetch(url).then(r => r.ok ? r.text() : null).then(t => t ? sanitizeSvgToElement(t) : null).catch(() => null);`
  - `cache.set(url, p); return p;`
  - Cache-ul rămâne și pentru null (negative caching) — dar opcional cu TTL scurt, sau cu invalidare manuală în test

### 3. `src/components/mud-icon/mud-icon.types.ts` — adăugări
- Adaugă `IconManifest` type:
  ```ts
  export type IconManifestEntry = { sizes: readonly IconSize[] };
  export type IconManifest = Record<string, IconManifestEntry>;
  ```

### 4. `src/components/mud-icon/assets/icons.registry.ts` — **ștergere**
Acest fișier (516 KB) nu mai are consumatori după modificările de mai sus. Tot conținutul a fost mutat în SVG-uri individuale (deja existente în `assets/{12,16,20,24}/*.svg`).

### 5. `scripts/icons/build-registry.mjs` — simplificare
- Șterge generarea `icons.registry.ts` (`tsHeader`, `tsFooter`, `registryEntries`, `fs.writeFile(REGISTRY_TS, ...)`)
- Păstrează doar generarea `icons.manifest.json`
- Redenumire opțională: `build-manifest.mjs` (păstrează vechiul nume cu re-export pentru compatibilitate cu eventuale npm scripts)
- Verifică [package.json](x:/WORK/corlab/age-design/package.json) pentru orice script `icons:build` și actualizează numele dacă e cazul

### 6. `stencil.config.ts` — nicio modificare
`assetsDirs` la nivel de `@Component` este suficient. Stencil 4.x copiază automat `src/components/mud-icon/assets/` → `dist/design-system/assets/{12,16,20,24}/`. Nu necesită config global suplimentar.

### 7. `.storybook/main.mjs` — activare staticDirs
La linia 30–36, există blocul `staticDirs` cu un comentariu explicit despre mud-illustration dezactivat în migrare. Adaugă mapping pentru mud-icon:
```js
staticDirs: [
  { from: '../tokens/generated', to: 'tokens/generated' },
  { from: '../src/components/mud-icon/assets', to: 'assets/assets' }, // nou
  { from: '../assets/font', to: 'assets/font' },
],
```
Asta face ca în Storybook prod build, `getAssetPath('./assets/16/check.svg')` → `/assets/assets/16/check.svg`.

În dev mode, Vite are deja `fs.allow: ['..']` (linia 72), deci servește direct din filesystem prin `/dist/design-system/assets/...` — Stencil hot-reload va copia SVG-urile la fiecare build incremental.

### 8. `src/components/mud-icon/test/mud-icon.spec.tsx` — adaptare la fetch
- 3 modificări:
  1. **Mock `fetch` global** la nivel de `beforeEach`:
     ```ts
     const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
       const match = String(url).match(/\/(\d+)\/([^/]+)\.svg$/);
       if (!match) return new Response('', { status: 404 });
       return new Response(`<svg data-name="${match[2]}" data-size="${match[1]}"></svg>`);
     });
     ```
  2. **Așteaptă `waitForChanges`** după render (componentWillLoad e async)
  3. **Înlocuiește teste `resolveIcon`** cu teste `resolveIconAsset` care nu mai au nevoie de fetch (sunt pure URL builders)
- Adaugă 2 teste noi:
  - cache hit: fetch chemat doar o dată pentru 2 instanțe cu același name+size
  - graceful degrade: fetch returnează 404 → `console.warn` + `.svg-icon` gol

### 9. `src/components/mud-icon/mud-icon.stories.ts` — nicio modificare funcțională
Stories folosesc deja manifestul direct. Singura precauție: în story `Gallery` (toate 195 × 4 mărimi), prima încărcare va declanșa ~500 fetch-uri paralele. HTTP/2 multiplexing rezolvă asta, dar putem adăuga un comentariu/note în doc.

### 10. `web-components/demo/index.html` — nicio modificare
API-ul declarativ rămâne identic (`<mud-icon name="search" size="12">`).

### 11. `src/index.ts` — pregătire pentru export public
Acest plan **nu adaugă** `mud-icon` în barrel-ul public (rămâne import direct prin path-ul componentului, conform [src/index.ts:5](x:/WORK/corlab/age-design/src/index.ts#L5) — doar `mud-spinner` este exportat momentan). Bundle-ul redus permite însă exportul în viitor fără penalizare.

---

## Faze de execuție

| Fază | Pași | Verificare |
|------|------|------------|
| **F1 — Provider** | Rescrie `mud-icon.providers.ts` cu `resolveIconAsset` + `fetchIconSvg` + cache. Adaugă tipul `IconManifest`. | Unit tests pure pe `resolveIconAsset` (fallback up/down, unknown name → undefined) |
| **F2 — Component** | Adaugă `assetsDirs`, import `getAssetPath`, restructurează async. Adaptează `componentDidRender` să injecteze din state. | Test render local cu fetch mockat; bifează că `--icon-color` se setează corect |
| **F3 — Storybook config** | Activează `staticDirs` pentru `src/components/mud-icon/assets` în `.storybook/main.mjs`. | `yarn storybook` → toate variantele se randează vizual |
| **F4 — Cleanup** | Șterge `icons.registry.ts`. Actualizează `build-registry.mjs` să emită doar manifestul. Verifică scripturi npm. | `yarn build:icons` rulează fără erori; doar `icons.manifest.json` se rescrie |
| **F5 — Tests** | Actualizează `mud-icon.spec.tsx` cu mock fetch + teste de cache + 404 handling. | `yarn test mud-icon` → toate testele trec |
| **F6 — Verificare bundle** | `yarn build` (Stencil prod). Măsoară `dist/esm/mud-icon.entry.js`. | Așteptat: **< 20 KB** (vs 528 KB initial) |

---

## Riscuri și mitigări

| Risc | Mitigare |
|------|----------|
| **FOUC** (Flash of unstyled content): la prima încărcare a unei iconițe, există un interval în care `<mud-icon>` este gol. | Acceptabil pentru icon-uri (sunt mici). Putem adăuga un `min-width/min-height` din CSS (deja există via `--icon-size`) → previne layout shift. |
| **404 silent failures**: dacă un SVG lipsește (typo, build failure), componenta nu randează nimic. | Manifestul este single source of truth — validăm `name` față de manifest **înainte** de fetch. Logăm warn pentru name necunoscut SAU pentru fetch eșuat. |
| **CORS în SSR / cross-origin**: dacă DS este servit de pe un CDN diferit, fetch poate fi blocat. | `getAssetPath` returnează un URL relativ la rădăcina assets a aplicației — CORS nu se aplică pentru same-origin. Pentru CDN cross-origin, consumer trebuie să seteze `Access-Control-Allow-Origin`. Documentat în README. |
| **Storybook fetch greșit în dev**: path-ul depinde de modul (dev vs prod build) — confirmat în [main.mjs:26-29](x:/WORK/corlab/age-design/.storybook/main.mjs#L26). | Folosim `getAssetPath` care abstractizează mod-ul (Stencil rezolvă automat). Testăm AMBELE moduri în F3. |
| **Tests vitest fără DOM fetch global**: poate să nu existe `fetch` implicit în mediul de test. | Mock explicit `globalThis.fetch` în `beforeEach`. Vitest cu mediul `jsdom` are `fetch` (Node 18+), dar mock pentru determinism. |
| **Negative cache permanent**: dacă manifestul e regenerat și un SVG anterior 404-uit există acum, cache returnează null pentru totdeauna. | Cache-ul este per-module-load → reset la fiecare reload de pagină. Pentru hot-reload Storybook, suficient. În prod nu se schimbă URL-urile (manifestul e built-time). |
| **Demo Gallery randează ~500 fetch-uri simultan**: în story `Gallery` (195 × 4). | HTTP/2 multiplexing + `Cache-Control` server-side rezolvă în practică. Nu este blocker pentru bundle size — este o problemă separată de UX storybook. Comentariu în story care explică. |

---

## Verificare end-to-end

1. **Build size (criteriul principal):**
   ```pwsh
   yarn build
   Get-ChildItem dist/esm/mud-icon.entry.js | Select-Object Name, @{N='KB';E={[math]::Round($_.Length/1KB,1)}}
   ```
   - Înainte: ~528 KB
   - Țintă: **< 20 KB** (componentă + manifest)

2. **Asset deployment:**
   ```pwsh
   Get-ChildItem -Recurse dist/design-system/mud-icon/assets/16/*.svg | Measure-Object | Select-Object Count
   ```
   - Trebuie să existe SVG-urile individuale (~355 fișiere total în {12,16,20,24}/)

3. **Unit tests:**
   ```pwsh
   yarn test mud-icon
   ```
   - Așteptat: toate testele trec, inclusiv cache hit + 404 handling

4. **Storybook vizual (dev mode):**
   ```pwsh
   yarn storybook
   ```
   - Navighează la `Components/Icon/Gallery` → toate 195 iconițele se randează
   - Network tab: confirmă fetch individual per iconiță (status 200, `image/svg+xml`)
   - Sample story `Default` cu controale: schimbă `color` → SVG-ul își schimbă culoarea (`--icon-color` aplicat)
   - Sample story cu `interactive disabled` → focus ring, hover treatment correct

5. **Storybook prod build:**
   ```pwsh
   yarn build-storybook
   npx http-server storybook-static -p 6007
   ```
   - Verifică în browser că `staticDirs` mapping funcționează: `/assets/assets/16/check.svg` returnează SVG-ul

6. **Demo HTML:**
   - `web-components/demo/index.html` se randează corect cu toate cele 47 callsite-uri (folosește dist-ul construit)

7. **Audit final:**
   ```pwsh
   yarn lint && yarn test
   ```
   - Plus invocare `audit-component` skill (dacă nu e prima migrare graduală) sau pre-pr-check.

---

## Fișiere modificate (sumar)

| Fișier | Tip modificare |
|--------|---------------|
| [src/components/mud-icon/mud-icon.tsx](x:/WORK/corlab/age-design/src/components/mud-icon/mud-icon.tsx) | Rescriere async (componentWillLoad, @Watch, @State) |
| [src/components/mud-icon/mud-icon.providers.ts](x:/WORK/corlab/age-design/src/components/mud-icon/mud-icon.providers.ts) | Rescriere: `resolveIconAsset` + `fetchIconSvg` + cache |
| [src/components/mud-icon/mud-icon.types.ts](x:/WORK/corlab/age-design/src/components/mud-icon/mud-icon.types.ts) | Adaugă `IconManifest`, `IconManifestEntry` |
| [src/components/mud-icon/assets/icons.registry.ts](x:/WORK/corlab/age-design/src/components/mud-icon/assets/icons.registry.ts) | **Ștergere** |
| [scripts/icons/build-registry.mjs](x:/WORK/corlab/age-design/scripts/icons/build-registry.mjs) | Simplificare: doar manifest |
| [.storybook/main.mjs](x:/WORK/corlab/age-design/.storybook/main.mjs) | Activează `staticDirs` pentru mud-icon |
| [src/components/mud-icon/test/mud-icon.spec.tsx](x:/WORK/corlab/age-design/src/components/mud-icon/test/mud-icon.spec.tsx) | Mock fetch + 2 teste noi (cache, 404) |

**Nemodificate** (validare):
- `mud-icon.css` — stilurile funcționează identic cu SVG injectat în Shadow DOM
- `mud-icon.stories.ts` — folosește deja manifestul
- `src/utils/svg-sanitizer.ts` — sanitizer-ul rămâne relevant pentru fetch + innerHTML
- `src/index.ts`, `src/components/index.ts` — mud-icon nu este încă exportat public
- `stencil.config.ts` — `assetsDirs` se setează la nivel de `@Component`, nu global
- Toate cele 47 callsite-uri din `web-components/demo/index.html` + 57 fișiere legacy

---

## Extensii viitoare (opțional, nu în scope-ul acestui plan)

- **API `preload(names: string[])`** — expune o metodă publică pentru preîncărcarea iconițelor critice (above-the-fold).
- **Sprite mode opțional** — pentru aplicații care folosesc >50 iconițe pe pagină, poate fi util un sprite `icons-{size}.svg` generat separat și folosit via `<use href>`. Posibilă a doua fază.
- **Service Worker integration** — recomandare în README pentru caching mai agresiv la nivel de app.
