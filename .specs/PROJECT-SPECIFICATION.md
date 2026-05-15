# AGE Design System - Project Specification

## Executive Overview

The AGE Design System is a **framework-agnostic component library** built with Stencil.js, implementing Atomic Design methodology with a **slot-based architecture** (not prop-based). It provides consistent, efficient, and scalable front-end interfaces through shared design tokens, atomic components, and multi-client theming support.

### Core Principles
1. **Slot-Based Composition**: Components wrap semantic HTML elements rather than recreating them
2. **Framework Agnostic**: Compiles to Web Components usable in React, Angular, Vue, and vanilla JS
3. **Token-Driven Design**: Three-tier token hierarchy (Global → Semantic → Component)
4. **Multi-Client Architecture**: Shared core system + independent theme layers per client
5. **Atomic Design**: Clear component hierarchy (Atoms → Molecules → Organisms → Templates)
6. **Theme Support**: Light/dark modes via `data-theme` attribute
7. **Type Safety**: Full TypeScript implementation with strict typing

---

## 1. Architecture Overview

### 1.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Core Framework** | Stencil.js 4.x | Web Component compiler with TypeScript support |
| **Build System** | Vite | Fast development and production builds |
| **Token Management** | Style Dictionary 4.x | Design token transformation and distribution |
| **Documentation** | Storybook 8.x | Component showcase and interactive documentation |
| **Testing** | Jest + Puppeteer | Unit and E2E testing |
| **Styling** | PostCSS + Nested CSS | Modern CSS with preprocessing |
| **Package Distribution** | NPM | Multi-framework output targets |
| **Version Control** | Git + Conventional Commits | Semantic versioning and changelog automation |

### 1.2 Build Output Targets

```typescript
// stencil.config.ts outputs
{
  dist: Standard distribution with lazy loading
  dist-custom-elements: Custom elements bundle for frameworks
  docs-readme: Auto-generated component documentation
  react: React wrapper components (via @stencil/react-output-target)
  // Future: Angular, Vue wrappers
}
```

### 1.3 Project Structure

```
age-design/
├── src/
│   ├── components/           # All UI components
│   │   ├── cor-button/       # Atom: Button wrapper component
│   │   ├── cor-icon/         # Atom: Icon component
│   │   ├── cor-grid/         # Template: Grid layout system
│   │   ├── cor-typography/   # Atom: Typography component
│   │   ├── cor-separator/    # Atom: Visual separator
│   │   ├── cor-scrollbar/    # Utility: Custom scrollbar
│   │   └── [future-components]/
│   ├── assets/
│   │   └── css/
│   │       ├── index.css          # Global styles entry point
│   │       ├── base/              # Base HTML element styles
│   │       │   └── html.css       # Root HTML styles
│   │       └── utilities/         # Utility classes
│   │           ├── scrollbars.css # Custom scrollbar styles
│   │           └── overlays.css   # Overlay utilities
│   ├── utils/
│   │   ├── flatten-tokens.ts      # Token flattening utilities
│   │   └── invalid-slotted-tag.ts # Slot validation helper
│   ├── components.d.ts            # Auto-generated type definitions
│   └── index.ts                   # Main export file
│
├── tokens/
│   ├── core/                      # Core design tokens (base layer)
│   │   ├── palette.tokens.json    # Raw color palette
│   │   ├── color.tokens.json      # Semantic color tokens
│   │   ├── font.tokens.json       # Typography tokens
│   │   ├── space.tokens.json      # Spacing scale
│   │   ├── spacing.tokens.json    # Spacing utilities
│   │   ├── radius.tokens.json     # Border radius scale
│   │   ├── shadow.tokens.json     # Elevation shadows
│   │   ├── border.tokens.json     # Border properties
│   │   ├── size.tokens.json       # Size scale
│   │   ├── lineHeight.tokens.json # Line height scale
│   │   ├── letter-spacing.tokens.json
│   │   ├── icon.tokens.json       # Icon sizing
│   │   ├── linearGradient.tokens.json
│   │   ├── screen.tokens.json     # Breakpoints
│   │   ├── z-index.tokens.json    # Z-index scale
│   │   ├── components/            # Component-level tokens
│   │   │   ├── button.tokens.json
│   │   │   ├── typography.tokens.json
│   │   │   ├── scrollbar.tokens.json
│   │   │   └── separator.tokens.json
│   │   └── style-dictionary.config.json
│   │
│   ├── core.dark/                 # Dark theme overrides
│   │   ├── color.tokens.json      # Dark mode colors
│   │   ├── shadow.tokens.json     # Dark mode shadows
│   │   └── [other-overrides].tokens.json
│   │   └── style-dictionary.config.json
│   │
│   ├── age/                       # AGE client theme
│   │   ├── base/                  # AGE base overrides
│   │   ├── components/            # AGE component tokens
│   │   │   ├── avatar.tokens.json
│   │   │   ├── badge.tokens.json
│   │   │   ├── box.tokens.json
│   │   │   ├── breadcrumbs.tokens.json
│   │   │   ├── checkbox.tokens.json
│   │   │   ├── chips.tokens.json
│   │   │   ├── datepicker.tokens.json
│   │   │   ├── dropdown.tokens.json
│   │   │   ├── input.tokens.json
│   │   │   ├── link.tokens.json
│   │   │   ├── pagination.tokens.json
│   │   │   ├── radioInput.tokens.json
│   │   │   ├── tabs.tokens.json
│   │   │   └── toggle.tokens.json
│   │   └── style-dictionary.config.json
│   │
│   └── generated/                 # Auto-generated CSS files
│       ├── core.tokens.css
│       ├── core.dark.tokens.css
│       └── age.tokens.css
│
├── .storybook/                    # Storybook configuration
│   ├── main.mjs                   # Main Storybook config
│   ├── preview.js                 # Preview configuration
│   ├── manager.mjs                # Manager customization
│   ├── custom-theme.js            # Custom Storybook theme
│   ├── custom-elements.json       # Web component metadata
│   └── stories/                   # Documentation stories
│       ├── Introduction.mdx
│       ├── core-tokens.mdx
│       └── core-dark-tokens.mdx
│
├── scripts/                       # Build and utility scripts
│   ├── generate-carbon-icon-names.mjs
│   ├── process-svg.js
│   └── debug-missing-token-references.mjs
│
├── assets/                        # Static assets
│   ├── font/                      # Font files
│   │   └── Onest/
│   └── icons/                     # SVG icons
│
├── stencil.config.ts              # Stencil build configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Project dependencies
├── postcss.config.js              # PostCSS configuration
└── README.md                      # Project documentation
```

---

## 2. Design Token Architecture

### 2.1 Three-Tier Token Hierarchy

**Layer 1: Global Tokens (Core)**
- Raw values: colors, spacing, typography scales
- Location: `tokens/core/*.tokens.json`
- Scope: Available project-wide
- Example: `{color.gray.100}`, `{space.md}`, `{radius.sm}`

**Layer 2: Semantic Tokens (Core)**
- Purpose-based references to global tokens
- Location: `tokens/core/color.tokens.json` (semantic section)
- Scope: Available project-wide
- Example: `{color.neutral.background.default}` → `{color.gray.100}`

**Layer 3: Component Tokens (Core/Client)**
- Component-specific styling tokens
- Location: `tokens/core/components/*.tokens.json` and `tokens/[client]/components/*.tokens.json`
- Scope: Component-scoped CSS files
- Example: `{button.primary.default.background}` → `{color.primary.500}`

### 2.2 Token File Structure

```json
{
  "category": {
    "subcategory": {
      "token-name": {
        "value": "{reference.or.raw.value}",
        "type": "color|size|dimension|fontFamily|fontWeight"
      }
    }
  }
}
```

### 2.3 Token Build Process

```bash
# Build all tokens
yarn tokens.build

# Builds core tokens
yarn tokens.build.core
# → Generates: dist/design-system/tokens/core.tokens.css

# Builds core.dark tokens
# → Generates: dist/design-system/tokens/core.dark.tokens.css

# Builds client-specific tokens (e.g., age)
yarn tokens.build.age
# → Generates: dist/design-system/tokens/age.tokens.css
```

### 2.4 CSS Variable Naming Convention

**Token Reference Format:**
```json
"{category.subcategory.name}"
```

**Generated CSS Variable Format:**
```css
--category-subcategory-name
```

**Examples:**
- `{color.primary.500}` → `--color-primary-500`
- `{space.xl}` → `--space-xl`
- `{button.primary.default.background}` → `--button-primary-default-background`

### 2.5 Theme Switching

Dark theme tokens are scoped with `data-theme` attribute:

```css
/* Light theme (default) */
:root {
  --color-neutral-background-default: #FFFFFF;
}

/* Dark theme */
:root[data-theme="dark"] {
  --color-neutral-background-default: #171717;
}
```

---

## 3. Component Development Standards

### 3.1 Slot-Based Architecture

**Core Principle:** Components wrap and style semantic HTML elements rather than replacing them.

**Why Slot-Based?**
- ✅ Preserves native HTML semantics and accessibility
- ✅ Maintains native browser behaviors (form submission, validation, etc.)
- ✅ Better SEO and screen reader support
- ✅ Framework-agnostic flexibility
- ✅ Progressive enhancement

**Example Pattern:**
```typescript
// ❌ WRONG: Prop-based (anti-pattern for this project)
<cor-button text="Click me" onClick={handler} />

// ✅ CORRECT: Slot-based
<cor-button variant="primary" size="medium">
  <button onClick={handler}>Click me</button>
</cor-button>
```

### 3.2 Component File Structure

Every component must include:

```
cor-component-name/
├── cor-component-name.tsx           # Component logic
├── cor-component-name.css           # Component styles
├── cor-component-name.enums.ts      # TypeScript enums
├── cor-component-name.constants.ts  # Constants and config
├── cor-component-name.types.ts      # TypeScript interfaces (optional)
├── cor-component-name.stories.ts    # Storybook stories
├── readme.md                        # Auto-generated documentation
└── test/
    ├── cor-component-name.spec.tsx  # Unit tests
    └── cor-component-name.e2e.tsx   # E2E tests
```

### 3.3 Component Naming Convention

- **Tag Name:** `cor-{component-name}` (kebab-case)
- **Class Name:** `Cor{ComponentName}` (PascalCase)
- **File Name:** `cor-{component-name}.{ext}` (kebab-case)
- **Enum Prefix:** `{Component}{Property}` (PascalCase)

**Examples:**
- Button: `<cor-button>`, `CorButton`, `ButtonVariant`, `ButtonSize`
- Input Field: `<cor-input-field>`, `CorInputField`, `InputFieldVariant`

### 3.4 Atomic Design Classification

| Level | Description | Examples |
|-------|-------------|----------|
| **Atoms** | Basic building blocks | Button, Icon, Typography, Input, Separator |
| **Molecules** | Combined components | Input Field (label + input), Toggle, Search Bar |
| **Organisms** | Complex UI structures | Card, Navbar, Form, Data Table, Modal |
| **Templates** | Page-level structures | Page Layout, Grid System |

### 3.5 Component Props Pattern

**Always include:**
1. Variant/type props (string enums)
2. Size props (string enums)
3. State props (boolean: disabled, loading, etc.)
4. Reflect attributes for styling: `@Prop({ reflect: true })`

**Example:**
```typescript
@Component({
  tag: 'cor-button',
  styleUrl: 'cor-button.css',
  shadow: true,
})
export class CorButton {
  @Prop({ reflect: true }) variant: string = ButtonVariant.PRIMARY;
  @Prop({ reflect: true }) size: string = ButtonSize.MEDIUM;
  @Prop({ reflect: true }) iconOnly: boolean = false;
  @Element() host: HTMLCorButtonElement;
}
```

---

## 4. Styling Standards

### 4.1 CSS Architecture

**Shadow DOM Styling:**
```css
/* Host element styles */
:host {
  display: inline-block;
}

/* Reflected attribute selectors */
:host([variant='primary']) {
  /* Variant-specific styles */
}

:host([size='large']) {
  /* Size-specific styles */
}

/* Slotted content styles */
::slotted(*) {
  /* Base slotted styles */
}

::slotted(*:hover:not(:disabled)) {
  /* Interactive states */
}
```

### 4.2 Token Usage in CSS

**Pattern:**
```css
property: var(--component-property-modifier, var(--fallback-token));
```

**Examples:**
```css
/* Component-level token with core fallback */
font-size: var(--button-font-size, var(--font-size-sm));

/* Size-specific token */
font-size: var(--button-large-font-size, var(--font-size-md));

/* Variant-specific token */
background-color: var(--button-primary-default-background);
```

### 4.3 State Management

**Interactive States (in order):**
1. `:not(:disabled)` - Default state
2. `:hover:not(:disabled)` - Hover state
3. `:active:not(:disabled)` - Active/pressed state
4. `:focus-visible:not(:disabled)` - Focus state
5. `:disabled` / `[aria-disabled='true']` - Disabled state

**Transitions:**
```css
transition: background-color 0.15s ease-in-out,
            border-color 0.15s ease-in-out,
            color 0.15s ease-in-out;
```

---

## 5. Storybook Integration

### 5.1 Story File Structure

```typescript
import { html } from 'lit-html';
import { ComponentEnums } from './component.enums';

export default {
  title: 'Atoms/ComponentName',
  component: 'cor-component-name',
  argTypes: {
    variant: {
      control: 'select',
      options: Object.values(ComponentVariant),
    },
    size: {
      control: 'select',
      options: Object.values(ComponentSize),
    },
    // ... other controls
  },
};

export const Default = (args) => html`
  <cor-component-name variant="${args.variant}" size="${args.size}">
    <element>${args.content}</element>
  </cor-component-name>
`;
```

### 5.2 Story Organization

- **Path:** `src/components/cor-{name}/{name}.stories.ts`
- **Title Format:** `{Atomic Level}/{Component Name}`
- **Examples:**
  - `Atoms/Button`
  - `Molecules/Input Field`
  - `Organisms/Card`
  - `Templates/Grid`

---

## 6. Multi-Client Architecture

### 6.1 Client Structure

Each client (e.g., AGE) gets:
1. Own token directory: `tokens/{client-name}/`
2. Component token overrides: `tokens/{client-name}/components/`
3. Base style overrides: `tokens/{client-name}/base/`
4. Build configuration: `tokens/{client-name}/style-dictionary.config.json`

### 6.2 Token Inheritance

```
Core Tokens (Global)
     ↓
Semantic Tokens (Core)
     ↓
Component Tokens (Core)
     ↓
Client Overrides (AGE/Client)
     ↓
Generated CSS
```

### 6.3 Build Process

```json
// tokens/age/style-dictionary.config.json
{
  "source": [
    "tokens/core/**/*.tokens.json",      // Inherit core
    "tokens/age/**/*.tokens.json"     // Override with client
  ]
}
```

---

## 7. Development Workflow

### 7.1 Component Development Checklist

- [ ] Create component directory structure
- [ ] Define enums and constants
- [ ] Create TypeScript component with slot validation
- [ ] Define component-level tokens in `tokens/core/components/`
- [ ] Write Shadow DOM CSS with token references
- [ ] Create Storybook stories with all variants
- [ ] Write unit tests (`.spec.tsx`)
- [ ] Write E2E tests (`.e2e.tsx`)
- [ ] Generate documentation (`readme.md` auto-generated)
- [ ] Test in multiple frameworks (React, Angular, Vue)
- [ ] Verify accessibility (WCAG 2.1 AA)

### 7.2 Build Commands

```bash
# Development
yarn dev                   # Start Storybook dev server
yarn build.watch           # Watch mode for Stencil builds

# Production
yarn build                 # Build Stencil components
yarn build.react           # Build with React wrappers
yarn sp.build              # Build Storybook static site

# Testing
yarn test                  # Run all tests
yarn test.watch            # Watch mode for tests

# Tokens
yarn tokens.build          # Build all design tokens

# Formatting
yarn format                # Format code with Prettier + ESLint
yarn lint                  # Lint code
```

### 7.3 Git Workflow

**Branch Naming:**
```
{type}/{issue-key}-{description-in-dash-case}

Examples:
- feat/cor-45-add-input-component
- fix/cor-23-button-hover-state
- docs/cor-12-update-readme
```

**Commit Convention:**
```
{type}({scope}): {description}

Types: feat, fix, docs, style, refactor, test, chore
Scope: component name or area

Examples:
- feat(button): add icon-only variant
- fix(input): resolve focus state issue
- docs(readme): update installation instructions
```

---

## 8. Testing Standards

### 8.1 Unit Tests (Jest)

```typescript
// cor-button.spec.tsx
import { newSpecPage } from '@stencil/core/testing';
import { CorButton } from '../cor-button';

describe('cor-button', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorButton],
      html: `<cor-button><button>Click</button></cor-button>`,
    });
    expect(page.root).toBeTruthy();
  });
  
  it('reflects variant attribute', async () => {
    const page = await newSpecPage({
      components: [CorButton],
      html: `<cor-button variant="secondary"><button>Click</button></cor-button>`,
    });
    expect(page.root.getAttribute('variant')).toBe('secondary');
  });
});
```

### 8.2 E2E Tests (Puppeteer)

```typescript
// cor-button.e2e.tsx
import { newE2EPage } from '@stencil/core/testing';

describe('cor-button', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-button><button>Click</button></cor-button>');
    const element = await page.find('cor-button');
    expect(element).toBeTruthy();
  });
});
```

---

## 9. Accessibility Requirements

### 9.1 Standards Compliance

- **WCAG 2.1 Level AA** compliance required
- Semantic HTML preservation (slot-based approach)
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios (4.5:1 for text, 3:1 for UI)
- Focus indicators (`:focus-visible`)

### 9.2 ARIA Support

- Proper ARIA attributes when needed
- `aria-disabled` for disabled anchors
- `aria-label` for icon-only buttons
- Role attributes for custom semantics

---

## 10. Package Distribution

### 10.1 NPM Package Structure

```
@age/design-system/
├── dist/                          # Main distribution
│   ├── index.cjs.js              # CommonJS entry
│   ├── index.js                  # ES Module entry
│   ├── types/                    # TypeScript definitions
│   ├── collection/               # Component collection
│   └── design-system/            # Compiled components
│       └── tokens/               # Generated token CSS
│           ├── core.tokens.css
│           ├── core.dark.tokens.css
│           └── age.tokens.css
└── loader/                       # Lazy loading helpers
```

### 10.2 Framework Integration

**React:**
```bash
yarn build.react
# Generates React wrapper in ../react-design-system/
```

**Angular/Vue:** (Future implementation)

---

## 11. Future Roadmap

### Phase 1 (Current): Foundation
✅ Token system
✅ Core atoms (Button, Icon, Typography, Separator)
✅ Grid system
✅ Storybook setup
✅ Build pipeline

### Phase 2 (Next): Form Components
- [ ] Input / Textarea
- [ ] Select / Dropdown
- [ ] Checkbox, Radio, Switch
- [ ] Form validation utilities

### Phase 3: Complex Components
- [ ] Data Table
- [ ] Modal
- [ ] Notifications/Toast
- [ ] Tooltip
- [ ] Tabs
- [ ] Accordion

### Phase 4: Advanced Features
- [ ] Dark/Light theme toggle component
- [ ] Datepicker
- [ ] Upload area
- [ ] Progress indicators
- [ ] Timeline components
- [ ] Illustrations library

### Phase 5: Framework Wrappers
- [ ] Angular output target
- [ ] Vue output target
- [ ] Framework-specific documentation

---

## 12. Performance Considerations

### 12.1 Bundle Size
- Lazy loading by default
- Tree-shakeable component imports
- CSS custom properties (no runtime calculation)
- Minimal JavaScript footprint

### 12.2 Build Optimization
- PostCSS for CSS optimization
- TypeScript compilation target: ES2020
- Component code splitting
- Asset optimization

---

## 13. Documentation Standards

### 13.1 Component Documentation

Each component must document:
1. **Purpose:** What the component does
2. **Slot Requirements:** What HTML elements are expected
3. **Props:** All properties with types and defaults
4. **CSS Custom Properties:** All available CSS variables
5. **Examples:** Common usage patterns
6. **Accessibility:** ARIA requirements and keyboard support

### 13.2 Auto-Generated Docs

`readme.md` files are auto-generated by Stencil from JSDoc comments:

```typescript
/**
 * A button component to easily add styled markup.
 *
 * @element cor-button
 * @slot defaultSlot - the element contents to render. It can be an a or button tag.
 *
 * @cssprop --button-gap - Gap between button content (default: var(--spacing-xs))
 */
@Component({ ... })
```

---

## 14. Version Management

### 14.1 Semantic Versioning

- **Major:** Breaking changes (v1.0.0 → v2.0.0)
- **Minor:** New features, backward compatible (v1.0.0 → v1.1.0)
- **Patch:** Bug fixes (v1.0.0 → v1.0.1)

### 14.2 Changelog

Use Conventional Commits for automatic changelog generation:
- `feat:` → Minor version bump
- `fix:` → Patch version bump
- `feat!:` or `BREAKING CHANGE:` → Major version bump

---

## 15. Quality Assurance

### 15.1 CI/CD Pipeline

- Automated linting (ESLint)
- Automated formatting checks (Prettier)
- Unit test execution (Jest)
- E2E test execution (Puppeteer)
- Build verification
- Storybook deployment

### 15.2 Code Review Standards

- Minimum 2 engineer approvals
- All CI checks must pass
- No merge conflicts
- Squash merge to main branch

---

## Appendix: Key References

- **Stencil Documentation:** https://stenciljs.com
- **Style Dictionary:** https://amzn.github.io/style-dictionary
- **Web Components:** https://developer.mozilla.org/en-US/docs/Web/Web_Components
- **Atomic Design:** https://atomicdesign.bradfrost.com
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref
