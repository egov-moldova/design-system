# Output Templates — 5 Modes

Loaded by [`SKILL.md`](../SKILL.md) Step 3 (Compose). Declares the exact section order and gating per mode. Mode is determined in Step 0 (Classify); archetype determines which sections within the mode template are required vs optional (per [`archetype-router.md`](archetype-router.md)).

**Default emission:** `--concise`. Opt-in `--full` inlines references and full token matrices.

---

## Common header (all modes)

Every spec starts with:

```
# <Component / Task name>

(Auto-corrections block, if any)
(Clarification Needed block, if any)
(Reuse candidates block, if any)
(Build Order block, if any)
(Suppressed Rules block, if any)
```

These five "preamble" blocks appear ONLY when the detector or live-validation produced output. Otherwise the spec starts directly with `## 1. Goal`.

---

## Mode: `new`

For brand-new components without an existing implementation.

```
## 1. Goal
- Component: cor-<name>
- Atomic level: <Atom | Molecule | Organism | Layout>
- Archetype: <atom-visual | atom-interactive | form-associated | molecule | molecule-interactive | organism | layout>
- Directory: src/components/cor-<name>/
- Figma source: <file URL> — primary node <node-id>
- Figma state matrix: see § 6

## 2. Scope
- In scope: <bullet list>
- Out of scope: <bullet list — populated by detector pattern #3 when applicable>

## 3. Architecture Constraints
- CSS Pattern: <A | B | C> (see _agents/reuse-architecture.md § Architecture Decision Tree)
- Internal state: <list @State() members or "none">
- Externally controlled: <list @Prop() controlled state>
- Control model: <fully controlled | partially controlled | uncontrolled>
- Hard boundaries: <what the component must NOT do — no HTTP, no business logic, etc.>
- (Form-associated only) formAssociated: true; @AttachInternals(); all 4 callbacks; setFormValue(v, state) both args (see src/components/_agents/form-associated.md)

## 4. API
### Props
| name | type | default | reflect | description |
|------|------|---------|---------|-------------|
| ...  | ...  | ...     | ...     | ...         |

### Events
| name | payload type | trigger |
|------|--------------|---------|
| corX | <Component><Action>Detail (exported from <name>.types.ts) | <when> |

### Slots
| name | required | empty-detection | allowed tags |
|------|----------|-----------------|--------------|
| ...  | ...      | slotchange + .has-X class | VALID_<X>_SLOT_TAGS (cite or declare new) |

### Exported types
- <Component>Variant, <Component>Size, <Component><Action>Detail in src/components/cor-<name>/cor-<name>.types.ts

### Utilities
- <existing utils to reuse from src/utils/, or "none">

## 5. Behavior
- <one line per behavior — state transitions, validation pipelines, memory management, keyboard, ARIA, edge cases>
- (interactive archetypes) State × Element matrix (see § 6.2)
- (animated atoms) Animation spec: <duration token> <easing token> <transform>; prefers-reduced-motion fallback

## 6. Token Mapping
(per-variant tables, light + dark — see references/token-mapping-table.md)

### 6.1 Sizing tokens
(table per size — see references/token-mapping-table.md § 5)

### 6.2 State × Element matrix
(conceptual matrix — see references/token-mapping-table.md § 4)

### 6.3 Token file
- tokens/core/components/<name>.tokens.json (DTCG format)
- Build: yarn tokens.build
- Validate: yarn lint.tokens

## 7. Implementation Rules
- TSX member order: per src/components/AGENTS.md § "TSX Member Order"
- TypeScript strict: `!` on @Element/@Event/@AttachInternals; Record<>; ?? ''; import type {...} (see _agents/typescript-strict.md)
- CSS Pattern: <A|B|C> selectors; dual-selector for slot defaults (see _agents/shadow-dom-patterns.md)
- Host class management: declarative getHostClasses() — no imperative classList (see _agents/anti-patterns.md #26)
- Logical properties only — no padding-left/right (see canonical-defaults.md § 6 i18n)
- Tokens: never hex/px literals; always {token.path} references (see tokens/AGENTS.md)

## 8. Acceptance Criteria
### Visual
- Pixel-perfect against Figma nodes <list>, all states + sizes + variants in both light and dark mode

### Functional
- <interaction list — clicks fire corX, keyboard activates, focus visible, etc.>

### A11y (WCAG 2.1 AA)
(auto-injected block per canonical-defaults.md § 5)

### Quality
- yarn build passes
- yarn lint passes
- yarn test.unit passes — coverage > 80%
- Stories exist: Default, AllVariants, AllSizes, States, AllStatesTable (gated per archetype-router.md § 3)
```

---

## Mode: `redesign`

For legacy components moving from `src/legacy/cor-X/` to `src/components/cor-X/` with new Figma design.

```
## 1. Goal
- Component: cor-<name>
- Source: src/legacy/cor-<name>/ → target: src/components/cor-<name>/
- Figma source (NEW design): <file URL> — primary node <node-id>
- Reason: AGE Design System redesign program

## 2. Visual Changes (Token Diff)
(table: current token → new token + reason — see references/token-mapping-table.md § 7)

## 3. API Changes
- Breaking: <list>  (or "none — visual-only redesign")
- Additive: <list>  (or "none")
- Renames: <list>   (or "none")

## 4. Migration
(only if breaking)
- Old slot/prop name → new name with migration note for consumers
- Deprecated tokens removed; consumers must update CSS overrides

## 5. Behavior delta
- <only behaviors that change from legacy; if none, write "none">

## 6. Token Mapping
(full per-variant tables for NEW design — see references/token-mapping-table.md)

## 7. Acceptance Criteria
- Visual parity with Figma <nodes>
- Backward-compatible API (or migration block explicit)
- A11y baseline maintained or improved
- Stories regenerated per archetype
- yarn lint.tokens passes; yarn build passes
```

---

## Mode: `modify`

For adding a variant/prop/size to an existing component.

```
## 1. Goal
- Component: cor-<name>
- Modification: <add variant X | add prop Y | add size Z>
- Reason: <one sentence>

## 2. API Changes
### Added props / variants / sizes
| name | type | default | description |

### Behavioral additions
- <one line per new behavior>

## 3. Token Mapping (delta only)
(only new tokens needed for the added variant/size — table)

## 4. Acceptance Criteria
- New variant/prop/size matches Figma node <id>
- Existing variants unchanged (regression check via Storybook visual diff)
- Stories updated: new variant added to AllVariants / States grid
- yarn lint.tokens passes; yarn build passes
```

---

## Mode: `fix`

For visual or behavioral bug fixes.

```
## 1. Goal
- Component: cor-<name>
- Symptom: <one sentence>
- Root cause: <if known; otherwise "TBD — investigation needed">
- Affected files: <list>

## 2. Behavior delta
- <what changes — minimal scope>

## 3. Token / CSS / TSX changes
- Layer: <token | css | tsx> (per fix-visual-bug skill — token-first order)
- Specific changes: <bullet list>

## 4. Acceptance Criteria
- Symptom no longer reproduces (manual test in Storybook)
- Regression test added (story or unit test)
- No regression in other states (verify via AllStatesTable story)
- yarn build passes; yarn test.unit passes
```

---

## Mode: `tokens`

For pure token changes — no TSX/CSS edits.

```
## 1. Goal
- Token file: tokens/core/components/<name>.tokens.json
- Change: <rename | add | remove | retune values>
- Reason: <one sentence>

## 2. Token Diff
(table: current → new — see references/token-mapping-table.md § 7)

## 3. Acceptance Criteria
- yarn tokens.build regenerates dist/cor.css without errors
- yarn lint.tokens passes (naming regex valid)
- yarn tokens.validate passes (contrast ratios)
- No CSS files touched in src/components/
- Storybook visual diff shows expected appearance change only
```

---

## Calibration targets (--concise)

| Mode | Lines target | Notes |
|------|-------------|-------|
| `new` (atom) | 60–80 | Single variant, few props, no sub-states |
| `new` (atom-interactive) | 80–120 | Multiple variants × states matrix |
| `new` (form-associated) | 100–140 | Includes form contract + helper-text + validation |
| `new` (molecule) | 80–110 | Composition + reuse list |
| `new` (organism) | 120–160 | Full state machine + sub-components |
| `redesign` (any) | 50–90 | Diff-driven; smaller than `new` |
| `modify` | 30–50 | Delta only |
| `fix` | 25–40 | Symptom-focused |
| `tokens` | 20–35 | Diff table dominates |

If output exceeds the calibration: switch to citation-by-reference for inlined rules; drop sections that match defaults (`canonical-defaults.md` already covers them).

---

## --full mode adjustments

- Inline every rule body from cited `_agents/*.md` files
- Emit explicit per-cell token paths in Token Mapping (no `(same as default)`)
- Add a per-rule rationale paragraph to each Implementation Rules bullet
- Targets: ~2.5× the `--concise` line count

Use `--full` only when the consumer agent operates autonomously without ability to re-resolve citations (rare).
