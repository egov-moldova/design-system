# Rescrierea sync-tokens-from-tokenhaus.mjs pentru noul export Tokenhaus

## Context

Exportul `tokens-tokenhaus.json` actual folosește o schemă fundamental diferită de cea pe care o targetează scriptul `scripts/sync-tokens-from-tokenhaus.mjs`:

- **Schema veche (pe care o știe scriptul)**: `Core colors palette`, `Color tokens`, `Core numbers`, `Typography`, `Screen` — nu mai există în export.
- **Schema nouă (de azi)**: `1. Semantic Colors`, `2. Primitive Colors: Do not use directly`, `3. Sizes`, `4. Typography Primitives` + `#Responsive typography test`.

Trei schimbări structurale critice:
1. **Mode-keyed values pe semantic colors**: fiecare leaf are `{ "Light Mode": "{...primary.gray.100}", "Dark Mode": "{...gray.700}" }` (înainte erau strings simpli).
2. **Naming convention**: Figma folosește `category + type + role + variant` → `--color-background-brand-default` (pe role/property), pe când repo-ul actual folosește organizare pe rol `color.neutral.text.default` → `--color-neutral-text-default`.
3. **Scale numeric Figma**: `spacing-2/4/...120`, `radius-0/6/...full`, `fs-10/12/...64` — fără mapping spre semantic `xs/sm/md/lg`.

Trebuie să rescriem complet parser-ul. Decizii confirmate cu utilizatorul:
- **Clean break**: scriptul scrie direct în `tokens/core/` (componentele se sparg, se migrează separat după).
- **Numeric Figma naming**: `--spacing-12`, `--radius-8`, `--border-width-1`, `--font-size-12`.
- **Light + Dark în fișiere separate**: `tokens/core/color.tokens.json` (Light) + `tokens/core.dark/color.tokens.json` (Dark) — compatibil cu pipeline-ul Style Dictionary existent.
- **Effects manual**: scriptul NU generează `effects.tokens.json`; userul îl autorizează manual cu `drop-shadow.100..500` pentru a produce `--drop-shadow-100..500` în CSS (conform Figma Foundations elevation 1-5).

---

## Mapare Figma section → output file

| Figma section (Tokenhaus) | Output file | Top-level JSON wrapper | Mod |
|---|---|---|---|
| `2. Primitive Colors: Do not use directly` | `tokens/core/palette.tokens.json` | `palette` | single (no modes) |
| `1. Semantic Colors` (Light Mode) | `tokens/core/color.tokens.json` | `color` | Light Mode |
| `1. Semantic Colors` (Dark Mode) | `tokens/core.dark/color.tokens.json` | `color` | Dark Mode |
| `4. Typography Primitives` | `tokens/core/font.tokens.json` | `fontFamily` + `fontSize` + `fontWeight` + `lineHeight` (+ `letterSpacing` opțional manual) | single |
| `3. Sizes` (spacings + border-radius + border-width) | `tokens/core/sizes.tokens.json` | `spacing` + `borderRadius` + `borderWidth` | single |
| — (nu există) | `tokens/core/effects.tokens.json` | `dropShadow` | **manual, nu generat de script** |
| `#Responsive typography test` | — | — | **SKIP** (denumire conține "test") |
| `3. Sizes.mobile/desktop` scalars | — | — | **SKIP** (Figma artifact, valori `3` și `""`) |
| `1. Semantic Colors.hack.do-not-implement` | — | — | **SKIP** (placeholder Figma) |

---

## Shape detaliat al fiecărui output

### 1. `tokens/core/palette.tokens.json`

```json
{
  "palette": {
    "blue-sky": { "100": { "value": "#e8f0fb", "type": "color" }, "150": {...}, ..., "900": {...} },
    "lavender": { "100": {...}, ..., "900": {...} },
    "purple": {...},
    "magenta": {...},
    "forest-green": { "100": {...}, "150": {...}, ..., "900": {...} },
    "red": { "50": {...}, "100": {...}, ..., "900": {...} },
    "apricot": { "50": {...}, ..., "900": {...} },
    "green": { "50": {...}, ..., "900": {...} },
    "gray": { "50": {...}, "100": {...}, "200": {...}, "250": {...}, "300": {...}, "350": {...}, ..., "900": {...} },
    "black": { "1000": { "value": "#000000", "type": "color" } },
    "white": { "1000": { "value": "#ffffff", "type": "color" } },
    "alpha": {
      "black":  { "100-alpha": {...}, "200-alpha": {...}, ..., "500-alpha": {...} },
      "white":  { "100-alpha": {...}, ..., "500-alpha": {...} },
      "gray":   { "alpha-100": {...}, ..., "alpha-500": {...} }
    }
  }
}
```

CSS produs de Style Dictionary: `--palette-blue-sky-100`, `--palette-gray-50`, `--palette-alpha-black-100-alpha`, `--palette-alpha-gray-alpha-100`, `--palette-black-1000`, `--palette-white-1000`.

### 2. `tokens/core/color.tokens.json` (Light) și `tokens/core.dark/color.tokens.json` (Dark)

Same JSON shape, valori diferite (referințe spre palette ramuri diferite).

```json
{
  "color": {
    "background": {
      "base":          { "default": { "value": "{palette.gray.50}", "type": "color" }, "default-active": {...}, "default-hover": {...}, "secondary": {...}, "secondary-active": {...}, "secondary-hover": {...}, "tertiary": {...}, "tertiary-active": {...}, "tertiary-hover": {...} },
      "base-inverse":  { "default": {...}, "default-active": {...}, "default-hover": {...} },
      "brand":         { "default": {...}, "default-active": {...}, "default-hover": {...}, "secondary": {...}, "secondary-active": {...}, "secondary-hover": {...}, "tertiary": {...} },
      "positive":      { "default": {...}, "default-active": {...}, "default-hover": {...}, "secondary": {...}, "secondary-active": {...} },
      "warning":       { "default": {...}, "default-active": {...}, "default-hover": {...}, "secondary": {...}, "secondary-active": {...}, "accent": {...} },
      "danger":        { "default": {...}, "default-active": {...}, "default-hover": {...}, "secondary": {...}, "secondary-active": {...}, "secondary-hover": {...} },
      "disabled":      { "default": {...}, "secondary": {...} },
      "alpha":         { "overlay-dark": {...}, "overlay-light": {...}, "large-surface": {...} }
    },
    "border": {
      "base":     { "default": {...}, "secondary": {...}, "tertiary": {...}, "strong": {...}, "subtle": {...} },
      "brand":    { "default": {...} },
      "disabled": { "default": {...} },
      "positive": { "default": {...} },
      "warning":  { "default": {...} },
      "danger":   { "default": {...} }
    },
    "text": {
      "base":         { "default": {...}, "secondary": {...}, "tertiary": {...}, "default-on-color": {...}, "secondary-on-color": {...} },
      "base-inverse": { "default": {...}, "on-color": {...} },
      "brand":        { "default": {...}, "default-hover": {...}, "on-secondary": {...}, "visited": {...} },
      "disabled":     { "default": {...}, "on-disabled": {...} },
      "positive":     { "default": {...}, "on-secondary": {...} },
      "warning":      { "default": {...}, "on-secondary": {...} },
      "danger":       { "default": {...}, "on-secondary": {...} }
    },
    "icon": {
      "base":         { "default": {...}, "secondary": {...}, "tertiary": {...}, "default-on-color": {...}, "secondary-on-color": {...} },
      "base-inverse": { "default": {...}, "on-color": {...} },
      "brand":        { "default": {...}, "on-secondary": {...}, "visited": {...} },
      "disabled":     { "default": {...}, "on-disabled": {...} },
      "positive":     { "default": {...}, "on-secondary": {...} },
      "warning":      { "default": {...}, "on-secondary": {...} },
      "danger":       { "default": {...}, "on-secondary": {...} }
    }
  }
}
```

Fiecare leaf:
```json
{ "value": "{palette.<color>.<step>}", "type": "color" }
```

CSS produs: `--color-background-brand-default`, `--color-background-brand-default-hover`, `--color-text-danger-on-secondary`, `--color-icon-base-inverse-on-color`, etc.

### 3. `tokens/core/font.tokens.json`

```json
{
  "fontFamily": {
    "primary": { "value": "Onest", "type": "fontFamily" }
  },
  "fontSize": {
    "10": { "value": 10, "type": "dimension", "attributes": { "category": "size" } },
    "12": {...}, "14": {...}, "16": {...}, "18": {...}, "20": {...}, "22": {...},
    "24": {...}, "28": {...}, "32": {...}, "40": {...}, "48": {...}, "56": {...}, "64": {...}
  },
  "fontWeight": {
    "regular":  { "value": 400, "type": "fontWeight" },
    "medium":   { "value": 500, "type": "fontWeight" },
    "semibold": { "value": 600, "type": "fontWeight" },
    "bold":     { "value": 700, "type": "fontWeight" }
  },
  "lineHeight": {
    "12": { "value": 12, "type": "dimension", "attributes": { "category": "size" } },
    "16": {...}, "20": {...}, "24": {...}, "26": {...}, "28": {...},
    "30": {...}, "32": {...}, "36": {...}, "40": {...}, "48": {...}, "56": {...}, "64": {...}
  },
  "letterSpacing": {
    "_comment": "Nu apare în export Tokenhaus. Authored manual sau lăsat gol până apare în Figma."
  }
}
```

Notă: stripăm prefixele Figma `fs-`/`lh-`/`fw-`/`primary-font` la cheile finale (`fs-12` → `12`, `primary-font` → `primary`).

CSS produs: `--font-family-primary`, `--font-size-12`, `--font-weight-regular`, `--line-height-16`.

### 4. `tokens/core/sizes.tokens.json`

```json
{
  "spacing": {
    "0":   { "value": 0, "type": "dimension", "attributes": { "category": "size" } },
    "2":   { "value": 2, "type": "dimension", "attributes": { "category": "size" } },
    "4": {...}, "6": {...}, "8": {...}, "12": {...}, "16": {...}, "20": {...},
    "24": {...}, "32": {...}, "40": {...}, "48": {...}, "56": {...}, "64": {...},
    "80": {...}, "96": {...}, "120": {...}
  },
  "borderRadius": {
    "0":   { "value": 0,   "type": "dimension", "attributes": { "category": "size" } },
    "4":   {...}, "6": {...}, "8": {...}, "12": {...}, "16": {...}, "24": {...}, "32": {...},
    "full": { "value": "9999px", "type": "dimension" }
  },
  "borderWidth": {
    "0-5": { "value": 0.5, "type": "dimension" },
    "1":   { "value": 1,   "type": "dimension" },
    "1-5": { "value": 1.5, "type": "dimension" },
    "2":   { "value": 2,   "type": "dimension" },
    "3":   { "value": 3,   "type": "dimension" }
  }
}
```

Notă: Cheia `border-1,5` (cu virgulă) din Figma se sanitizează la `1-5` (CSS-safe). CSS produs: `--spacing-12`, `--border-radius-8`, `--border-width-1-5`.

### 5. `tokens/core/effects.tokens.json` (MANUAL, NU este generat de script)

```json
{
  "dropShadow": {
    "100": { "value": "0px 1px 2px 0px rgba(0, 0, 0, 0.05)", "type": "string" },
    "200": { "value": "0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)", "type": "string" },
    "300": { "value": "0px 4px 8px -2px rgba(0, 0, 0, 0.10), 0px 2px 4px -2px rgba(0, 0, 0, 0.06)", "type": "string" },
    "400": { "value": "0px 12px 16px -4px rgba(0, 0, 0, 0.08), 0px 4px 6px -2px rgba(0, 0, 0, 0.03)", "type": "string" },
    "500": { "value": "0px 20px 24px -4px rgba(0, 0, 0, 0.08), 0px 8px 8px -4px rgba(0, 0, 0, 0.03)", "type": "string" }
  }
}
```

Valorile concrete trebuie preluate din [Figma Foundations elevation](https://www.figma.com/design/wkHMxgDWxZKaXQ7zNxhSxN/Foundations?node-id=225-285) (5 nivele). Scriptul DOAR documentează că nu generează acest fișier; nu îl atinge.

CSS produs: `--drop-shadow-100`, `--drop-shadow-200`, ..., `--drop-shadow-500`.

---

## Reference rewriting (Figma path → output path)

Pe lângă schema diferită, scriptul trebuie să rescrie referințele `$value` din semantic colors:

| Pattern Figma `{...}` | Rewrite la |
|---|---|
| `{2. Primitive Colors: Do not use directly.<color>.<step>}` | `{palette.<color>.<step>}` |
| `{2. Primitive Colors: Do not use directly.alpha.<channel>.<step>}` | `{palette.alpha.<channel>.<step>}` |
| `{4. Typography Primitives.font-size.fs-<N>}` | `{fontSize.<N>}` |
| `{4. Typography Primitives.line-height.lh-<N>}` | `{lineHeight.<N>}` |
| `{4. Typography Primitives.font-weight.fw-<name>}` | `{fontWeight.<name>}` |
| `{4. Typography Primitives.font-family.primary-font}` | `{fontFamily.primary}` |
| `{3. Sizes.spacings.spacing-<N>}` | `{spacing.<N>}` |
| `{3. Sizes.border-radius.radius-<N>}` | `{borderRadius.<N>}` |
| `{3. Sizes.border-width.border-<N>}` | `{borderWidth.<N>}` (cu sanitizare `,` → `-`) |

Orice path nepotrivit → `recordUnresolvedReference(ctx, path)` și se păstrează raw (debug).

---

## Arhitectura noului script

### Funcții păstrate din scriptul actual (boilerplate care funcționează)

| Funcție | Status | Notă |
|---|---|---|
| `CliError`, `EXIT_CODES`, `createProgram`, `resolveProjectPath`, `parseCliOptions` | păstrate | Doar **drop `--brand`** (primitivele nu au moduri în noul export) |
| `formatPathForLog`, `getLineColumnFromOffset`, `formatJsonParseError`, `readJsonWithContext` | păstrate identic | |
| `assertReadableFile`, `assertDirectoryTarget`, `assertFileTarget` | păstrate identic | |
| `prepareTokenFile`, `writePreparedFile`, `serializeTokenFile`, `findExistingAncestor` | păstrate identic | |
| `createRunContext`, `recordWarning`, `recordUnresolvedReference`, `recordFallback`, `getStrictViolationCount` | păstrate identic | |
| `buildReport`, `writeReport`, `printSummary`, `printNextSteps`, `printFatalError`, `main`, `isEntrypoint` | păstrate (cu rewires) | `printNextSteps` schimbă mesajele pentru noile fișiere |
| `runExtraction` | păstrată identic | |
| `isLeaf`, `sanitizeKey`, `token`, `reorder`, `stripLeadingZero` | păstrate ca utility helpers | |
| `getModeValue` | păstrată | Folosită cu modurile `'Light Mode'` / `'Dark Mode'` |

### Funcții ELIMINATE (parserii vechi)

- `extractPalette` (vechiul shape `Core colors palette/UI/UX/Transparent`)
- `extractColor` (vechiul shape `Color tokens` cu `system.{category}` flatten)
- `extractSpace`, `extractSpacing` (vechiul `Core numbers.space` + `Screen.Spacing`)
- `extractScreen` (vechiul `Screen.Display`)
- `extractBorder` (vechiul `Screen.Border.Width`)
- `extractRadius`, `buildRadiusRamp` (vechiul `Core numbers.radius`)
- `extractFont`, `extractLineHeight` (vechiul `Typography.Font`)
- `buildSpaceScale`, `rewritePalettePath`, `rewriteTransparentRef`, `rewriteColorTokensPath` (logici de rewriting vechi)
- Toate constantele de naming map: `SPACE_KEY_MAP`, `SPACE_ORDER`, `RADIUS_KEY_MAP`, `RADIUS_ORDER`, `FONTSIZE_KEY_MAP`, `LINEHEIGHT_KEY_MAP`, `FONTWEIGHT_MAP`, `FONT_FAMILY_STACK`
- `COLOR_PRUNE_PATHS`, `COLOR_PRUNE_EXTRA`, `pruneColorTokens` (mecanism de prune pentru un shape vechi)
- `hex8ToRgba` (nu mai există hex8 cu alpha în primitive — primitivele alpha au valori distincte)
- `extractPct` (parser vechi pentru cheile cu `%`)
- `normalizeRampKey` (logica veche cu `0` leading)
- `validateOutputSafety` — **eliminată** (userul a optat pentru clean break direct la `tokens/core`)

### Funcții NOI (parserii pentru noua schemă)

```text
extractPaletteV2(data, ctx)
    Iterează data['2. Primitive Colors: Do not use directly'].
    Pentru fiecare ramură color: copiază leaves cu key normalizat ($value e hex simplu, single mode).
    Pentru alpha: păstrează nested 2 niveluri (black/white/gray ramuri).
    Output: { palette: { ... } }

extractSemanticColorsV2(data, modeName, ctx)
    modeName = 'Light Mode' | 'Dark Mode'
    Iterează data['1. Semantic Colors'].
    Skip cheia 'hack'.
    Pentru fiecare leaf: getModeValue(leaf.$value, modeName) → string reference, apoi rewriteRef pe el.
    Păstrează nested structure exactă (background.brand.default-active rămâne așa).
    Output: { color: { background: {...}, border: {...}, text: {...}, icon: {...} } }

extractTypographyV2(data, ctx)
    Iterează data['4. Typography Primitives'].
    Strip prefix Figma: 'fs-12' → '12', 'lh-16' → '16', 'fw-regular' → 'regular', 'primary-font' → 'primary'.
    Pentru fiecare sub-section (font-size/line-height/font-weight/font-family): emite sub camelCase
    (fontSize/lineHeight/fontWeight/fontFamily).
    Adaugă letterSpacing: {} (placeholder; documentat ca neimplementat din Figma).
    Output: { fontFamily: {...}, fontSize: {...}, fontWeight: {...}, lineHeight: {...}, letterSpacing: {} }

extractSizesV2(data, ctx)
    Iterează data['3. Sizes'].
    Skip 'mobile' și 'desktop' scalars (Figma artifacts).
    spacings → spacing: strip prefix 'spacing-N' → 'N', păstrează 0.
    border-radius → borderRadius: strip prefix 'radius-N' → 'N'; 'radius-full' → 'full' cu value '9999px'.
    border-width → borderWidth: strip prefix 'border-N' → 'N'; sanitize ',' → '-' (border-1,5 → 1-5).
    Output: { spacing: {...}, borderRadius: {...}, borderWidth: {...} }

rewriteRef(value, ctx)
    Înlocuiește toate ocurențele {<path>} folosind rewritePathV2.

rewritePathV2(tokenPath, ctx)
    Tabel de prefixe (vezi secțiunea "Reference rewriting" de mai sus).
    Fallback: recordUnresolvedReference + păstrează path raw.
```

### Validare structură input

```javascript
const REQUIRED_TOP_LEVEL_SECTIONS = [
  '1. Semantic Colors',
  '2. Primitive Colors: Do not use directly',
  '3. Sizes',
  '4. Typography Primitives',
];

const OPTIONAL_EXPECTED_PATHS = [
  '1. Semantic Colors.background',
  '1. Semantic Colors.border',
  '1. Semantic Colors.text',
  '1. Semantic Colors.icon',
  '2. Primitive Colors: Do not use directly.alpha',
];
```

### CLI changes

- **Drop `--brand`** (irelevant — primitivele nu au moduri în noul export).
- **Default `--output`** rămâne `tokens/figma-export` pentru siguranță (dry-run friendly), DAR documentația scriptului explică că `--output tokens/` produce clean break direct.
- Adaugă warning explicit când output-ul țintește `tokens/core/` (cere `--confirm-overwrite` flag, opțional — discutăm dacă vrei această barieră suplimentară).
- Restul flag-urilor (`--input`, `--dry-run`, `--report`, `--strict`) rămân identice.

### Wiring în `main()`

```javascript
runExtraction(ctx, 'palette.tokens.json', outCore, 'palette.tokens.json',
  () => extractPaletteV2(data, ctx));

runExtraction(ctx, 'color.tokens.json (Light)', outCore, 'color.tokens.json',
  () => extractSemanticColorsV2(data, 'Light Mode', ctx));

runExtraction(ctx, 'core.dark/color.tokens.json', outDark, 'color.tokens.json',
  () => extractSemanticColorsV2(data, 'Dark Mode', ctx));

runExtraction(ctx, 'font.tokens.json', outCore, 'font.tokens.json',
  () => extractTypographyV2(data, ctx));

runExtraction(ctx, 'sizes.tokens.json', outCore, 'sizes.tokens.json',
  () => extractSizesV2(data, ctx));

ctx.notGenerated = [
  { file: 'effects.tokens.json', reason: 'nu în Tokenhaus export — authored manual (drop-shadow.100..500)' },
  { file: 'screen.tokens.json', reason: 'nu în Tokenhaus export (vechi: Screen.Display)' },
  { file: 'zIndex.tokens.json', reason: 'nu în Tokenhaus export' },
  { file: 'size.tokens.json', reason: 'nu în Tokenhaus export — component sizing manual' },
  { file: 'linearGradient.tokens.json', reason: 'nu în Tokenhaus export' },
  { file: 'letterSpacing (în font.tokens.json)', reason: 'nu în Tokenhaus export — emitem `letterSpacing: {}` ca placeholder' },
];
```

---

## Files affected în tokens/core/ după run

### Generate de script (clean break, overwrite tokens/core)

- `tokens/core/palette.tokens.json` — rewrite complet (structură nouă cu ramuri color flat: blue-sky, lavender, etc.)
- `tokens/core/color.tokens.json` — rewrite complet (structură background/border/text/icon)
- `tokens/core/font.tokens.json` — rewrite complet (consolidat: fontFamily + fontSize + fontWeight + lineHeight + letterSpacing placeholder)
- `tokens/core/sizes.tokens.json` — fișier NOU (consolidat: spacing + borderRadius + borderWidth)
- `tokens/core.dark/color.tokens.json` — rewrite complet

### De șters MANUAL după prima rulare reușită

(Style Dictionary picks up via `**/*.tokens.json` glob; rămase ar genera duplicate sau token-uri orfane)

- `tokens/core/space.tokens.json` (înlocuit de `sizes.tokens.json`)
- `tokens/core/spacing.tokens.json` (înlocuit de `sizes.tokens.json`)
- `tokens/core/radius.tokens.json` (înlocuit de `sizes.tokens.json.borderRadius`)
- `tokens/core/border.tokens.json` (înlocuit de `sizes.tokens.json.borderWidth`)
- `tokens/core/lineHeight.tokens.json` (consolidat în `font.tokens.json.lineHeight`)
- `tokens/core/letterSpacing.tokens.json` (consolidat în `font.tokens.json.letterSpacing` — sau lăsat dacă vrei să nu pierzi valoarea curentă `1.5%`)
- `tokens/core/screen.tokens.json` (nu mai există în Figma — decizie separată: păstrăm hardcoded sau eliminăm)
- `tokens/core/shadow.tokens.json` (înlocuit de `effects.tokens.json` manual)

### De CREAT manual

- `tokens/core/effects.tokens.json` — cu `dropShadow.100..500` din Figma elevation 1-5 (vezi [link Figma](https://www.figma.com/design/wkHMxgDWxZKaXQ7zNxhSxN/Foundations?node-id=225-285))

### Neatinse de script (out of scope)

- `tokens/core/style-dictionary.config.json` / `style-dictionary.prod.config.json` — configurația de build rămâne identică (sursa rămâne `tokens/core/**/*.tokens.json`, output rămâne `dist/design-system/tokens/core.tokens.css`)
- `tokens/core/components/*` — token-urile per component referă numele vechi (`{color.neutral.text.default}`, `{space.md}`, `{radius.lg}`); **toate referințele se vor sparge după build**. Migrare separată după ce planul curent este executat.
- `tokens/age/` — dacă există, neatins.

---

## Impactul migrării (downstream breakage așteptat)

Variabile CSS care DISPAR / se REDENUMESC. Va trebui search&replace în `src/components/**/*.{scss,css,tsx}`:

| Vechi (înainte) | Nou (după) | Mapping notă |
|---|---|---|
| `--color-neutral-text-default` | `--color-text-base-default` | role „neutral" → category „text", scale „default" → variant „base.default" |
| `--color-neutral-text-weak` | `--color-text-base-secondary` (sau `tertiary`) | mapping de granularitate diferită |
| `--color-neutral-background-default` | `--color-background-base-default` | |
| `--color-primary-background-default` | `--color-background-brand-default` | „primary" → „brand" |
| `--color-primary-background-hover` | `--color-background-brand-default-hover` | |
| `--color-system-positive-*` | `--color-{background|text|icon|border}-positive-*` | flatten în categoriile noi |
| `--space-md` (12px) | `--spacing-12` | semantic → numeric |
| `--radius-lg` (12px) | `--border-radius-12` | semantic → numeric |
| `--font-size-lg` (18px) | `--font-size-18` | semantic → numeric |
| `--line-height-lg` | `--line-height-{N}` | semantic → numeric |
| `--shadow-md` | `--drop-shadow-200` | shadow rebrand + scale shift |
| `--palette-ui-gray-1` | `--palette-gray-50` (sau `100`) | ramurile palette s-au schimbat |

Toată această migrare este **separată de planul curent** — trebuie un tabel de mapping detaliat + un PR de migrare al componentelor, executat după ce token-urile sunt sincronizate corect.

---

## Verificare end-to-end după implementare

```powershell
# 1. Dry-run mai întâi (nu scrie nimic, doar planifică)
node scripts/sync-tokens-from-tokenhaus.mjs --dry-run --report tmp/sync-report.json
# Așteaptă: 5 fișiere planificate, 0 unresolved references după rewrite, 0 skipped

# 2. Diff vs starea curentă (rulează în staging înainte de clean break)
node scripts/sync-tokens-from-tokenhaus.mjs --output tokens/figma-export
diff -ur tokens/figma-export/core tokens/core
# Reviewează schimbările; trebuie să fie exact ce vrei

# 3. Clean break — overwrite tokens/core direct
node scripts/sync-tokens-from-tokenhaus.mjs --output tokens
# Așteaptă: scrie palette/color/font/sizes la tokens/core și color la tokens/core.dark

# 4. Șterge manual fișierele orfane
Remove-Item tokens/core/space.tokens.json, tokens/core/spacing.tokens.json,
            tokens/core/radius.tokens.json, tokens/core/border.tokens.json,
            tokens/core/lineHeight.tokens.json, tokens/core/letterSpacing.tokens.json,
            tokens/core/shadow.tokens.json

# 5. Creează manual tokens/core/effects.tokens.json (din Figma elevation 1-5)

# 6. Token lint + build
yarn tokens.build
yarn tokens.lint.all  # sau echivalentul existent

# 7. Verifică CSS output
Select-String -Path "dist/design-system/tokens/core.tokens.css" -Pattern "^--(color|palette|spacing|border-radius|border-width|font-size|font-weight|line-height|drop-shadow)" | Select-Object -First 50

# 8. Verifică Dark
Select-String -Path "dist/design-system/tokens/core.dark.tokens.css" -Pattern "^--color-" | Select-Object -First 20

# 9. Build Storybook ca smoke test (nu se va render corect până nu sunt migrate componentele, dar build-ul trebuie să treacă)
yarn storybook.build
```

Pass criteria pentru PASUL 7:
- Toate cele 5 grupuri de prefixe apar (color, palette, spacing, border-radius, drop-shadow)
- Niciun `undefined` în output
- Numărul de `--color-*` ≈ numărul de leaves din `1. Semantic Colors` (excl. `hack`)

---

## Critical files (planul de modificare)

- **A modifica**: `scripts/sync-tokens-from-tokenhaus.mjs` — rescriere ~70% (păstrăm scaffolding-ul CLI/report/run, înlocuim extractorii)
- **A șterge manual după rulare**: cele 7 fișiere orfane din `tokens/core/`
- **A crea manual**: `tokens/core/effects.tokens.json` (5 leaves dropShadow)
- **Neatinse în acest plan**: `tokens/core/components/`, `tokens/age/`, configs Style Dictionary, componentele Stencil (migrare separată)

---

## Style Dictionary v4 / DTCG syntax — decizie deliberată

**Status curent**: repo este pe `style-dictionary@^4.4.0` (v4 instalat). Configurațiile (`style-dictionary.config.json`, `style-dictionary.prod.config.json`) folosesc sintaxa legacy v3 (fără flag `usesDtcg`). Toate fișierele din `tokens/core/` și `tokens/core/components/` emit `{ value, type }`.

**Întrebare**: Trecem în acest PR pe DTCG (`$value`, `$type`) — match nativ cu Tokenhaus și W3C standard?

**Analiză**:
- `usesDtcg: true` în SD v4 este per-platform global — nu se pot amesteca formate. Toate fișierele consumate de platformă trebuie să fie DTCG SAU legacy.
- A flip-ui flag-ul în acest PR ar necesita conversia adițională a 7 fișiere non-generate de script (`shadow`, `linearGradient`, `screen`, `size`, `zIndex`, `letterSpacing` dacă rămâne, `radius` legacy artefact) PLUS ~30+ fișiere din `tokens/core/components/`.
- Pipeline-ul Style Dictionary produce **CSS identic** din ambele formate (`{value,type}` și `{$value,$type}` ies la fel după `css/variables` format). Consumatorii (componente Stencil, Storybook, Tailwind) nu fac distincție.
- Scriptul actual deja face conversie DTCG (Tokenhaus input) → legacy (output). Eliminarea acestei conversii e elegant dar nu critic.

**Decizie**: **emisie în format legacy `{ value, type }` în Phase 1.** Migrarea la DTCG e planificată ca Phase 2 separat (vezi TODO), executat după ce clean break-ul de schemă e stabilizat.

**De ce nu acum**:
1. Clean break-ul deja sparge componente prin redenumirea CSS vars. A combina cu o migrare de format triplează numărul de fișiere atinse fără beneficiu funcțional imediat.
2. Format-ul DTCG nu schimbă comportamentul CSS output — pură curățenie internă.
3. PR separat dedicat = surface area mai mic = review mai sigur = ușor de rollback la nevoie.
4. Verificare regresie e clară: o singură variabilă schimbă (format-ul intern), nu se amestecă cu schimbări de naming/scope.

---

## TODO / Iterații viitoare (out of scope pentru acest plan)

1. **Mapping table complet** old → new CSS variable names, ca să generezi un script PowerShell de search&replace pentru `src/components/`.
2. **Migrare component tokens** (`tokens/core/components/*.tokens.json`) — toate referințele `{color.neutral.*}`, `{space.*}`, `{radius.*}` trebuie rescrise.
3. **letterSpacing** — dacă apare în viitor în Figma export, scriptul îl pickup-uiește automat din `4. Typography Primitives.letter-spacing`.
4. **Screen breakpoints** — Figma export-ul nou NU mai are `Screen.Display`. Fie introducem un fișier manual `breakpoints.tokens.json`, fie cerem ca Figma să exporte breakpoint tokens.
5. **Dark mode pentru palette** — momentan primitivele sunt single-mode în Figma. Dacă Figma adaugă variante dark pentru primitive, scriptul trebuie extins.
6. **`#Responsive typography test`** — dacă devine official (nu „test"), scriptul trebuie să emită un fișier dedicat `responsiveTypography.tokens.json` cu mode-keying Desktop/Mobile.
7. **Audit `--strict` mode** — verifică că semantic colors nu lasă `unresolved-reference` în warnings; dacă apar, înseamnă că nu am acoperit toate prefixele Figma în `rewritePathV2`.
8. **Phase 2 — Migrare DTCG ($value/$type)** — PR separat după Phase 1:
   - Flip `usesDtcg: true` în ambele config-uri Style Dictionary.
   - Scriptul `sync-tokens-from-tokenhaus.mjs` emite direct DTCG (skip conversia internă DTCG → legacy).
   - Bulk converter one-time pentru fișierele non-generate: `shadow`, `linearGradient`, `screen`, `size`, `zIndex` (+ orice rămas din `letterSpacing`).
   - Bulk converter pentru `tokens/core/components/*.tokens.json` (~30 fișiere).
   - Verificare: `yarn tokens.build` produce CSS identic byte-pentru-byte (cu o eventuală diferență doar la header-ul de format).
