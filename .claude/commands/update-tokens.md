---
description: Create or modify design tokens for a component (token-only changes, no TSX/CSS edits)
argument-hint: "<component-name> [--scope=new|modify|dark]"
---

# /update-tokens

Lightweight workflow for token-only changes. Use for adding, modifying, or refactoring design tokens without changing component TSX/CSS.

Component / scope: `$ARGUMENTS`

## Step 1: Environment Check

```bash
# PowerShell
Get-ChildItem dist/design-system/tokens/*.css -ErrorAction SilentlyContinue

# Unix
ls dist/design-system/tokens/*.css
```

- Files exist → token pipeline is working
- Files missing → run `yarn tokens.build` first to establish baseline

## Step 2: Identify Scope

Determine the change type:

- **New component tokens** → create `tokens/core/components/<name>.tokens.json`
- **Modify existing tokens** → edit existing `.tokens.json`
- **Add dark mode overrides** → create/edit `tokens/core.dark/components/<name>.tokens.json` (DEFERRED in current phase)
- **Core token changes** → edit `tokens/core/*.tokens.json` (⚠️ affects all components)

Read existing token files to understand current structure:

- `tokens/core/components/<name>.tokens.json` (if exists)
- `tokens/AGENTS.md` (governance rules)

## Step 3: Figma Extraction (if Figma link provided)

If a Figma link is given, extract token values:

```text
mcp__figma__get_variable_defs({ nodeId: "<node-id>" })
mcp__figma__get_design_context({ nodeId: "<node-id>", forceCode: true })
```

Map Figma variables to semantic tokens (see `tokens/AGENTS.md` semantic hierarchy):

- Figma `color/neutral/text/weak` → `var(--color-neutral-text-weak)` ✓
- Figma `palette/ui/gray/9` → `var(--color-neutral-text-weak)` ✓ (map via table)
- Figma `palette/ui/gray/9` → `var(--palette-ui-gray-9)` ✗ (never use palette directly)

## Step 4: Create/Update Token JSON

Invoke `token-creation` skill if unfamiliar with token structure, naming conventions, or 3-tier hierarchy.

Follow rules from `tokens/AGENTS.md`:

1. **No `"components"` wrapper** — root key is the component name directly
2. **Reference existing tokens** with `{token.path}` syntax — never raw hex/px
3. **Naming convention**:
   - Multi-element: `--{component}-{element}-{property}-{scale/state}`
   - Simple: `--{component}-{property}-{scale/state}`
   - Property-state order (not state-property)
4. **Property naming**: camelCase for compound properties (2+ words):
   - PASS: `fontSize`, `lineHeight`, `borderRadius`, `backgroundColor`, `iconColor`
   - FAIL: `font-size`, `line-height`, `border-radius`, `background-color`, `icon-color`
5. **Token references**: NEVER use `{palette.*}`. Always use semantic `{color.*}`:
   - PASS: `{ "$value": "{color.neutral.text.weak}", "$type": "color" }`
   - FAIL: `{ "$value": "{palette.ui.gray.9}" }`
6. **DTCG format**: use `$value` and `$type` (Style Dictionary v4)

### Pre-Commit Validation Checklist

- Search for `{palette.` in the file — if found, replace with semantic token from mapping table
- Search for kebab-case compound properties (`font-size`, `border-radius`, `background-color`, etc.) — convert to camelCase
- Verify all token references use `{token.path}` syntax (no hardcoded hex/px values)
- Confirm `$type` field is present on all token definitions

Example structure (DTCG):

```json
{
  "component-name": {
    "variant": {
      "state": {
        "property": {
          "$value": "{color.primary.background.default}",
          "$type": "color"
        }
      }
    }
  }
}
```

### State Coverage Checklist

- `default` — base state
- `hover` — mouse hover
- `active` / `pressed` — mouse down
- `focus` — keyboard focus
- `disabled` — non-interactive

## Step 5: Build Tokens

```bash
yarn tokens.build
```

Expected: completes in ~5s with no errors.

## Step 6: Verify CSS Output

```bash
# PowerShell
Select-String -Path "dist/design-system/tokens/core.tokens.css" -Pattern "<component-name>"

# Unix
grep "<component-name>" dist/design-system/tokens/core.tokens.css
```

Verify:

- New CSS variables appear in `dist/design-system/tokens/core.tokens.css`
- Variable names follow naming convention
- Values resolve correctly (no `undefined` or empty values)

## Step 7: Token Reference Audit

```bash
yarn tokens.audit
```

Or directly:

```bash
node scripts/debug-missing-token-references.mjs tokens/core/style-dictionary.config.json
```

**Pass criteria**: Zero missing token references.

## Step 7a: WCAG 2.1 AA Contrast Audit (mandatory)

Any new or modified color token must respect WCAG 2.1 AA contrast against its documented background pair(s). Run:

```bash
yarn audit:contrast
```

- If you added a new color token, also add documented pair(s) to `scripts/audit-token-contrast.mjs` `PAIRS` array. Choose threshold: 4.5 for body text, 3.0 for UI/large text/focus ring.
- New `FAIL` is a blocker. Either pick a different value or document an exception in `ACCEPTED_EXCEPTIONS` with explicit rationale (reviewer must approve).
- Test BOTH light and dark themes — the script runs both by default.

Reference: Skill [`accessibility-compliance`](../skills/accessibility-compliance/SKILL.md) sections 2 (Contrast Requirements) and 6 (Dark Mode Validation).

## Step 8: Visual Check (if component exists)

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-cor-<name>--default" })
mcp__playwright__browser_take_screenshot({ type: "png", filename: "token-update-check.png" })
```

Verify the component renders correctly with updated token values.

## Step 9: Dark Mode (DEFERRED)

Dark mode tokens are out of scope until the final project phase. Skip this step.

## Summary

Report:

- Token files created/modified
- New CSS variables generated
- Token audit result (pass/fail)
- Visual check result (if applicable)
