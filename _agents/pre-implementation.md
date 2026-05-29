# Pre-Implementation — Inventory, Build Order, Approval, Token-CSS Validation

## Scope

Steps B–D of the pre-implementation protocol plus token-CSS variable validation. **Read after Figma extraction, before writing any component code.**

---

## Step B: Create Component Inventory

Scan existing components (see `_agents/reuse-architecture.md`), then produce:

```markdown
| # | Component | Level | Status | Location / Action |
|---|-----------|-------|--------|-------------------|
| 1 | mud-button | Atom | ✅ Reuse | src/components/mud-button/ |
| 2 | mud-badge | Atom | 🟡 Extend | Needs `size="xs"` variant |
| 3 | mud-input | Atom | 🔴 Create | New component |
| 4 | mud-form-field | Molecule | 🔴 Create | Composes mud-label + mud-input |
```

For each **✅ Reuse** or **🟡 Extend**, verify in Storybook:

- [ ] Opened in Storybook: `browser_navigate({ url: "...?id=atoms-mud-[name]--default" })`
- [ ] Screenshot taken
- [ ] **Figma vs Storybook**: ✅ MATCH / ❌ MISMATCH → describe diff
- [ ] Read `.tsx` → list available props
- [ ] List props needed for this use case

Use the Decision Matrix from `_agents/reuse-architecture.md` to classify each match.

---

## Step C: Generate Build Order

Always build **bottom-up**: atoms → molecules → organisms. Never build a molecule before its atoms exist.

```markdown
## Build Order
1. 🔴 Atom: mud-badge (create)
2. 🟡 Atom: mud-button (extend — add icon slot)
3. 🔴 Molecule: mud-form-field (create — depends on mud-label + mud-input)
4. 🔴 Organism: mud-sidebar (create — depends on mud-nav-item + mud-logo)
```

---

## Step D: Approval Gate (Conditional)

**Always show** the inventory + build order:

- Component count by status (✅ / 🟡 / 🔴)
- Build order with dependencies
- Any assets to download from Figma

**Auto-proceed** if all conditions from `_agents/workflow-rules.md` are met (single component, no ambiguity, standard atom/molecule). Show inventory inline but continue immediately.

**STOP and wait** if any mandatory stop condition applies (3+ components, ⚠️ rows, organism/template).

---

## Token-CSS Variable Validation Protocol

**MANDATORY before `yarn build`**: Verify CSS variable names match generated token names.

### Critical Rule: Style Dictionary Generates Kebab-Case

Style Dictionary **always** converts token paths to kebab-case CSS variables:

| Token JSON Path | Generated CSS Variable | ❌ WRONG |
|---|---|---|
| `label.fontSize` | `--component-label-font-size` | `--component-label-fontSize` |
| `selected.badgeIconColor` | `--component-selected-badge-icon-color` | `--component-selected-badgeIconColor` |

**Pattern**: Every capital letter becomes a hyphen + lowercase.

### Pre-Build CSS Audit

```bash
# 1. Find all CSS variable references in your component
grep "var(--" src/components/mud-component-name/mud-component-name.css

# 2. Verify each follows kebab-case convention
# ✅ CORRECT: var(--select-item-label-font-size)
# ❌ WRONG:   var(--select-item-label-fontSize)
```

**Manual verification**:

1. Open `tokens/core/components/component-name.tokens.json`
2. For each CSS `var(--component-property)`, trace the token path
3. Convert path to kebab-case: `selected.badgeIcon.color` → `--component-selected-badge-icon-color`
4. Verify CSS uses exact kebab-case name

### Post-Build Verification

```bash
# Windows (PowerShell)
Select-String "component-name" dist/design-system/tokens/core.tokens.css

# macOS / Linux (Unix)
grep "component-name" dist/design-system/tokens/core.tokens.css
```
# Every var(--component-*) in CSS must have a matching definition

If a variable doesn't exist: check token JSON for typos → verify path → rebuild per `_agents/environment-commands.md`.

### Common Mistakes

| ❌ Wrong | ✅ Correct | Why |
|---|---|---|
| `--select-item-label-fontSize` | `--select-item-label-font-size` | camelCase → kebab |
| `--select-item-descriptionColor` | `--select-item-description-color` | camelCase → kebab |
| `--selectItem-label-color` | `--select-item-label-color` | Component name must be kebab |

**Rule of thumb**: If you're typing a capital letter in a CSS variable name, you're doing it wrong.
