# State Extraction Checklist Template

**Component**: `cor-[name]`  
**Figma Design**: [URL]  
**Date**: [YYYY-MM-DD]

---

## 1. Identify All States in Figma

- [ ] Default state
- [ ] Hover state
- [ ] Pressed/Active state
- [ ] Focus state (for interactive elements)
- [ ] Disabled state
- [ ] Selected state (if applicable)
- [ ] Selected + Hover
- [ ] Selected + Pressed
- [ ] Selected + Disabled
- [ ] Error state (for form elements)
- [ ] Success state (for form elements)

**Figma Node IDs**:
- Default: `[node-id]`
- Hover: `[node-id]`
- Pressed: `[node-id]`
- Selected: `[node-id]`
- Selected:Hover: `[node-id]`
- Disabled: `[node-id]`

---

## 2. State × Element Extraction Matrix

| Property | Default | Hover | Pressed | Selected | Selected:Hover | Disabled | Notes |
|----------|---------|-------|---------|----------|----------------|----------|-------|
| **Container** |
| background | | | | | | | |
| border | | | | | | | |
| padding | | | | | | | |
| **Label** |
| color | | | | | | | |
| font-size | | | | | | | |
| font-weight | | | | | | | ⚠️ Often changes in selected |
| line-height | | | | | | | |
| **Description** |
| color | | | | | | | |
| font-size | | | | | | | |
| font-weight | | | | | | | |
| **Icon** |
| color | | | | | | | |
| size | | | | | | | |
| **Badge** |
| background | | | | | | | |
| color | | | | | | | |
| icon-color | | | | | | | ⚠️ May differ from text |
| **Checkbox/Toggle** |
| checked | | | | | | | |
| accent-color | | | | | | | ⚠️ Check selected+disabled |

---

## 3. Typography Checklist (Per Element)

### Label
- [ ] font-family: `[value]`
- [ ] font-size: `[value]`
- [ ] font-weight (default): `[value]`
- [ ] font-weight (selected): `[value]` ⚠️
- [ ] line-height: `[value]`
- [ ] color (default): `[value]`
- [ ] color (selected): `[value]`

### Description
- [ ] font-family: `[value]`
- [ ] font-size: `[value]`
- [ ] font-weight: `[value]`
- [ ] line-height: `[value]`
- [ ] color (default): `[value]`
- [ ] color (selected): `[value]`

---

## 4. Extracted Values Table

| Property | Default | Hover | Selected | Selected:Hover | Disabled |
|----------|---------|-------|----------|----------------|----------|
| Container bg | #FFFFFF | #F5F5F5 | #EFBE60 | #FFF1D7 | #00000000 |
| Label color | #515967 | #515967 | #21262E | #21262E | #8F95A0 |
| Label weight | 400 | 400 | **600** | **600** | 400 |
| Icon color | #6C7584 | #6C7584 | #21262E | #21262E | #8F95A0 |
| Badge bg | #6C75841F | #6C75841F | #B92F25 | #B92F25 | #6C75841F |
| Badge icon | #515967 | #515967 | **#EFF0F1** | **#EFF0F1** | #8F95A0 |

---

## 5. Token File Structure Preview

```json
{
  "component-name": {
    "default": {
      "background": { "value": "#FFFFFF", "type": "color" },
      "color": { "value": "#515967", "type": "color" },
      "iconColor": { "value": "#6C7584", "type": "color" }
    },
    "hover": {
      "background": { "value": "#F5F5F5", "type": "color" }
    },
    "pressed": {
      "background": { "value": "#EBEBEB", "type": "color" }
    },
    "selected": {
      "background": { "value": "#EFBE60", "type": "color" },
      "color": { "value": "#21262E", "type": "color" },
      "iconColor": { "value": "#21262E", "type": "color" },
      "badgeBackground": { "value": "#B92F25", "type": "color" },
      "badgeIconColor": { "value": "#EFF0F1", "type": "color" },
      "hover": {
        "background": { "value": "#FFF1D7", "type": "color" }
      },
      "pressed": {
        "background": { "value": "#FAD1CE", "type": "color" }
      },
      "disabled": {
        "background": { "value": "#00000000", "type": "color" },
        "checkboxColor": { "value": "#FAD1CE", "type": "color" }
      }
    },
    "disabled": {
      "background": { "value": "#00000000", "type": "color" },
      "color": { "value": "#8F95A0", "type": "color" }
    },
    "label": {
      "fontSize": { "value": "14px", "type": "dimension" },
      "lineHeight": { "value": "20px", "type": "dimension" },
      "fontWeight": { "value": "400", "type": "number" },
      "selected": {
        "fontWeight": { "value": "600", "type": "number" }
      }
    }
  }
}
```

---

## 6. Pre-Implementation Verification

Before writing ANY CSS, verify:

- [ ] ✅ All state variants extracted from Figma
- [ ] ✅ All values documented in extraction table
- [ ] ✅ Typography properties complete (family, size, weight, line-height, color)
- [ ] ✅ Font-weight changes identified for selected/active states
- [ ] ✅ Badge/nested element colors verified (may differ from parent)
- [ ] ✅ Checkbox/toggle accent-color verified for selected+disabled
- [ ] ✅ Token file structure planned with complete state coverage
- [ ] ✅ No hardcoded values - all reference core tokens where possible

---

## 7. Common Mistakes to Avoid

- ❌ Implementing states incrementally (default → then hover → then selected)
- ❌ Forgetting font-weight changes in selected/active states
- ❌ Assuming badge icon color matches badge text color
- ❌ Missing selected+hover and selected+pressed combinations
- ❌ Not extracting disabled+selected state
- ❌ Using camelCase in CSS variable names instead of kebab-case
- ❌ Missing dual selectors for slots with default elements (::slotted + direct child)

---

## 8. Ready to Code Checklist

- [ ] All Figma states extracted and documented
- [ ] Complete token JSON file created
- [ ] CSS variable naming verified (kebab-case only)
- [ ] Dual selectors planned for any slots with default elements
- [ ] Typography checklist complete for all text elements
- [ ] State × element matrix fully populated

**If all checked ✅ → Proceed to implementation**  
**If any unchecked ❌ → Complete extraction before coding**
