# Design Token Architecture Specification

## Overview

This document defines the complete design token architecture for the AGE Design System. Tokens follow a three-tier hierarchy and use Style Dictionary for transformation and distribution across multiple platforms.

---

## 1. Token Hierarchy

### 1.1 Three-Tier System

```
┌─────────────────────────────────────────────┐
│  TIER 1: GLOBAL TOKENS (Core)              │
│  Raw primitive values                       │
│  Examples: color.gray.100, space.md         │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  TIER 2: SEMANTIC TOKENS (Core)            │
│  Purpose-based references                   │
│  Examples: color.neutral.background.default │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  TIER 3: COMPONENT TOKENS (Core/Client)    │
│  Component-specific styling                 │
│  Examples: button.primary.default.background│
└─────────────────────────────────────────────┘
```

### 1.2 Token Scope Rules

| Tier | Location | Scope | CSS Output | Usage |
|------|----------|-------|------------|-------|
| **Global** | `tokens/core/*.tokens.json` | Project-wide | `:root` | Base values referenced by semantic tokens |
| **Semantic** | `tokens/core/color.tokens.json` | Project-wide | `:root` | Purpose-based values referenced by components |
| **Component** | `tokens/core/components/*.tokens.json` | Component-scoped | `:root` | Direct usage in component CSS |

---

## 2. Token File Structure

### 2.1 JSON Format

```json
{
  "category": {
    "subcategory": {
      "property": {
        "value": "raw-value or {token.reference}",
        "type": "color|size|dimension|fontFamily|fontWeight|borderRadius|shadow"
      }
    }
  }
}
```

### 2.2 Token Types

| Type | Description | Example Value | CSS Output |
|------|-------------|---------------|------------|
| `color` | Color values | `#FFFFFF`, `rgb(255,255,255)` | `#ffffff` |
| `size` | Size values with units | `16px`, `1rem`, `0.5em` | `16px` |
| `dimension` | Numeric dimensions | `24`, `1.5` | `24px` or `1.5` |
| `fontFamily` | Font family stacks | `"Inter", sans-serif` | `"Inter", sans-serif` |
| `fontWeight` | Font weights | `400`, `600`, `bold` | `400` |
| `borderRadius` | Border radius values | `4px`, `0.25rem` | `4px` |
| `shadow` | Box shadow values | `0 2px 4px rgba(0,0,0,0.1)` | Full shadow string |

---

## 3. Core Token Categories

### 3.1 Palette (Tier 1: Global)

**File:** `tokens/core/palette.tokens.json`

Raw color values organized by color name and shade scale.

```json
{
  "palette": {
    "gray": {
      "100": { "value": "#171717", "type": "color" },
      "90": { "value": "#2F2F2F", "type": "color" },
      "80": { "value": "#454545", "type": "color" },
      "70": { "value": "#5D5D5D", "type": "color" },
      "60": { "value": "#747474", "type": "color" },
      "50": { "value": "#8B8B8B", "type": "color" },
      "40": { "value": "#A2A2A2", "type": "color" },
      "30": { "value": "#BABABA", "type": "color" },
      "20": { "value": "#D1D1D1", "type": "color" },
      "10": { "value": "#E8E8E8", "type": "color" },
      "5": { "value": "#E2E5E9", "type": "color" },
      "1": { "value": "#F3F5F7", "type": "color" }
    },
    "primary": {
      "100": { "value": "#494C83", "type": "color" },
      "50": { "value": "#9B9CBB", "type": "color" },
      "10": { "value": "#EBECF2", "type": "color" }
    }
  }
}
```

**Scale Convention:**
- `100` = Darkest/Most saturated
- `50` = Medium
- `10` = Lightest/Least saturated
- `1-5` = Extreme light variants

### 3.2 Color (Tier 1 + Tier 2: Global + Semantic)

**File:** `tokens/core/color.tokens.json`

Contains both raw colors (Tier 1) and semantic color mappings (Tier 2).

```json
{
  "color": {
    "gray": {
      "100": { "value": "#171717", "type": "color" }
    },
    "neutral": {
      "background": {
        "default": { "value": "{color.gray.1}", "type": "color" },
        "subtle": { "value": "{color.gray.5}", "type": "color" },
        "hover": { "value": "{color.gray.10}", "type": "color" },
        "active": { "value": "{color.gray.20}", "type": "color" }
      },
      "text": {
        "default": { "value": "{color.gray.100}", "type": "color" },
        "weak": { "value": "{color.gray.70}", "type": "color" },
        "inverse": { "value": "{color.white}", "type": "color" }
      },
      "border": {
        "default": { "value": "{color.gray.20}", "type": "color" },
        "strong": { "value": "{color.gray.40}", "type": "color" }
      },
      "icon": {
        "default": { "value": "{color.gray.100}", "type": "color" },
        "weak": { "value": "{color.gray.60}", "type": "color" }
      }
    },
    "primary": {
      "background": {
        "default": { "value": "{color.darkViolet.100}", "type": "color" },
        "hover": { "value": "{color.darkViolet.90}", "type": "color" },
        "active": { "value": "{color.darkViolet.80}", "type": "color" }
      },
      "text": {
        "default": { "value": "{color.darkViolet.100}", "type": "color" }
      },
      "border": {
        "default": { "value": "{color.darkViolet.100}", "type": "color" }
      }
    }
  }
}
```

**Semantic Naming Convention:**
```
color.{context}.{element}.{variant}

Examples:
- color.neutral.background.default
- color.primary.text.hover
- color.danger.border.active
```

### 3.3 Spacing (Tier 1: Global)

**Files:** 
- `tokens/core/space.tokens.json` - Space scale
- `tokens/core/spacing.tokens.json` - Spacing utilities

```json
{
  "space": {
    "px": { "value": "1px", "type": "size" },
    "6xs": { "value": "2px", "type": "size" },
    "5xs": { "value": "4px", "type": "size" },
    "4xs": { "value": "6px", "type": "size" },
    "3xs": { "value": "8px", "type": "size" },
    "2xs": { "value": "10px", "type": "size" },
    "xs": { "value": "12px", "type": "size" },
    "sm": { "value": "14px", "type": "size" },
    "md": { "value": "16px", "type": "size" },
    "lg": { "value": "20px", "type": "size" },
    "xl": { "value": "24px", "type": "size" },
    "2xl": { "value": "32px", "type": "size" },
    "3xl": { "value": "40px", "type": "size" },
    "4xl": { "value": "48px", "type": "size" },
    "5xl": { "value": "64px", "type": "size" },
    "6xl": { "value": "80px", "type": "size" }
  },
  "spacing": {
    "px": { "value": "{space.px}", "type": "size" },
    "2xs": { "value": "{space.2xs}", "type": "size" },
    "xs": { "value": "{space.xs}", "type": "size" },
    "sm": { "value": "{space.sm}", "type": "size" },
    "md": { "value": "{space.md}", "type": "size" },
    "lg": { "value": "{space.lg}", "type": "size" },
    "xl": { "value": "{space.xl}", "type": "size" },
    "2xl": { "value": "{space.2xl}", "type": "size" }
  }
}
```

### 3.4 Typography (Tier 1: Global)

**File:** `tokens/core/font.tokens.json`

```json
{
  "fontFamily": {
    "sans": { 
      "value": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "type": "fontFamily" 
    },
  },
  "fontWeight": {
    "light": { "value": "300", "type": "fontWeight" },
    "regular": { "value": "400", "type": "fontWeight" },
    "medium": { "value": "500", "type": "fontWeight" },
    "semiBold": { "value": "600", "type": "fontWeight" },
    "bold": { "value": "700", "type": "fontWeight" },
    "black": { "value": "900", "type": "fontWeight" }
  },
  "fontSize": {
    "2xs": { "value": "10px", "type": "dimension" },
    "xs": { "value": "12px", "type": "dimension" },
    "sm": { "value": "14px", "type": "dimension" },
    "md": { "value": "16px", "type": "dimension" },
    "lg": { "value": "18px", "type": "dimension" },
    "xl": { "value": "20px", "type": "dimension" },
    "2xl": { "value": "24px", "type": "dimension" },
    "3xl": { "value": "32px", "type": "dimension" },
    "4xl": { "value": "40px", "type": "dimension" },
    "5xl": { "value": "48px", "type": "dimension" }
  },
  "lineHeight": {
    "xs": { "value": "16px", "type": "dimension" },
    "sm": { "value": "18px", "type": "dimension" },
    "md": { "value": "20px", "type": "dimension" },
    "lg": { "value": "24px", "type": "dimension" },
    "xl": { "value": "28px", "type": "dimension" },
    "2xl": { "value": "32px", "type": "dimension" },
    "3xl": { "value": "40px", "type": "dimension" },
    "4xl": { "value": "48px", "type": "dimension" }
  },
  "letterSpacing": {
    "tight": { "value": "-0.02em", "type": "dimension" },
    "normal": { "value": "0", "type": "dimension" },
    "wide": { "value": "0.02em", "type": "dimension" }
  }
}
```

### 3.5 Border Radius (Tier 1: Global)

**File:** `tokens/core/radius.tokens.json`

```json
{
  "radius": {
    "none": { "value": "0px", "type": "borderRadius" },
    "xs": { "value": "2px", "type": "borderRadius" },
    "sm": { "value": "4px", "type": "borderRadius" },
    "md": { "value": "8px", "type": "borderRadius" },
    "lg": { "value": "12px", "type": "borderRadius" },
    "xl": { "value": "16px", "type": "borderRadius" },
    "2xl": { "value": "24px", "type": "borderRadius" },
    "3xl": { "value": "32px", "type": "borderRadius" },
    "full": { "value": "9999px", "type": "borderRadius" }
  }
}
```

### 3.6 Shadows (Tier 1: Global)

**File:** `tokens/core/shadow.tokens.json`

```json
{
  "shadow": {
    "xs": { 
      "value": "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
      "type": "shadow" 
    },
    "sm": { 
      "value": "0px 1px 3px 0px rgba(0, 0, 0, 0.1)",
      "type": "shadow" 
    },
    "md": { 
      "value": "0px 4px 6px -1px rgba(0, 0, 0, 0.1)",
      "type": "shadow" 
    },
    "lg": { 
      "value": "0px 10px 15px -3px rgba(0, 0, 0, 0.1)",
      "type": "shadow" 
    },
    "xl": { 
      "value": "0px 20px 25px -5px rgba(0, 0, 0, 0.1)",
      "type": "shadow" 
    },
    "2xl": { 
      "value": "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
      "type": "shadow" 
    }
  }
}
```

### 3.7 Breakpoints (Tier 1: Global)

**File:** `tokens/core/screen.tokens.json`

```json
{
  "screen": {
    "xs": { "value": "375px", "type": "dimension" },
    "sm": { "value": "640px", "type": "dimension" },
    "md": { "value": "768px", "type": "dimension" },
    "lg": { "value": "1024px", "type": "dimension" },
    "xl": { "value": "1280px", "type": "dimension" },
    "2xl": { "value": "1536px", "type": "dimension" }
  }
}
```

### 3.8 Z-Index Scale (Tier 1: Global)

**File:** `tokens/core/z-index.tokens.json`

```json
{
  "zIndex": {
    "base": { "value": "0", "type": "dimension" },
    "dropdown": { "value": "1000", "type": "dimension" },
    "sticky": { "value": "1100", "type": "dimension" },
    "fixed": { "value": "1200", "type": "dimension" },
    "overlay": { "value": "1300", "type": "dimension" },
    "modal": { "value": "1400", "type": "dimension" },
    "popover": { "value": "1500", "type": "dimension" },
    "tooltip": { "value": "1600", "type": "dimension" }
  }
}
```

---

## 4. Component Tokens (Tier 3)

### 4.1 Component Token Structure

Component tokens are stored in `tokens/core/components/{component-name}.tokens.json`.

```json
{
  "componentName": {
    "property": {
      "value": "{reference.token}",
      "type": "type"
    },
    "sizeVariant": {
      "property": {
        "value": "{reference.token}",
        "type": "type"
      }
    },
    "colorVariant": {
      "state": {
        "property": {
          "value": "{reference.token}",
          "type": "type"
        }
      }
    }
  }
}
```

### 4.2 Button Component Token Example

**File:** `tokens/core/components/button.tokens.json`

```json
{
  "button": {
    "fontFamily": { "value": "{fontFamily.body}", "type": "fontFamily" },
    "fontWeight": { "value": "{fontWeight.semiBold}", "type": "fontWeight" },
    "fontSize": { "value": "{fontSize.sm}", "type": "dimension" },
    "lineHeight": { "value": "{lineHeight.md}", "type": "dimension" },
    "gap": { "value": "{spacing.xs}", "type": "size" },
    "size": { "value": "{space.4xl}", "type": "size" },
    "padding": {
      "y": { "value": "{space.2xs}", "type": "size" },
      "x": { "value": "{spacing.md}", "type": "size" }
    },
    "borderRadius": { "value": "{radius.md}", "type": "size" },
    "borderWidth": { "value": "{spacing.px}", "type": "size" },
    
    "tiny": {
      "fontSize": { "value": "{fontSize.xs}", "type": "dimension" },
      "lineHeight": { "value": "{lineHeight.sm}", "type": "dimension" },
      "gap": { "value": "{spacing.2xs}", "type": "size" },
      "size": { "value": "{space.lg}", "type": "size" },
      "padding": {
        "y": { "value": "{space.6xs}", "type": "size" },
        "x": { "value": "{spacing.xs}", "type": "size" }
      },
      "borderRadius": { "value": "{radius.sm}", "type": "size" }
    },
    
    "primary": {
      "default": {
        "background": { "value": "{color.primary.background.default}", "type": "color" },
        "border": { "value": "{color.primary.border.default}", "type": "color" },
        "color": { "value": "{color.white}", "type": "color" }
      },
      "hover": {
        "background": { "value": "{color.primary.background.hover}", "type": "color" },
        "border": { "value": "{color.primary.border.hover}", "type": "color" },
        "color": { "value": "{color.white}", "type": "color" }
      },
      "active": {
        "background": { "value": "{color.primary.background.active}", "type": "color" },
        "border": { "value": "{color.primary.border.active}", "type": "color" },
        "color": { "value": "{color.white}", "type": "color" }
      },
      "focus": {
        "background": { "value": "{color.primary.background.default}", "type": "color" },
        "border": { "value": "{color.primary.border.default}", "type": "color" },
        "color": { "value": "{color.white}", "type": "color" }
      },
      "disabled": {
        "background": { "value": "{color.neutral.background.subtle}", "type": "color" },
        "border": { "value": "{color.neutral.border.default}", "type": "color" },
        "color": { "value": "{color.neutral.text.weak}", "type": "color" }
      }
    }
  }
}
```

**Component Token Naming Pattern:**
```
{component}.{variant}.{state}.{property}

Examples:
- button.primary.default.background
- button.primary.hover.background
- button.small.padding.x
- input.default.border.color
```

---

## 5. Dark Theme Tokens

### 5.1 Dark Theme Architecture

Dark theme tokens override light theme values using the same token names.

**File:** `tokens/core.dark/color.tokens.json`

```json
{
  "color": {
    "neutral": {
      "background": {
        "default": { "value": "{color.gray.100}", "type": "color" },
        "subtle": { "value": "{color.gray.90}", "type": "color" },
        "hover": { "value": "{color.gray.80}", "type": "color" }
      },
      "text": {
        "default": { "value": "{color.gray.1}", "type": "color" },
        "weak": { "value": "{color.gray.30}", "type": "color" }
      }
    }
  }
}
```

**CSS Output:**
```css
/* tokens/generated/core.tokens.css */
:root {
  --color-neutral-background-default: #F3F5F7;
  --color-neutral-text-default: #171717;
}

/* tokens/generated/core.dark.tokens.css */
:root[data-theme="dark"] {
  --color-neutral-background-default: #171717;
  --color-neutral-text-default: #F3F5F7;
}
```

### 5.2 Dark Theme Token Files

Only override tokens that change in dark mode:

- `tokens/core.dark/color.tokens.json` - Color overrides
- `tokens/core.dark/shadow.tokens.json` - Shadow overrides
- `tokens/core.dark/border-color.tokens.json` - Border color overrides
- `tokens/core.dark/icon.tokens.json` - Icon color overrides

---

## 6. Client-Specific Tokens (Multi-Client)

### 6.1 Client Token Structure

Each client has its own token directory: `tokens/{client-name}/`

**Example: AGE Client**

```
tokens/age/
├── base/
│   └── custom-tokens.tokens.json     # AGE-specific base tokens
├── components/
│   ├── avatar.tokens.json
│   ├── badge.tokens.json
│   ├── checkbox.tokens.json
│   ├── datepicker.tokens.json
│   └── [other-components].tokens.json
└── style-dictionary.config.json      # AGE build config
```

### 6.2 Client Build Configuration

**File:** `tokens/age/style-dictionary.config.json`

```json
{
  "source": [
    "tokens/core/**/*.tokens.json",      // Inherit all core tokens
    "tokens/age/**/*.tokens.json"        // Override with AGE tokens
  ],
  "platforms": {
    "css": {
      "transforms": ["attribute/cti", "name/kebab", "color/hex"],
      "buildPath": "dist/design-system/tokens/",
      "files": [
        {
          "destination": "age.tokens.css",
          "format": "css/variables"
        }
      ]
    }
  }
}
```

### 6.3 Token Override Example

**AGE overrides button primary color:**

```json
// tokens/age/components/button.tokens.json
{
  "button": {
    "primary": {
      "default": {
        "background": { "value": "#FF0000", "type": "color" }
      }
    }
  }
}
```

**Result:** AGE buttons use red instead of the core primary color.

---

## 7. Style Dictionary Configuration

### 7.1 Transform Pipeline

Style Dictionary transforms tokens through:

1. **attribute/cti** - Category/Type/Item attributes
2. **name/kebab** - Convert to kebab-case CSS variables
3. **size/px** - Add px unit to dimension values (optional)
4. **color/hex** - Convert colors to hex format

### 7.2 Build Process

```bash
# Build all token sets
yarn tokens.build

# Individual builds
yarn tokens.build.core      # → core.tokens.css
                            # → core.dark.tokens.css
yarn tokens.build.age    # → age.tokens.css
```

### 7.3 Output Formats

**CSS Variables (Primary):**
```css
:root {
  --color-primary-500: #494C83;
  --space-md: 16px;
  --button-primary-default-background: var(--color-primary-500);
}
```

**JSON (For Tailwind/React):**
```json
{
  "color": {
    "primary": {
      "500": "#494C83"
    }
  }
}
```

---

## 8. Token Usage in Components

### 8.1 CSS Variable Reference Pattern

```css
/* Component CSS */
.component {
  /* Use component token with core fallback */
  font-size: var(--component-font-size, var(--font-size-sm));
  
  /* Use size-specific token with component fallback */
  padding: var(--component-large-padding, var(--component-padding, 16px));
  
  /* Use variant-specific token (no fallback needed) */
  background-color: var(--component-primary-default-background);
}
```

### 8.2 Token Priority Order

1. **Component-specific token** - Highest priority
2. **Size/variant-specific token** - Medium priority
3. **Core semantic token** - Fallback
4. **Raw value** - Last resort (avoid)

**Example:**
```css
::slotted(button) {
  /* Priority: button-large-font-size > button-font-size > font-size-md > 16px */
  font-size: var(
    --button-large-font-size,
    var(--button-font-size, var(--font-size-md, 16px))
  );
}
```

---

## 9. Token Naming Conventions

### 9.1 File Naming

- Pattern: `{category}.tokens.json`
- Examples: `color.tokens.json`, `font.tokens.json`, `button.tokens.json`
- Location determines scope (core vs. client)

### 9.2 Token Path Naming

**Format:** `{category}.{subcategory}.{property}.{variant}`

**Examples:**
```
color.primary.500
color.neutral.background.default
button.primary.default.background
spacing.md
space.xl
radius.lg
shadow.sm
```

### 9.3 CSS Variable Naming

Tokens automatically convert to kebab-case CSS variables:

| Token Reference | CSS Variable |
|----------------|--------------|
| `{color.primary.500}` | `--color-primary-500` |
| `{button.primary.default.background}` | `--button-primary-default-background` |
| `{space.xl}` | `--space-xl` |
| `{fontFamily.body}` | `--font-family-body` |

---

## 10. Token Maintenance

### 10.1 Adding New Tokens

1. **Determine tier** (Global, Semantic, or Component)
2. **Choose file location** (core vs. client)
3. **Follow naming convention**
4. **Add token with proper type**
5. **Reference existing tokens when possible**
6. **Build tokens** (`yarn tokens.build`)
7. **Test in component**

### 10.2 Modifying Existing Tokens

1. **Identify impact** (What components use this token?)
2. **Update token value**
3. **Rebuild tokens**
4. **Test all affected components**
5. **Update Storybook**
6. **Document breaking changes** (if any)

### 10.3 Token Validation

**Checklist:**
- [ ] Token follows naming convention
- [ ] Token has correct type
- [ ] Token references existing tokens (where appropriate)
- [ ] Token builds without errors
- [ ] Component using token renders correctly
- [ ] Dark theme works (if color token)
- [ ] Token documented in component CSS

---

## 11. Common Token Patterns

### 11.1 Interactive State Colors

```json
{
  "component": {
    "variant": {
      "default": { "background": "{color}", "border": "{color}", "color": "{color}" },
      "hover": { "background": "{color}", "border": "{color}", "color": "{color}" },
      "active": { "background": "{color}", "border": "{color}", "color": "{color}" },
      "focus": { "background": "{color}", "border": "{color}", "color": "{color}" },
      "disabled": { "background": "{color}", "border": "{color}", "color": "{color}" }
    }
  }
}
```

### 11.2 Size Variants

```json
{
  "component": {
    "tiny": { "fontSize": "{fontSize.xs}", "padding": { "x": "{space.xs}", "y": "{space.6xs}" } },
    "small": { "fontSize": "{fontSize.sm}", "padding": { "x": "{space.sm}", "y": "{space.4xs}" } },
    "medium": { "fontSize": "{fontSize.md}", "padding": { "x": "{space.md}", "y": "{space.2xs}" } },
    "large": { "fontSize": "{fontSize.lg}", "padding": { "x": "{space.lg}", "y": "{space.xs}" } }
  }
}
```

### 11.3 Spacing Consistency

```json
{
  "component": {
    "gap": "{spacing.xs}",
    "padding": {
      "x": "{spacing.md}",
      "y": "{spacing.sm}"
    },
    "margin": "{spacing.lg}"
  }
}
```

---

## 12. Token Documentation

### 12.1 Component Token Documentation

Each component's CSS file should document available token overrides:

```css
/**
 * @cssprop --button-font-size - Font size for button text
 * @cssprop --button-padding-inline - Horizontal padding
 * @cssprop --button-primary-default-background - Primary button background
 */
```

### 12.2 Storybook Token Documentation

Token documentation stories in `.storybook/stories/`:
- `core-tokens.mdx` - Core token documentation
- `core-dark-tokens.mdx` - Dark theme tokens
- `client-tokens.mdx` - Client-specific tokens

---

## 13. Token Anti-Patterns (Avoid)

### 13.1 ❌ Hard-Coded Values

```css
/* BAD */
.button {
  padding: 16px;
  color: #494C83;
}

/* GOOD */
.button {
  padding: var(--button-padding-inline, var(--spacing-md));
  color: var(--button-primary-default-color);
}
```

### 13.2 ❌ Deeply Nested Token References

```json
// BAD - Too many levels of indirection
{
  "token1": { "value": "{token2}" },
  "token2": { "value": "{token3}" },
  "token3": { "value": "{token4}" },
  "token4": { "value": "16px" }
}

// GOOD - Direct or single-level references
{
  "space.md": { "value": "16px" },
  "button.padding": { "value": "{space.md}" }
}
```

### 13.3 ❌ Inconsistent Naming

```json
// BAD
{
  "btn-color": "...",
  "ButtonSize": "...",
  "button_padding": "..."
}

// GOOD
{
  "button": {
    "color": "...",
    "size": "...",
    "padding": "..."
  }
}
```

---

## 14. Future Token Enhancements

### Phase 1 (Current)
- ✅ Core token system
- ✅ Component tokens for atoms
- ✅ Dark theme support
- ✅ AGE client tokens

### Phase 2 (Next)
- [ ] Animation/transition tokens
- [ ] Motion duration tokens
- [ ] Easing function tokens
- [ ] Additional client themes

### Phase 3 (Future)
- [ ] Token versioning system
- [ ] Token migration tools
- [ ] Token analytics/usage tracking
- [ ] Dynamic token generation

---

## Appendix: Token Reference Quick Guide

### Global Token Categories
- `color.*` - Color palette and semantic colors
- `space.*` - Space scale (padding, margin, gaps)
- `spacing.*` - Spacing utilities
- `fontSize.*` - Font size scale
- `fontWeight.*` - Font weight scale
- `fontFamily.*` - Font family stacks
- `lineHeight.*` - Line height scale
- `letterSpacing.*` - Letter spacing scale
- `radius.*` - Border radius scale
- `shadow.*` - Box shadow definitions
- `screen.*` - Responsive breakpoints
- `zIndex.*` - Z-index layering
- `icon.*` - Icon sizing

### Component Token Pattern
```
{component}.{variant}.{state}.{property}
{component}.{size}.{property}
{component}.{property}
```

### CSS Variable Usage
```css
var(--specific-token, var(--general-token, fallback-value))
```
