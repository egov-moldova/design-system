# Component Development Guide

## Overview

This guide provides step-by-step instructions and templates for developing new components in the AGE Design System. All components follow the **slot-based architecture** pattern with Stencil.js, Atomic Design principles, and the design token system.

---

## 1. Pre-Development Checklist

Before starting component development:

- [ ] **Component classified** in Atomic Design hierarchy (Atom, Molecule, Organism, Template)
- [ ] **Figma design reviewed** and approved
- [ ] **Design tokens identified** (colors, spacing, typography, etc.)
- [ ] **Accessibility requirements** documented (WCAG 2.1 AA)
- [ ] **Semantic HTML elements** identified for slot-based implementation
- [ ] **Interactive states** defined (default, hover, active, focus, disabled)
- [ ] **Variants and sizes** documented
- [ ] **Browser support requirements** confirmed

---

## 2. Component File Structure

### 2.1 Directory Template

```
src/components/cor-{component-name}/
├── cor-{component-name}.tsx              # Component logic (TypeScript)
├── cor-{component-name}.css              # Component styles (Shadow DOM CSS)
├── cor-{component-name}.enums.ts         # TypeScript enums for variants/sizes
├── cor-{component-name}.constants.ts     # Constants and configuration
├── cor-{component-name}.types.ts         # TypeScript interfaces (optional)
├── cor-{component-name}.stories.ts       # Storybook stories
├── readme.md                             # Auto-generated documentation
└── test/
    ├── cor-{component-name}.spec.tsx     # Unit tests (Jest)
    └── cor-{component-name}.e2e.tsx      # E2E tests (Puppeteer)
```

### 2.2 Token File Structure

```
tokens/core/components/{component-name}.tokens.json    # Component tokens
tokens/age/components/{component-name}.tokens.json  # Client overrides (if needed)
```

---

## 3. Step-by-Step Development Process

### Step 1: Create Component Structure

**Generate component scaffold:**
```bash
yarn generate
# Follow prompts:
# - Component name: cor-{component-name}
# - Select: component
```

This creates the basic file structure. Now customize each file.

---

### Step 2: Define Enums and Constants

**File: `cor-{component-name}.enums.ts`**

```typescript
/**
 * Available variants for the component
 */
export enum ComponentVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  GHOST = 'ghost',
}

/**
 * Available sizes for the component
 */
export enum ComponentSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}
```

**File: `cor-{component-name}.constants.ts`**

```typescript
/**
 * Allowed HTML tags for slotted content
 */
export const COMPONENT_TAGS = ['element1', 'element2'];

/**
 * Default configuration values
 */
export const COMPONENT_DEFAULTS = {
  variant: 'primary',
  size: 'medium',
};
```

---

### Step 3: Define Design Tokens

**File: `tokens/core/components/{component-name}.tokens.json`**

```json
{
  "componentName": {
    "fontFamily": { "value": "{fontFamily.body}", "type": "fontFamily" },
    "fontWeight": { "value": "{fontWeight.medium}", "type": "fontWeight" },
    "fontSize": { "value": "{fontSize.sm}", "type": "dimension" },
    "lineHeight": { "value": "{lineHeight.md}", "type": "dimension" },
    "gap": { "value": "{spacing.xs}", "type": "size" },
    "padding": {
      "x": { "value": "{spacing.md}", "type": "size" },
      "y": { "value": "{spacing.sm}", "type": "size" }
    },
    "borderRadius": { "value": "{radius.md}", "type": "size" },
    "borderWidth": { "value": "{spacing.px}", "type": "size" },
    
    "small": {
      "fontSize": { "value": "{fontSize.xs}", "type": "dimension" },
      "lineHeight": { "value": "{lineHeight.sm}", "type": "dimension" },
      "padding": {
        "x": { "value": "{spacing.sm}", "type": "size" },
        "y": { "value": "{spacing.xs}", "type": "size" }
      }
    },
    
    "medium": {
      "fontSize": { "value": "{fontSize.sm}", "type": "dimension" },
      "lineHeight": { "value": "{lineHeight.md}", "type": "dimension" },
      "padding": {
        "x": { "value": "{spacing.md}", "type": "size" },
        "y": { "value": "{spacing.sm}", "type": "size" }
      }
    },
    
    "large": {
      "fontSize": { "value": "{fontSize.md}", "type": "dimension" },
      "lineHeight": { "value": "{lineHeight.lg}", "type": "dimension" },
      "padding": {
        "x": { "value": "{spacing.lg}", "type": "size" },
        "y": { "value": "{spacing.md}", "type": "size" }
      }
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

**Build tokens:**
```bash
yarn tokens.build
```

---

### Step 4: Implement Component Logic

**File: `cor-{component-name}.tsx`**

```typescript
import { Component, Element, h, Host, Prop } from '@stencil/core';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { ComponentSize, ComponentVariant } from './cor-component-name.enums';
import { COMPONENT_TAGS } from './cor-component-name.constants';

/**
 * Brief component description
 *
 * @element cor-component-name
 * @slot defaultSlot - Description of what HTML elements are expected
 *
 * Base properties:
 * @cssprop --component-font-size - Font size (default: var(--font-size-sm))
 * @cssprop --component-padding-inline - Horizontal padding (default: var(--spacing-md))
 * @cssprop --component-padding-block - Vertical padding (default: var(--spacing-sm))
 * @cssprop --component-border-radius - Border radius (default: var(--radius-md))
 * @cssprop --component-gap - Gap between elements (default: var(--spacing-xs))
 *
 * Size-specific properties:
 * @cssprop --component-{size}-font-size - Font size for specific size
 * @cssprop --component-{size}-padding-inline - Horizontal padding for specific size
 * @cssprop --component-{size}-padding-block - Vertical padding for specific size
 *
 * Variant-specific properties:
 * @cssprop --component-{variant}-default-background - Default background
 * @cssprop --component-{variant}-default-border - Default border
 * @cssprop --component-{variant}-default-color - Default text color
 * @cssprop --component-{variant}-hover-background - Hover background
 * @cssprop --component-{variant}-hover-border - Hover border
 * @cssprop --component-{variant}-hover-color - Hover text color
 * @cssprop --component-{variant}-active-background - Active background
 * @cssprop --component-{variant}-active-border - Active border
 * @cssprop --component-{variant}-active-color - Active text color
 * @cssprop --component-{variant}-focus-background - Focus background
 * @cssprop --component-{variant}-focus-border - Focus border
 * @cssprop --component-{variant}-focus-color - Focus text color
 * @cssprop --component-{variant}-disabled-background - Disabled background
 * @cssprop --component-{variant}-disabled-border - Disabled border
 * @cssprop --component-{variant}-disabled-color - Disabled text color
 */
@Component({
  tag: 'cor-component-name',
  styleUrl: 'cor-component-name.css',
  shadow: true,
})
export class CorComponentName {
  /**
   * Visual variant of the component
   * @default primary
   */
  @Prop({ reflect: true }) variant: string = ComponentVariant.PRIMARY;

  /**
   * Size variant of the component
   * @default medium
   */
  @Prop({ reflect: true }) size: string = ComponentSize.MEDIUM;

  /**
   * Disables the component
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Reference to the host element
   */
  @Element() host: HTMLElement;

  /**
   * Validates slotted content
   */
  private validateSlottedContent(): boolean {
    const tag = this.host.firstElementChild?.tagName?.toLowerCase();
    return COMPONENT_TAGS.includes(tag);
  }

  render() {
    const tag = this.host.firstElementChild?.tagName?.toLowerCase();

    if (!this.validateSlottedContent()) {
      return <Host>{invalidSlottedTag(tag, COMPONENT_TAGS)}</Host>;
    }

    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
```

**Key Patterns:**
- Use `@Prop({ reflect: true })` for attributes used in CSS selectors
- Validate slotted content with `invalidSlottedTag` helper
- Use semantic HTML elements in slot
- Document all CSS custom properties with `@cssprop`

---

### Step 5: Implement Component Styles

**File: `cor-{component-name}.css`**

```css
/*
------------------------------------------------------------------------------------------------------------------------
Component Name CSS
------------------------------------------------------------------------------------------------------------------------
*/

/* Host element base styles */
:host {
  display: inline-block;
}

/* Base slotted content styles */
::slotted(*) {
  /* Layout */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--component-gap, var(--spacing-xs));
  
  /* Typography */
  font-family: var(--component-font-family, var(--font-family-sans));
  font-weight: var(--component-font-weight, var(--font-weight-medium));
  font-size: var(--component-font-size, var(--font-size-sm));
  line-height: var(--component-line-height, var(--line-height-md));
  
  /* Spacing */
  padding: var(--component-padding-block, var(--spacing-sm)) 
           var(--component-padding-inline, var(--spacing-md));
  
  /* Borders */
  border-style: solid;
  border-width: var(--component-border-width, var(--spacing-px));
  border-radius: var(--component-border-radius, var(--radius-md));
  
  /* Interactions */
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.15s ease-in-out,
              border-color 0.15s ease-in-out,
              color 0.15s ease-in-out;
}

/* Disabled state */
::slotted(*:disabled),
::slotted(*[aria-disabled='true']) {
  cursor: not-allowed;
  pointer-events: none;
}

/* Focus state */
::slotted(*:focus-visible:not(:disabled)) {
  outline-width: 2px;
  outline-color: var(--color-secondary-border);
  outline-offset: 3px;
}

/* Size Variants */

:host([size='small']) {
  ::slotted(*) {
    font-size: var(--component-small-font-size, var(--font-size-xs));
    line-height: var(--component-small-line-height, var(--line-height-sm));
    padding: var(--component-small-padding-block, var(--spacing-xs)) 
             var(--component-small-padding-inline, var(--spacing-sm));
    border-radius: var(--component-small-border-radius, var(--radius-sm));
  }
}

:host([size='medium']) {
  ::slotted(*) {
    font-size: var(--component-medium-font-size, var(--font-size-sm));
    line-height: var(--component-medium-line-height, var(--line-height-md));
    padding: var(--component-medium-padding-block, var(--spacing-sm)) 
             var(--component-medium-padding-inline, var(--spacing-md));
    border-radius: var(--component-medium-border-radius, var(--radius-md));
  }
}

:host([size='large']) {
  ::slotted(*) {
    font-size: var(--component-large-font-size, var(--font-size-md));
    line-height: var(--component-large-line-height, var(--line-height-lg));
    padding: var(--component-large-padding-block, var(--spacing-md)) 
             var(--component-large-padding-inline, var(--spacing-lg));
    border-radius: var(--component-large-border-radius, var(--radius-lg));
  }
}

/* Color Variants */

:host([variant='primary']) {
  ::slotted(*:not(:disabled)) {
    background-color: var(--component-primary-default-background);
    border-color: var(--component-primary-default-border);
    color: var(--component-primary-default-color);
  }

  ::slotted(*:hover:not(:disabled)) {
    background-color: var(--component-primary-hover-background);
    border-color: var(--component-primary-hover-border);
    color: var(--component-primary-hover-color);
  }

  ::slotted(*:active:not(:disabled)) {
    background-color: var(--component-primary-active-background);
    border-color: var(--component-primary-active-border);
    color: var(--component-primary-active-color);
  }

  ::slotted(*:focus-visible:not(:disabled)) {
    background-color: var(--component-primary-focus-background);
    border-color: var(--component-primary-focus-border);
    color: var(--component-primary-focus-color);
  }

  ::slotted(*:disabled),
  ::slotted(*[aria-disabled='true']) {
    background-color: var(--component-primary-disabled-background);
    border-color: var(--component-primary-disabled-border);
    color: var(--component-primary-disabled-color);
  }
}

:host([variant='secondary']) {
  ::slotted(*:not(:disabled)) {
    background-color: var(--component-secondary-default-background);
    border-color: var(--component-secondary-default-border);
    color: var(--component-secondary-default-color);
  }

  ::slotted(*:hover:not(:disabled)) {
    background-color: var(--component-secondary-hover-background);
    border-color: var(--component-secondary-hover-border);
    color: var(--component-secondary-hover-color);
  }

  ::slotted(*:active:not(:disabled)) {
    background-color: var(--component-secondary-active-background);
    border-color: var(--component-secondary-active-border);
    color: var(--component-secondary-active-color);
  }

  ::slotted(*:focus-visible:not(:disabled)) {
    background-color: var(--component-secondary-focus-background);
    border-color: var(--component-secondary-focus-border);
    color: var(--component-secondary-focus-color);
  }

  ::slotted(*:disabled),
  ::slotted(*[aria-disabled='true']) {
    background-color: var(--component-secondary-disabled-background);
    border-color: var(--component-secondary-disabled-border);
    color: var(--component-secondary-disabled-color);
  }
}

/* Repeat pattern for other variants: tertiary, ghost, etc. */
```

**CSS Best Practices:**
- Use CSS custom properties with fallbacks
- Follow token hierarchy: component-specific → size-specific → core
- Order states: default → hover → active → focus → disabled
- Use `:not(:disabled)` to prevent state conflicts
- Include transition for smooth interactions

---

### Step 6: Create Storybook Stories

**File: `cor-{component-name}.stories.ts`**

```typescript
import { html } from 'lit-html';
import { ComponentSize, ComponentVariant } from './cor-component-name.enums';
import { COMPONENT_TAGS } from './cor-component-name.constants';

export default {
  title: 'Atoms/Component Name',  // or Molecules/Organisms/Templates
  component: 'cor-component-name',
  argTypes: {
    variant: {
      control: 'select',
      options: Object.values(ComponentVariant),
      description: 'Visual variant of the component',
    },
    size: {
      control: 'select',
      options: Object.values(ComponentSize),
      description: 'Size variant of the component',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the component',
    },
    text: {
      control: 'text',
      defaultValue: 'Component Text',
      description: 'Text content for the component',
    },
    tag: {
      control: 'select',
      options: COMPONENT_TAGS,
      defaultValue: COMPONENT_TAGS[0],
      description: 'HTML element to use in slot',
    },
  },
};

// Default story
export const Default = (args) => html`
  <cor-component-name 
    variant="${args.variant}" 
    size="${args.size}"
    ?disabled="${args.disabled}"
  >
    ${args.tag === 'button' && html`
      <button ?disabled="${args.disabled}">
        ${args.text}
      </button>
    `}
    ${args.tag === 'a' && html`
      <a href="#" ?aria-disabled="${args.disabled}">
        ${args.text}
      </a>
    `}
  </cor-component-name>
`;

Default.args = {
  variant: ComponentVariant.PRIMARY,
  size: ComponentSize.MEDIUM,
  disabled: false,
  text: 'Component Text',
  tag: COMPONENT_TAGS[0],
};

// Variants showcase
export const Variants = () => html`
  <div style="display: flex; gap: 16px; flex-wrap: wrap;">
    ${Object.values(ComponentVariant).map(variant => html`
      <cor-component-name variant="${variant}" size="medium">
        <button>${variant}</button>
      </cor-component-name>
    `)}
  </div>
`;

// Sizes showcase
export const Sizes = () => html`
  <div style="display: flex; gap: 16px; align-items: center;">
    ${Object.values(ComponentSize).map(size => html`
      <cor-component-name variant="primary" size="${size}">
        <button>${size}</button>
      </cor-component-name>
    `)}
  </div>
`;

// States showcase
export const States = () => html`
  <div style="display: flex; gap: 16px;">
    <cor-component-name variant="primary" size="medium">
      <button>Default</button>
    </cor-component-name>
    <cor-component-name variant="primary" size="medium">
      <button disabled>Disabled</button>
    </cor-component-name>
  </div>
`;
```

---

### Step 7: Write Tests

**File: `test/cor-{component-name}.spec.tsx`**

```typescript
import { newSpecPage } from '@stencil/core/testing';
import { CorComponentName } from '../cor-component-name';

describe('cor-component-name', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorComponentName],
      html: `<cor-component-name><button>Test</button></cor-component-name>`,
    });
    expect(page.root).toBeTruthy();
    expect(page.root).toMatchSnapshot();
  });

  it('reflects variant attribute', async () => {
    const page = await newSpecPage({
      components: [CorComponentName],
      html: `<cor-component-name variant="secondary"><button>Test</button></cor-component-name>`,
    });
    expect(page.root.getAttribute('variant')).toBe('secondary');
  });

  it('reflects size attribute', async () => {
    const page = await newSpecPage({
      components: [CorComponentName],
      html: `<cor-component-name size="large"><button>Test</button></cor-component-name>`,
    });
    expect(page.root.getAttribute('size')).toBe('large');
  });

  it('reflects disabled attribute', async () => {
    const page = await newSpecPage({
      components: [CorComponentName],
      html: `<cor-component-name disabled="true"><button>Test</button></cor-component-name>`,
    });
    expect(page.root.getAttribute('disabled')).toBe('true');
  });

  it('validates allowed slotted tags', async () => {
    const page = await newSpecPage({
      components: [CorComponentName],
      html: `<cor-component-name><div>Invalid</div></cor-component-name>`,
    });
    // Should render error message for invalid tag
    expect(page.root.shadowRoot.textContent).toContain('Invalid slotted tag');
  });
});
```

**File: `test/cor-{component-name}.e2e.tsx`**

```typescript
import { newE2EPage } from '@stencil/core/testing';

describe('cor-component-name', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-component-name><button>Test</button></cor-component-name>');
    const element = await page.find('cor-component-name');
    expect(element).toBeTruthy();
  });

  it('applies variant classes', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-component-name variant="secondary"><button>Test</button></cor-component-name>');
    const element = await page.find('cor-component-name');
    expect(element.getAttribute('variant')).toBe('secondary');
  });

  it('handles disabled state', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-component-name disabled="true"><button disabled>Test</button></cor-component-name>');
    const button = await page.find('cor-component-name >>> button');
    expect(await button.getProperty('disabled')).toBe(true);
  });
});
```

---

## 4. Common Component Patterns

### 4.1 Form Input Components

**Key considerations:**
- Support native HTML attributes (name, value, placeholder, required, etc.)
- Emit custom events that match native events
- Support form validation
- Provide label and error message slots

**Example: Input component**

```typescript
@Component({ tag: 'cor-input', shadow: true })
export class CorInput {
  @Prop() variant: string = 'default';
  @Prop() size: string = 'medium';
  @Prop({ reflect: true }) disabled: boolean = false;
  @Prop({ reflect: true }) required: boolean = false;
  @Event() corChange: EventEmitter<string>;
  @Event() corInput: EventEmitter<string>;
  
  render() {
    return (
      <Host>
        <slot name="label" />
        <slot />  {/* Expects <input> */}
        <slot name="error" />
      </Host>
    );
  }
}
```

### 4.2 Container Components

**Key considerations:**
- Flexible layout system
- Responsive behavior
- Spacing controls
- Composition-friendly

**Example: Card component**

```typescript
@Component({ tag: 'cor-card', shadow: true })
export class CorCard {
  @Prop() variant: string = 'default';
  @Prop() padding: string = 'medium';
  @Prop() elevated: boolean = false;
  
  render() {
    return (
      <Host>
        <slot name="header" />
        <slot />  {/* Main content */}
        <slot name="footer" />
      </Host>
    );
  }
}
```

### 4.3 Interactive Components

**Key considerations:**
- Keyboard navigation
- ARIA attributes
- Focus management
- Loading states

**Example: Modal component**

```typescript
@Component({ tag: 'cor-modal', shadow: true })
export class CorModal {
  @Prop({ reflect: true }) open: boolean = false;
  @Prop() size: string = 'medium';
  @Event() corClose: EventEmitter<void>;
  
  @Listen('keydown', { target: 'document' })
  handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && this.open) {
      this.corClose.emit();
    }
  }
  
  render() {
    return (
      <Host aria-modal="true" role="dialog">
        <div class="overlay" onClick={() => this.corClose.emit()} />
        <div class="modal">
          <slot name="header" />
          <slot />
          <slot name="footer" />
        </div>
      </Host>
    );
  }
}
```

---

## 5. Accessibility Checklist

### 5.1 General Requirements

- [ ] **Semantic HTML** preserved through slot-based architecture
- [ ] **Keyboard navigation** fully functional (Tab, Enter, Space, Arrow keys)
- [ ] **Focus indicators** visible (`:focus-visible` styles)
- [ ] **Color contrast** meets WCAG 2.1 AA (4.5:1 for text, 3:1 for UI)
- [ ] **Screen reader** announces all interactive elements
- [ ] **ARIA attributes** used when semantic HTML insufficient
- [ ] **Focus management** for modals and overlays
- [ ] **Disabled states** properly communicated

### 5.2 ARIA Patterns by Component Type

**Buttons:**
- Use native `<button>` or `<a>` tags
- Add `aria-label` for icon-only buttons
- Use `aria-disabled="true"` for disabled links

**Form Inputs:**
- Associate labels with inputs (`<label for="id">`)
- Add `aria-describedby` for error messages
- Use `aria-invalid="true"` for validation errors
- Provide `aria-required="true"` for required fields

**Modals/Dialogs:**
- Use `role="dialog"` and `aria-modal="true"`
- Set `aria-labelledby` to header ID
- Set `aria-describedby` to content ID
- Trap focus within modal when open

**Tabs:**
- Use `role="tablist"`, `role="tab"`, `role="tabpanel"`
- Set `aria-selected` on active tab
- Set `aria-controls` linking tab to panel
- Support Arrow key navigation

---

## 6. Testing Checklist

### 6.1 Unit Tests

- [ ] Component renders with default props
- [ ] All props reflect correctly in attributes
- [ ] Variants render different styles
- [ ] Sizes render different styles
- [ ] Disabled state works correctly
- [ ] Slot validation catches invalid tags
- [ ] Events emit correctly
- [ ] Edge cases handled (empty content, missing props, etc.)

### 6.2 E2E Tests

- [ ] Component renders in browser
- [ ] User interactions work (click, hover, keyboard)
- [ ] Form submissions work (if applicable)
- [ ] Navigation works (if applicable)
- [ ] Responsive behavior correct
- [ ] Theme switching works

### 6.3 Visual Tests

- [ ] All variants visible in Storybook
- [ ] All sizes visible in Storybook
- [ ] All states visible in Storybook
- [ ] Dark theme renders correctly
- [ ] Component looks correct in multiple browsers

---

## 7. Documentation Requirements

### 7.1 Component Documentation

**In TSX file (JSDoc comments):**
- Component purpose and usage
- All props with types and defaults
- All CSS custom properties
- Slot descriptions
- Usage examples

**In readme.md (auto-generated):**
- Component API reference
- Prop table
- CSS custom property table
- Usage examples

### 7.2 Storybook Stories

**Required stories:**
- **Default** - Interactive playground with all controls
- **Variants** - Showcase all visual variants
- **Sizes** - Showcase all size variants
- **States** - Showcase interactive states
- **Examples** - Real-world usage examples
- **Accessibility** - Keyboard navigation and ARIA demo

---

## 8. Build and Validation

### 8.1 Build Commands

```bash
# Build tokens
yarn tokens.build

# Build components
yarn build

# Build with watch mode
yarn build.watch

# Build Storybook
yarn sp.build
```

### 8.2 Validation Commands

```bash
# Run linting
yarn lint

# Run tests
yarn test

# Run E2E tests
yarn test --e2e

# Format code
yarn format
```

### 8.3 Pre-Commit Checklist

- [ ] All tests passing
- [ ] No linting errors
- [ ] Code formatted with Prettier
- [ ] Tokens built and committed
- [ ] Storybook stories created
- [ ] Component documented
- [ ] Accessibility verified
- [ ] Browser testing complete

---

## 9. Review and Approval

### 9.1 Code Review Checklist

**Functionality:**
- [ ] Component works as designed
- [ ] All variants and sizes functional
- [ ] Interactive states work correctly
- [ ] No console errors or warnings

**Code Quality:**
- [ ] Follows project patterns and conventions
- [ ] TypeScript types correct
- [ ] No hard-coded values (uses tokens)
- [ ] No duplicate code
- [ ] Properly commented

**Testing:**
- [ ] Unit tests comprehensive
- [ ] E2E tests cover key interactions
- [ ] All tests passing

**Accessibility:**
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Focus indicators visible

**Documentation:**
- [ ] JSDoc comments complete
- [ ] Storybook stories comprehensive
- [ ] Usage examples provided

### 9.2 Design Review Checklist

- [ ] Matches Figma design
- [ ] Uses correct design tokens
- [ ] Spacing and typography accurate
- [ ] Colors match brand guidelines
- [ ] Responsive behavior correct
- [ ] Dark theme works

---

## 10. Common Pitfalls and Solutions

### 10.1 Slot Validation

**Problem:** Component breaks with invalid slotted content

**Solution:**
```typescript
render() {
  const tag = this.host.firstElementChild?.tagName?.toLowerCase();
  if (!ALLOWED_TAGS.includes(tag)) {
    return <Host>{invalidSlottedTag(tag, ALLOWED_TAGS)}</Host>;
  }
  return <Host><slot /></Host>;
}
```

### 10.2 Token Fallbacks

**Problem:** Token not defined causes style issues

**Solution:**
```css
/* Always provide fallback chain */
font-size: var(
  --component-large-font-size,
  var(--component-font-size, var(--font-size-md))
);
```

### 10.3 State Specificity

**Problem:** Disabled styles override hover/active

**Solution:**
```css
/* Use :not(:disabled) to prevent conflicts */
::slotted(*:hover:not(:disabled)) {
  /* Hover styles */
}
```

### 10.4 Shadow DOM Styling

**Problem:** Can't style slotted content from outside

**Solution:**
```css
/* Use CSS custom properties for theming */
::slotted(button) {
  background: var(--button-custom-background, var(--button-primary-default-background));
}
```

---

## 11. Component Examples

### Example 1: Simple Atom (Badge)

```typescript
// cor-badge.tsx
@Component({ tag: 'cor-badge', shadow: true })
export class CorBadge {
  @Prop({ reflect: true }) variant: string = 'neutral';
  @Prop({ reflect: true }) size: string = 'medium';
  
  render() {
    return (
      <Host>
        <slot />  {/* Expects <span> */}
      </Host>
    );
  }
}
```

### Example 2: Molecule (Search Bar)

```typescript
// cor-search.tsx
@Component({ tag: 'cor-search', shadow: true })
export class CorSearch {
  @Prop() size: string = 'medium';
  @Prop() placeholder: string = 'Search...';
  @Event() corSearch: EventEmitter<string>;
  
  render() {
    return (
      <Host>
        <cor-icon name="carbon:search" size={this.size} />
        <slot />  {/* Expects <input type="search"> */}
        <cor-button variant="ghost" size={this.size}>
          <button type="submit">Search</button>
        </cor-button>
      </Host>
    );
  }
}
```

### Example 3: Organism (Data Table)

```typescript
// cor-table.tsx
@Component({ tag: 'cor-table', shadow: true })
export class CorTable {
  @Prop() variant: string = 'default';
  @Prop() striped: boolean = false;
  @Prop() hoverable: boolean = true;
  
  render() {
    return (
      <Host>
        <slot />  {/* Expects <table> */}
      </Host>
    );
  }
}
```

---

## 12. Quick Reference

### Component File Checklist

```
✓ cor-{name}.tsx          - Component logic
✓ cor-{name}.css          - Styles
✓ cor-{name}.enums.ts     - Enums
✓ cor-{name}.constants.ts - Constants
✓ cor-{name}.stories.ts   - Stories
✓ test/*.spec.tsx         - Unit tests
✓ test/*.e2e.tsx          - E2E tests
✓ tokens/core/components/{name}.tokens.json - Tokens
```

### Development Commands

```bash
yarn generate              # Generate component
yarn tokens.build          # Build design tokens
yarn build.watch           # Build with watch
yarn dev                   # Start Storybook
yarn test                  # Run tests
yarn lint                  # Lint code
yarn format                # Format code
```

### Key Patterns

```typescript
// Props with reflection
@Prop({ reflect: true }) variant: string;

// Slot validation
invalidSlottedTag(tag, ALLOWED_TAGS)

// Event emitters
@Event() corChange: EventEmitter<string>;

// Host element reference
@Element() host: HTMLElement;
```

### CSS Patterns

```css
/* Token usage with fallbacks */
var(--component-specific, var(--component-general, var(--core-token)))

/* Reflected attributes */
:host([variant='primary']) { }

/* Slotted content */
::slotted(*:hover:not(:disabled)) { }

/* State order */
default → hover → active → focus → disabled
```

---

## Appendix: Complete Component Template

See `.specs/templates/` directory for copy-paste component templates.
