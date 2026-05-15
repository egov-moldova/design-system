# Storybook Stories — CSF3 Pattern, Render Functions, Grid Stories

## Scope

Story file conventions, shared render functions, grid comparison stories, and storybook skill corrections. **Read when writing stories.**

---

## CSF3 Story Pattern

```typescript
/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { ComponentSize, ComponentVariant } from './cor-component.enums';

const meta: Meta = {
  title: 'Atoms/CorComponent',
  component: 'cor-component',
  argTypes: {
    variant: { control: 'select', options: Object.values(ComponentVariant), description: 'Visual variant' },
    size:    { control: 'select', options: Object.values(ComponentSize), description: 'Component size' },
    disabled:{ control: 'boolean', description: 'Disables the component' },
  },
  render: renderComponent,
  parameters: {
    docs: { source: { transform: (_src, ctx) => generateDocumentationCode(ctx.args) } },
  },
};
export default meta;

export const Default: StoryObj = { args: { variant: 'primary', size: 'lg' } };
export const AllVariants: StoryObj = { render: () => /*html*/ `...` };
export const AllSizes: StoryObj = { render: () => /*html*/ `...` };
export const States: StoryObj = { render: () => /*html*/ `...` };
```

### Story File Rules

- **Title**: `Atoms/CorButton`, `Molecules/CorFormField`, `Organisms/CorNavbar`
- **Sort**: `Introduction → Design Tokens → Atoms → Molecules → Organisms → Templates`
- **Import**: `@storybook/web-components` — NOT `@storybook/react`
- **Component**: string tag `'cor-button'` — NOT JS reference
- **Render**: always use `render` with HTML template strings (backticks)
- **HTML highlight**: `/*html*/` prefix for IDE syntax — e.g., `render: (args: ComponentArgs) => /*html*/ \`...\``
- **Slotted content**: HTML in render — e.g., `<cor-button><button>Label</button></cor-button>`
- **argTypes**: always include `description`; use `Object.values(Enum)` for select

---

## Shared Render Function

Extract when 3+ stories share the same template:

```typescript
type ComponentArgs = {
  disabled: boolean;
  leftIconName?: string;
  size: string;
};

const renderComponent = (args: ComponentArgs) => {
  const disabled = args.disabled ? 'disabled' : '';  // ✅ '' not 'false'
  const leftIcon = args.leftIconName
    ? /*html*/ `<cor-icon slot="icon-left" name="${args.leftIconName}" color="currentColor"></cor-icon>`
    : '';

  return /*html*/ `
    <div style="width: 200px;">
      <cor-component size="${args.size}" ${disabled}>
        ${leftIcon}
        <slot-content>...</slot-content>
      </cor-component>
    </div>
  `;
};
```

**Key rules:**
- **Boolean → attribute**: `args.disabled ? 'disabled' : ''` — never `disabled="${args.disabled}"`
- **Conditional slots**: only render when arg has value
- **Wrapper div**: fixed-width (e.g., `200px`) for consistent screenshots

---

## Grid Comparison Stories

Use **CSS grid** for visual comparison matrices:

```typescript
export const AllStatesTable: StoryObj = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 24px; align-items: center;">
      <div style="font-weight: 600;">State</div>
      <div style="font-weight: 600;">Empty</div>
      <div style="font-weight: 600;">Filled</div>

      <div>Default</div>
      <div style="width: 200px;"><cor-component ...>...</cor-component></div>
      <div style="width: 200px;"><cor-component ...>...</cor-component></div>
    </div>
  `,
};
```

**Grid rules:**
- **Unique IDs** per instance — prevents duplicate-ID a11y violations
- **Labeled columns** — header row with `font-weight: 600`
- **Labeled rows** — state/size name in first column
- **Fixed-width cells** — `width: 200px`

---

## Documentation Code Generator

For 3+ slots, add clean docs panel output:

```typescript
const generateDocumentationCode = (args: any) => {
  const attributes = [`size="${args.size}"`];
  if (args.disabled) attributes.push('disabled');
  return `<cor-component\n  ${attributes.join('\n  ')}\n>...</cor-component>`;
};
```

Set in meta: `parameters: { docs: { source: { transform: (_src, ctx) => generateDocumentationCode(ctx.args) } } }`

---

## Common Story-Writing Mistakes (Web Components vs React)

| Skill Says | Correct |
| --- | --- |
| `import from '@storybook/react'` | `import from '@storybook/web-components'` |
| `satisfies Meta<typeof Button>` | `const meta: Meta = { ... }` (string tag names) |
| `component: Button` (JS ref) | `component: 'cor-button'` (string) |
| No `render` function | **Always use `render`** with HTML template strings |
| `Components/Button` title | `Atoms/CorButton` (Atomic hierarchy) |
| `<Component {...args} />` | `variant="${args.variant}"` (explicit attributes) |
| Missing grid stories | Always: Default, AllVariants, AllSizes, States |
