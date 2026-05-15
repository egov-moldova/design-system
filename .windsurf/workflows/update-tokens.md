---
description: Update or create design tokens for a component
---

> **MIGRATED**: This workflow has been ported to [`.claude/commands/update-tokens.md`](../../.claude/commands/update-tokens.md). New edits should be made there. Kept here for Windsurf users.

# /update-tokens — Token Update Workflow

Lightweight workflow for token-only changes. Use when adding, modifying, or refactoring design tokens without changing component TSX/CSS.

---

## Step 1: Environment Check

```bash
# Windows (PowerShell)
Get-ChildItem dist/design-system/tokens/*.css -ErrorAction SilentlyContinue

# macOS / Linux (Unix)
ls dist/design-system/tokens/*.css
```

- **Files exist** → token pipeline is working
- **Files missing** → run `yarn tokens.build` first to establish baseline

---

> **MIGRATED**: This workflow has been ported to [`.claude/commands/update-tokens.md`](../../.claude/commands/update-tokens.md). New edits should be made there. Kept here for Windsurf users.

## Step 2: Identify Scope

Determine what kind of token change is needed:

- **New component tokens** → create `tokens/core/components/{name}.tokens.json`
- **Modify existing tokens** → edit existing `.tokens.json` file
- **Add dark mode overrides** → create/edit `tokens/core.dark/components/{name}.tokens.json`
- **Core token changes** → edit `tokens/core/*.tokens.json` (⚠️ affects all components)

Read existing token files to understand current structure:

```text
read_file({ file_path: "tokens/core/components/{name}.tokens.json" })
read_file({ file_path: "tokens/AGENTS.md" })
```

---

## Step 3: Figma Extraction (if Figma link provided)

If the user provides a Figma link, extract token values:

```text
figma_get_variable_defs({ nodeId: "<node-id>" })
figma_get_design_context({ nodeId: "<node-id>", forceCode: true })
```

Map Figma variables to semantic tokens (see `tokens/AGENTS.md` → semantic token hierarchy):

- Figma `color/neutral/text/weak` → `var(--color-neutral-text-weak)` ✅
- Figma `palette/ui/gray/9` → `var(--color-neutral-text-weak)` ✅ (map via table)
- Figma `palette/ui/gray/9` → `var(--palette-ui-gray-9)` ❌ (never use palette directly)

---

> **MIGRATED**: This workflow has been ported to [`.claude/commands/update-tokens.md`](../../.claude/commands/update-tokens.md). New edits should be made there. Kept here for Windsurf users.

## Step 4: Create/Update Token JSON

**Conditional skill:** `skill({ SkillName: "token-creation" })` → if unfamiliar with token structure, naming conventions, or 3-tier hierarchy.

Follow the rules from `tokens/AGENTS.md`:

1. **No `"components"` wrapper** — root key is the component name directly
2. **Reference existing tokens** using `{token.path}` syntax — never raw hex/px
3. **Naming convention**:
   - Multi-element: `--{component}-{element}-{property}-{scale/state}`
   - Simple: `--{component}-{property}-{scale/state}`
   - Property-state order (not state-property)
4. **Property naming**: Use **camelCase** for compound properties (2+ words):
   - ✅ `fontSize`, `lineHeight`, `borderRadius`, `backgroundColor`, `iconColor`
   - ❌ `font-size`, `line-height`, `border-radius`, `background-color`, `icon-color`
5. **Token references**: NEVER use `{palette.*}` tokens. Always use semantic `{color.*}` tokens:
   - ✅ `{ "value": "{color.neutral.text.weak}" }`
   - ❌ `{ "value": "{palette.ui.gray.9}" }`
6. **Types**: Always include `"type"` field (`"color"`, `"dimension"`, `"fontFamily"`, etc.)

### Pre-Commit Validation Checklist

Before proceeding to Step 5, validate the token file:

- [ ] Search for `{palette.` in the file — if found, replace with semantic token from mapping table
- [ ] Search for kebab-case compound properties (`font-size`, `border-radius`, `background-color`, etc.) — convert to camelCase
- [ ] Verify all token references use `{token.path}` syntax (no hardcoded hex/px values)
- [ ] Confirm `"type"` field is present on all token definitions

Example structure:

```json
{
  "component-name": {
    "variant": {
      "state": {
        "property": {
          "value": "{color.primary.background.default}",
          "type": "color"
        }
      }
    }
  }
}
```

### State Coverage Checklist

Ensure all interactive states have tokens:

- [ ] `default` — base state
- [ ] `hover` — mouse hover
- [ ] `active` / `pressed` — mouse down
- [ ] `focus` — keyboard focus
- [ ] `disabled` — non-interactive

---

// turbo

## Step 5: Build Tokens

```powershell
yarn tokens.build
```

Expected: completes in ~5s with no errors.

---

> **MIGRATED**: This workflow has been ported to [`.claude/commands/update-tokens.md`](../../.claude/commands/update-tokens.md). New edits should be made there. Kept here for Windsurf users.

## Step 6: Verify CSS Output

```bash
# Windows (PowerShell)
Select-String -Path "dist/design-system/tokens/core.tokens.css" -Pattern "{component-name}"

# macOS / Linux (Unix)
grep "{component-name}" dist/design-system/tokens/core.tokens.css
```

Verify:

- [ ] New CSS variables appear in `dist/design-system/tokens/core.tokens.css`
- [ ] Variable names follow `--{component}-{element}-{property}-{scale/state}` or `--{component}-{property}-{scale/state}` pattern
- [ ] Values resolve correctly (no `undefined` or empty values)

---

## Step 7: Token Reference Audit

```powershell
node scripts/debug-missing-token-references.mjs tokens/core/style-dictionary.config.json
```

Or use the convenience script:

```powershell
yarn tokens.audit
```

**Pass criteria**: Zero missing token references.

---

> **MIGRATED**: This workflow has been ported to [`.claude/commands/update-tokens.md`](../../.claude/commands/update-tokens.md). New edits should be made there. Kept here for Windsurf users.

## Step 8: Visual Check (if component exists)

If the component already exists and uses these tokens, verify visually:

```text
browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-cor-{name}--default" })
browser_take_screenshot({ type: "png", filename: "token-update-check.png" })
```

Verify the component renders correctly with updated token values.

---

## Step 9: Dark Mode (if applicable)

If dark mode overrides are needed:

1. Create/edit `tokens/core.dark/components/{name}.tokens.json`
2. Rebuild: `yarn tokens.build`
3. Verify dark mode CSS in `dist/design-system/tokens/core.dark.tokens.css`

---

> **MIGRATED**: This workflow has been ported to [`.claude/commands/update-tokens.md`](../../.claude/commands/update-tokens.md). New edits should be made there. Kept here for Windsurf users.

## Summary

Report:

- Token files created/modified
- New CSS variables generated
- Token audit result (pass/fail)
- Visual check result (if applicable)
