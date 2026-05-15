# Figma Extraction — Design Analysis, Behavior Exploration, State Discovery

## Scope

Steps A through A.1.5 of the pre-implementation protocol: Figma screenshot analysis, component behavior exploration, context-aware state discovery, and asset download. **Read when extracting designs from Figma.**

## Contents

- Step A: Extract & Analyze Figma
- Step A.0.5: Asset Download
- Step A.1: Explore Component Behavior (variants, props, states, nested)
- Step A.1.5: Context-Aware State Discovery (documentation pages)

---

## Step A: Extract & Analyze Figma

```text
1. figma_get_screenshot({ nodeId: "..." })                          → SEE the design
2. figma_get_design_context({ nodeId: "...", forceCode: true })     → GET exact specs (always forceCode: true)
3. figma_get_variable_defs({ nodeId: "..." })                       → GET token values
```

**After getting the screenshot, DESCRIBE what you see:**

- What sections (organisms) are visible? List top to bottom.
- What functional groups (molecules) compose each section?
- What individual elements (atoms) make up each molecule?
- Note interactive elements (buttons, inputs, dropdowns, tabs, toggles).
- **Width awareness**: Is each component full-width or constrained? Note exact widths.

---

## Step A.0.5: Asset Download (if custom graphics present)

After `figma_get_design_context`, check for non-icon assets.

**Download**: Custom illustrations, logos, background images, decorative SVGs
**Skip**: Carbon icons → `cor-icon`, standard UI icons → `assets/icons/*.svg`

**Download workflow** (only if custom graphics found):

1. Check response for `imageUrl` or `svgContent` fields
2. Download from Figma MCP assets endpoint
3. Save to `assets/icons/` for SVGs or new subdirectory for illustrations
4. Document paths for implementation

**Skip if**: Design uses only `cor-icon` or existing `assets/icons/*.svg`.

---

## Step A.1: Explore Component Behavior (MANDATORY)

**CRITICAL**: Use Figma MCP to explore behavior/variants/props **BEFORE** visual analysis. Prevents implementing wrong component type or missing states.

### What to Extract via `figma_get_metadata`

1. **Component Type**: Is it `COMPONENT` (main) or `INSTANCE` (references main)?
   - If instance → navigate to main component for full variant/prop info
2. **Variants**: List all (e.g., `variant=primary|secondary`, `size=sm|md|lg`)
3. **Props**: Boolean (`disabled`, `selected`), string (`label`), enum (`variant`), with defaults
4. **Interactive States**: hover, pressed, focus, disabled, selected + combinations
5. **Auto Layout**: Direction, spacing, padding, alignment, resizing
6. **Prototype Connections**: Click/hover interactions?
7. **Nested Components**: List instances within, with main component IDs

### Instance vs Main Component

```javascript
// If INSTANCE → navigate to main component
figma_get_metadata({ nodeId: "123:456" })
// Output: "type": "INSTANCE", "mainComponent": { "id": "789:012" }
figma_get_metadata({ nodeId: "789:012" })
// Now: full variant/prop structure

// Extract design context from BOTH
figma_get_design_context({ nodeId: "123:456", forceCode: true })  // Current variant
figma_get_design_context({ nodeId: "789:012", forceCode: true })  // All variants
```

### Subcomponent Identification

When nested components found:

1. List all subcomponents with main component IDs
2. Check if they exist in `src/components/`
3. For missing: 🔴 Create (reusable atom/molecule) or ⚠️ Ask user (unclear)

| Subcomponent | Exists? | Action |
|---|---|---|
| cor-avatar | ✅ Yes | Reuse |
| cor-badge | 🔴 No | **CREATE** — reusable atom |

### Verification Before Proceeding

- [ ] Component type identified (instance vs main)
- [ ] All variants documented
- [ ] All props documented with types and defaults
- [ ] All interactive states identified (minimum: default, hover, disabled)
- [ ] Auto layout rules extracted
- [ ] Nested components listed with main component IDs
- [ ] Subcomponents checked against existing `src/components/`
- [ ] Build order determined (atoms before molecules)
- [ ] User approval obtained if new subcomponents needed

**If any checkbox unchecked, DO NOT PROCEED to visual analysis.**

---

## Step A.1.5: Context-Aware State Discovery (Documentation Pages)

**Activate when** the Figma node is a documentation frame or grid showing multiple state variations.

**Indicators**: Frame name contains "States", "Variations", "Examples"; multiple instances visible; page-level node ID provided.

### Discovery Workflow

```javascript
// Step 1: Check if parent frame
const nodeMetadata = figma_get_metadata({ nodeId: "user-provided-id" });

// Step 2: If FRAME with children → scan for instances
if (nodeMetadata.type === "FRAME" && nodeMetadata.children?.length > 0) {
  const instances = nodeMetadata.children.filter(c => c.type === "INSTANCE" || c.type === "COMPONENT");
  // Step 3: Group by main component ID
  // Step 4: Extract design context from ALL instances
}
```

### Fallback: Single Instance Provided

1. Extract from that instance
2. Navigate to main component via `figma_get_metadata`
3. Check main component variants for missing states
4. **Inform user**: "Found N states in main component. Shall I search parent frame for examples?"

### Verification

- [ ] Determined if node is parent frame or single instance
- [ ] If parent → scanned all child instances
- [ ] Grouped instances by main component ID
- [ ] Extracted design context from ALL instances
- [ ] Built state matrix from visual examples
- [ ] Cross-referenced with main component variants
