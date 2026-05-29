# Codebase Snapshots — Live Lookups

Loaded by [`SKILL.md`](../SKILL.md) Steps 0.5 (snapshot) and 1.5 (validate). Defines the eight live lookups optimize-prompt performs against the working tree so the emitted spec references **real** components, tokens, constants, and utilities — not invented names.

**Tool budget:** All lookups are read-only and cheap (one `Glob` + bounded `Read`). Total wall time on SSD: typically under 2 seconds. No caching required.

**Failure mode:** Each lookup MAY fail (file moved, lint error, OS error). On any failure, optimize-prompt emits a `## Validation Issues` block at top of output with the broken lookup's purpose and continues — never blocks emission.

---

## Lookup catalog

The eight lookups below run in parallel during Step 0.5. Results are passed into Step 1.5 for validation.

### 1. Existing components

**Tool:** `Glob` with pattern `src/components/mud-*/mud-*.tsx`

**Purpose:**
- Name-collision check — refuse to emit `--mode=new` spec for a name that already exists
- Reuse candidate scan — fuzzy match the requested name against existing names (see [`reuse-lookup.md`](reuse-lookup.md))
- Cross-component dependency resolution — pattern #8 in [`contradiction-detector.md`](contradiction-detector.md)

**Caveat:** In current state (post-legacy-migration), `src/components/` is empty. All components are in `src/legacy/mud-*/`. Lookup MUST also Glob `src/legacy/mud-*/mud-*.tsx` and mark hits as "legacy candidate" vs "production candidate".

**Output payload:**
```
componentInventory: {
  production: ['mud-button', 'mud-input', ...],   // from src/components/
  legacy:     ['mud-spinner', 'mud-badge', ...],  // from src/legacy/
}
```

---

### 2. Existing tokens per component

**Tool:** `Glob` with pattern `tokens/core/components/*.tokens.json`

**Purpose:**
- For `--mode=redesign`: surface the existing token file for diff against new Figma values
- For `--mode=new`: detect if `<name>.tokens.json` already exists (rare but possible — flag as collision)
- For `--mode=modify`: confirm the token file the consumer will edit exists

**Caveat:** Token files use the component name **without** the `mud-` prefix (e.g., `button.tokens.json`, not `mud-button.tokens.json`). Strip the prefix when matching.

**Output payload:**
```
tokenInventory: {
  'button': 'tokens/core/components/button.tokens.json',
  'spinner': 'tokens/core/components/spinner.tokens.json',
  ...
}
```

When [`token-mapping-table.md`](token-mapping-table.md) emits its tables, cite the file path from this inventory rather than synthesizing the path.

---

### 3. Slot validation constants

**Tool:** `Read` on `src/legacy/shared.constants.ts` (read entire file — it is small, ~140 lines)

**Purpose:**
- Cite the exact constant name (e.g., `VALID_ICON_SLOT_TAGS`) when the spec declares restricted slots — never invent a new constant when an existing one fits
- For new slot types: emit `## New Constants` block declaring the addition; downstream agent adds it to `shared.constants.ts` during implementation

**Known constants (verified 2026-05-18):**

| Constant | Tags | Used by |
|---|---|---|
| `VALID_HELPER_TEXT_TAGS` | `span`, `small`, `div`, `p` | form components helper-text slot |
| `VALID_ICON_SLOT_TAGS` | `mud-icon` | all icon slots across all components |
| `VALID_AVATAR_IMAGE_TAGS` | `img`, `svg` | avatar image slot |
| `VALID_AVATAR_ICON_TAGS` | `mud-icon`, `svg` | avatar icon slot |
| `VALID_AVATAR_SLOT_TAGS` | `mud-avatar` | select-item avatar slot |
| `VALID_TABLE_SECTION_TAGS` | `mud-thead`, `mud-tbody`, `mud-tfoot` | table default slot |
| `VALID_TABLE_HEADER_TAGS` | `mud-column` | thead default slot |
| `VALID_TABLE_ROW_TAGS` | `mud-row` | tbody default slot |
| `VALID_TABLE_CELL_TAGS` | `mud-cell` | row default slot |
| `VALID_NOTIFICATION_ACTION_TAGS` | `mud-button` | notification action slot |
| `VALID_NOTIFICATION_CLOSE_TAGS` | `mud-icon` | notification close-icon override |

**Caveat:** When `src/legacy/shared.constants.ts` moves to `src/utils/shared.constants.ts` (likely future refactor), update the Read target. The constant table above is the stable contract — re-verify the file location on each upgrade.

---

### 4. Semantic color tokens

**Tool:** `Read` on `tokens/core/color.tokens.json`

**Purpose:**
- Validate that every color descriptor in the prompt maps to a semantic token (pattern #2 in detector)
- Surface candidates when the prompt uses ambiguous phrasing ("brand secondary", "subtle gray")

**Match strategy:** Compare prompt phrases against `$value` reference paths in the JSON. Example: `"brand primary"` → look for `cor.color.brand.primary.*`. If multiple candidates, emit them all in `## Clarification Needed`.

**Caveat:** Color tokens reference palette tokens via `{palette.X.Y}` syntax. The lookup must understand this chain when surfacing candidates — palette-tier tokens are NEVER cited directly by components, only via semantic-tier indirection per [`tokens/AGENTS.md`](../../../../tokens/AGENTS.md) § 3-tier hierarchy.

---

### 5. Spacing scale

**Tool:** `Read` on `tokens/core/sizes.tokens.json`

**Purpose:**
- Validate every `<n>px` literal in the prompt maps to an existing spacing rung (pattern #9 in detector)
- Surface the canonical spacing scale to the consumer agent

**Known spacing scale (verified 2026-05-18):**

```
0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, ...
```

DTCG paths: `spacing.<n>` → `cor.size.spacing.<n>`. Example: `16px` → `cor.size.spacing.16` → `--mud-size-spacing-16`.

**Mapping table generation:** When the prompt cites Figma-extracted dimensions, optimize-prompt MUST emit a Sizing Tokens table (per [`token-mapping-table.md`](token-mapping-table.md) § 5) with each px value mapped to its closest scale rung. If no exact match, emit `closest: <rung>` + `delta: <n>px` so the consumer agent can decide whether to round or extend the scale.

---

### 6. Typography scale

**Tool:** `Read` on `tokens/core/font.tokens.json`

**Purpose:**
- Validate font-size, line-height, font-weight, letter-spacing literals against typography scale
- Surface canonical typography classes (`label`, `body`, `caption`, `heading-*`) when the prompt references font roles by intent ("button label", "helper text")

**Match strategy:** Mirror § 5 — fuzzy match prompt phrases to JSON paths. Surface candidates in `## Clarification Needed` if ambiguous.

---

### 7. Effects scale (shadows, motion)

**Tool:** `Read` on `tokens/core/effects.tokens.json`

**Purpose:**
- Validate motion duration / easing references (canonical motion tokens per [`canonical-defaults.md`](canonical-defaults.md) § 3)
- Validate shadow tokens for elevated components (modal, tooltip, dropdown)

**Match strategy:** When the prompt mentions `transition`, `animation`, or `box-shadow` semantics, surface the matching token(s) from this file.

---

### 8. Utility helpers

**Tool:** `Glob` on `src/utils/*.ts`

**Purpose:**
- Cite existing utilities instead of re-specifying them in Implementation Rules
- Surface helpers the consumer agent can import

**Known utilities (verified 2026-05-18):**

| File | Export | Purpose |
|---|---|---|
| `src/utils/invalid-slotted-tag.ts` | `invalidSlottedTag(tag, valid)` | Returns the error string rendered when an invalid tag is slotted |
| `src/utils/css-helpers.ts` | (multiple) | CSS-in-JS helpers |
| `src/utils/flatten-tokens.ts` | `flattenTokens(...)` | DTCG JSON → flat key-value map |
| `src/utils/svg-sanitizer.ts` | `sanitizeSvg(...)` | Sanitize inline SVG strings (for `mud-illustration`) |
| `src/utils/token-parser.ts` | (multiple) | Parse `{path.to.token}` references in JSON |

When a spec needs slot validation, the Implementation Rules section MUST cite `import { invalidSlottedTag } from '../../utils/invalid-slotted-tag'` and the constant import from `shared.constants`. Never re-specify these.

---

## Step 0.5 — Snapshot

```
Run in parallel (all 8 lookups):
  Glob src/components/mud-*/mud-*.tsx       → componentInventory.production
  Glob src/legacy/mud-*/mud-*.tsx           → componentInventory.legacy
  Glob tokens/core/components/*.tokens.json → tokenInventory
  Read src/legacy/shared.constants.ts       → slotConstants
  Read tokens/core/color.tokens.json        → colorTokens
  Read tokens/core/sizes.tokens.json        → sizeTokens
  Read tokens/core/font.tokens.json         → fontTokens
  Read tokens/core/effects.tokens.json      → effectTokens
  Glob src/utils/*.ts                       → utilsInventory

Aggregate into a single snapshot object. Pass to Step 2 (detector) and Step 4 (validator).
```

Lookups that fail (file missing, permission error) emit a one-line warning in `## Validation Issues` and return an empty payload for that lookup. Other lookups continue.

---

## Step 1.5 — Validate

Run against the composed draft from Step 3:

| # | Check | Inputs | On failure |
|---|---|---|---|
| V1 | Every `mud-X` referenced exists in `componentInventory.production ∪ componentInventory.legacy` OR appears in `## Build Order` | draft, componentInventory | Emit `## Validation Issues`: "Component `mud-X` referenced but does not exist and is not in Build Order" |
| V2 | Every `cor.<comp>.<...>` token path matches the regex in [`token-mapping-table.md`](token-mapping-table.md) § 1 | draft | Emit warning with the offending path |
| V3 | Every slot validation constant cited exists in `slotConstants` keys | draft, slotConstants | If constant unknown: emit "Constant `X` not found in shared.constants.ts. Did you mean: `Y`?" |
| V4 | No raw color word (regex: `\b(light|dark|subtle|brand|primary|secondary|tertiary|emphasis)\s+(gray|grey|blue|red|green|yellow|color)\b`) outside cited tokens | draft | Emit "Unmapped color descriptor: `<phrase>`. Map to a semantic token from `tokens/core/color.tokens.json`." |
| V5 | No `\d+px` literal outside Token Mapping or Sizing Tokens sections | draft | Emit "Hardcoded px value: `<n>px`. Map to a spacing-scale rung." |
| V6 | CSS Pattern (A/B/C) declared in Architecture Constraints matches the routed archetype per [`archetype-router.md`](archetype-router.md) | draft, archetype | Emit "Pattern mismatch: archetype `X` routes to Pattern `Y`, but spec declares Pattern `Z`." |
| V7 | Required sections per (mode, archetype) per [`output-templates.md`](output-templates.md) are all present | draft, mode, archetype | Emit "Missing required section: `<name>` for archetype `<archetype>` in mode `<mode>`." |

**V1 special case** — Build Order entries: if a `mud-X` appears in the draft AND in `## Build Order`, V1 passes. This allows specs to legitimately reference unbuilt dependencies as long as the build order is explicit.

**V2 special case** — `--mode=new` defines new tokens that don't exist yet. V2 validates the **format** of the path (regex match), not its existence in `tokenInventory`. Existence checking happens at execution time via `yarn lint.tokens`.

---

## Output of Step 1.5

When validation passes silently: nothing is added to the output.

When validation finds issues:

```
## Validation Issues

- [V1] Component `mud-foo` referenced in Behavior but not in src/components/, src/legacy/, or Build Order. Add to Build Order or fix the reference.
- [V3] Constant `VALID_FOO_TAGS` cited but not found in src/legacy/shared.constants.ts. Closest matches: VALID_ICON_SLOT_TAGS. Did you mean to declare a new constant? Add a "## New Constants" block.
- [V5] Line 47: `72px` is hardcoded. Map to `cor.size.spacing.72` (exact match exists).

(Continue emission below; consumer agent decides whether to fix or accept.)
```

The block is **advisory**, not blocking. Validation never short-circuits emission — the consumer agent is trusted to act on warnings.

---

## Figma auto-extract (Phase 4 — gated on MCP availability)

When the Figma MCP server is online (auth OK, `mcp__figma__*` tools available), optimize-prompt extends Step 0.5 with parallel Figma extraction for every Figma URL or node ID found in the raw prompt.

### Detection

Scan the raw prompt for Figma URLs:

```regex
https://www\.figma\.com/(?:design|file)/([^/]+)/[^?]*\?(?:[^&]*&)*node-id=(\d+[:-]\d+)
```

Capture groups:

- `fileKey` — the file ID portion (e.g., `doJ7tDY0PlQ0PqMgbpFVIC`)
- `nodeId` — the node ID portion (e.g., `724-41243` or `724:41243`)

Normalize `nodeId` to `<n>:<n>` format (some URLs use `-`, the API expects `:`).

### Extraction tools (all parallel)

| Tool | Purpose | Output payload |
|---|---|---|
| `mcp__figma__get_metadata({ nodeId })` | Page/frame tree around the node | `figmaMetadata` — parent/sibling node names + IDs |
| `mcp__figma__get_design_context({ nodeId, forceCode: true })` | Full layout, colors, spacing per node + state | `figmaContext` — extracted properties |
| `mcp__figma__get_variable_defs({ nodeId })` | Figma Variables (tokens) bound to the node | `figmaVariables` — token name → value map |
| `mcp__figma__get_screenshot({ nodeId })` | Visual reference (for downstream pixel-perfect verify) | `figmaScreenshot` — image binary |

### Failure handling

When Figma MCP is unavailable (OAuth expired, network error, server down):

1. Emit a soft warning in `## Validation Issues`:

   ```text
   - [Figma] Extraction deferred — MCP unavailable. Node IDs in spec will be re-extracted at execution time by downstream agent (new-component / redesign-component).
   ```

2. Continue emission with `TBD` cells in Token Mapping `dark` column and in numeric Sizing Tokens cells.

3. Carry node IDs forward in the spec's Goal section so the downstream agent can perform extraction itself.

### Silent merge into output

When extraction succeeds, the payloads merge **silently** into the composed spec:

- `figmaVariables` populates Token Mapping table cells with actual `--mud-*` token paths
- `figmaContext` populates State × Element matrix descriptors (default vs hover deltas)
- `figmaMetadata` confirms node hierarchy used in archetype inference
- `figmaScreenshot` is **not** inlined in the spec — referenced only as "screenshot captured for pixel-perfect verify"

No "I fetched the design" boilerplate appears in the output. The user sees only the extracted data merged into the spec body.

### Confidence rules

When `figmaVariables` returns ambiguous mappings (e.g., a Figma variable maps to multiple semantic tokens in the local `colorTokens` inventory), emit a `## Clarification Needed` block with the candidates. Never silently pick one.

### Caching (Phase 4 extension)

Figma extractions are stable within a single component spec — cache `figmaContext` and `figmaVariables` by `(fileKey, nodeId)` tuple for the duration of the optimize-prompt invocation. Do not persist across invocations (Figma file may have been edited).

---

## Caching strategy

Phase 3: no caching. Each invocation re-runs the 8 lookups. Cost: ~2s on SSD; user accepts the cost in exchange for always-fresh data.

Phase 4 (future): consider caching `tokenInventory` and `slotConstants` for the duration of a single Claude Code session (TTL: 5 min, invalidate on file watcher event). Defer until Phase 3 measurements show the lookup time is a bottleneck.

---

## Maintenance

When a new token category appears (e.g., `tokens/core/motion.tokens.json` is added):
1. Add a new lookup row to the catalog
2. Add a corresponding validator (V-something) in Step 1.5
3. Update the parallel snapshot block in § Step 0.5

When `shared.constants.ts` moves (likely → `src/utils/shared.constants.ts`):
1. Update the Read target in § 3
2. Update the known constants table if exports change
3. Re-verify the file location in this doc by running `Glob`
