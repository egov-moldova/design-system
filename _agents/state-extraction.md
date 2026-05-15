# State Extraction — Comprehensive State × Element Matrix

## Scope

Mandatory state extraction process for interactive components. **Read when creating tokens or writing CSS for any interactive component.**

---

## Why This Matters

**Incomplete state extraction is the #1 cause of visual bugs requiring multiple fix iterations.**

❌ **Wrong** (causes 3–5 fix iterations): Extract default → create tokens → user reports hover wrong → add hover → user reports selected missing → repeat…

✅ **Correct** (single implementation): Extract ALL states upfront → create complete token file → write CSS once → verify → done.

---

## State × Element Extraction Matrix

For **EVERY interactive state**, extract styles for **ALL elements**:

| State | Container | Label | Description | Icon | Badge | Checkbox | Other |
|---|---|---|---|---|---|---|---|
| **default** | bg, border, padding | color, weight, size | color, weight, size | color, size | bg, color, icon-color | - | … |
| **hover** | bg, border | color | color | color | bg, color, icon-color | - | … |
| **pressed** | bg, border | color | color | color | bg, color, icon-color | - | … |
| **selected** | bg, border | color, **weight** | color | color | bg, color, icon-color | checked | … |
| **selected:hover** | bg, border | color, weight | color | color | bg, color, icon-color | checked | … |
| **disabled** | bg, border | color | color | color | bg, color, icon-color | disabled | … |
| **selected:disabled** | bg, border | color, weight | color | color | bg, color, icon-color | **accent-color** | … |

---

## Figma Extraction Process

### Step 1: Identify All State Variants

Look for Figma variants or separate frames:
- Default / Hover / Pressed / Disabled
- Selected / Selected+Hover / Selected+Pressed
- Focus / Active / Error / Success (form elements)

### Step 2: Extract Each State Systematically

```javascript
// Extract EACH state — parallel calls OK
figma_get_design_context({ nodeId: "default-node-id" })
figma_get_design_context({ nodeId: "hover-node-id" })
figma_get_design_context({ nodeId: "selected-node-id" })
figma_get_design_context({ nodeId: "selected-hover-node-id" })
// ... ALL states
```

### Step 3: Document in Comparison Table

Before creating tokens, fill this table:

```markdown
| Property | Default | Hover | Selected | Selected:Hover | Disabled |
|---|---|---|---|---|---|
| Container bg | #FFFFFF | #F5F5F5 | #EFBE60 | #FFF1D7 | transparent |
| Label color | #515967 | #515967 | #21262E | #21262E | #8F95A0 |
| Label weight | 400 | 400 | **600** | **600** | 400 |
| Icon color | #6C7584 | #6C7584 | #21262E | #21262E | #8F95A0 |
```

### Step 4: Create Complete Token File

Only after filling the entire matrix. Map hex values to `{token.path}` references using `tokens/AGENTS.md` palette→semantic mapping.

**⚠️ CRITICAL**: Never commit raw hex values in component token files — always use `{token.path}` references.

---

## Typography Property Checklist

For **EACH text element** (label, description, helper text):

- [ ] `font-family` (usually inherited)
- [ ] `font-size` (e.g., 14px, 12px)
- [ ] `font-weight` ⚠️ **Often changes in selected/active states** (400 → 600)
- [ ] `line-height` (e.g., 20px, 16px)
- [ ] `color` (changes per state)

**Common mistake**: Forgetting that `font-weight` often increases in selected/active states.

---

## Interactive Element State Checklist

For components with checkboxes, radio buttons, or toggles:

- [ ] Default (unchecked)
- [ ] Hover (unchecked)
- [ ] Pressed (unchecked)
- [ ] Checked (default)
- [ ] Checked + hover
- [ ] Checked + pressed
- [ ] Disabled (unchecked)
- [ ] Disabled + checked ⚠️ **May have different accent-color**

---

## Verification Before Coding

Before writing ANY CSS:

1. ✅ Extracted ALL state variants from Figma
2. ✅ Documented all values in comparison table
3. ✅ Created complete token JSON with all states
4. ✅ Verified typography properties (especially font-weight) for each state
5. ✅ Identified state-specific property changes (e.g., badge icon color in selected state)

**If you skip this, you WILL need 3–5 fix iterations. Do it right the first time.**
