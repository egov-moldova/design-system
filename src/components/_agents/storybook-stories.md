# Storybook Stories — CSF3 Pattern, Render Functions, Grid Stories

## Scope

Story file conventions, shared render functions, grid comparison stories, design-token usage in story styling, and Storybook-specific gotchas. **Read when writing `.stories.ts` files.**

Reference implementation: [`src/components/cor-spinner/cor-spinner.stories.ts`](../cor-spinner/cor-spinner.stories.ts) — every example in this guide mirrors that file.

---

## CSF3 Story Pattern (type-safe)

```typescript
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SPINNER_SIZES as SIZES, SPINNER_VARIANTS as VARIANTS } from './cor-spinner.types';
import type { SpinnerSize, SpinnerVariant } from './cor-spinner.types';

type SpinnerArgs = {
  size: SpinnerSize;
  variant: SpinnerVariant;
  label: string;
};

const renderSpinner = (args: SpinnerArgs) => /*html*/ `
  <cor-spinner size="${args.size}" variant="${args.variant}" label="${args.label}"></cor-spinner>
`;

const meta: Meta<SpinnerArgs> = {
  title: 'Atoms/Spinner',
  component: 'cor-spinner',
  argTypes: {
    size: {
      control: 'select',
      options: SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    variant: {
      control: 'select',
      options: VARIANTS,
      description: 'Color treatment.',
      table: { defaultValue: { summary: 'brand' } },
    },
    label: {
      control: 'text',
      description: 'Accessible label announced to screen readers.',
      table: { defaultValue: { summary: 'Loading' } },
    },
  },
};
export default meta;

type Story = StoryObj<SpinnerArgs>;

export const Default: Story = {
  render: renderSpinner,
  args: { size: 'md', variant: 'brand', label: 'Loading' },
};
```

### Story File Rules

- **Title**: `Atoms/CorButton`, `Molecules/CorFormField`, `Organisms/CorNavbar` (Atomic hierarchy)
- **Sort**: `Introduction → Design Tokens → Atoms → Molecules → Organisms → Templates`
- **Import**: `@storybook/web-components-vite` — NOT `@storybook/react`, and NOT the bare `@storybook/web-components` renderer (framework-based config is required since Storybook 10)
- **Component**: string tag `'cor-button'` — NOT JS reference
- **Render**: always use `render` with HTML template strings (backticks)
- **HTML highlight**: `/*html*/` prefix for IDE syntax — e.g., `render: (args: ComponentArgs) => /*html*/ \`...\``
- **Slotted content**: HTML in render — e.g., `<cor-button><button>Label</button></cor-button>`
- **argTypes**: every `@Prop()` MUST have an entry with `control`, `description`, and `table: { defaultValue: { summary: '<TSX default>' } }`. For enum props, also `options: <enum array>`.
- **Type-safe generics**: `Meta<Args>` and `StoryObj<Args>` MUST have the args generic. Bare `Meta` / `StoryObj` resolves to `Meta<any>` / `StoryObj<any>` and silently disables every type check the pattern is supposed to provide.
- **No `/* eslint-disable */`** around the Meta/StoryObj import. With the generics in place, the imports are legitimate uses and ESLint stays quiet on its own. If you find yourself needing the wrapper, you forgot the generic.
- **No `tags: ['autodocs']`** — autodocs is configured globally in `.storybook/main.mjs`. Setting it per-story duplicates the global and can desync.
- **Type unions**: prefer `as const` arrays + `(typeof X)[number]` so the runtime list and type literal stay in sync — declare once in `*.types.ts`, import in stories AND component:
  ```ts
  // cor-spinner.types.ts
  export const SPINNER_SIZES = ['xs', 'sm', 'md', 'lg'] as const;
  export type SpinnerSize = (typeof SPINNER_SIZES)[number];
  ```
  Stories then use `options: SPINNER_SIZES` — no duplicate string array in two files.
- **Web-components type quirk**: use `StoryObj<Args>` directly. **Do NOT** use `StoryObj<typeof meta>` — in `@storybook/web-components-vite@^10.x` it nests `Meta<Args>` into the args slot of `StoryObj`, producing a type that demands `args: Partial<Meta<Args>>` and fails typecheck. (This differs from React/Vue Storybook setups where `StoryObj<typeof meta>` works.)

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
- **Wrapper div**: fixed-width (e.g., `200px`) for consistent screenshots — preview-stability values, not design values, so a raw `px` here is fine (see "Story Styling" below).

---

## Story Styling — Prefer Design Tokens

Inline `style="..."` attributes inside `render` templates should use semantic design tokens (CSS custom properties), not raw values. Semantic tokens auto-adapt between light and dark mode globals; raw values and palette tokens do not.

| ❌ Avoid | ✅ Prefer | Why |
|---|---|---|
| `padding: 16px` | `padding: var(--spacing-16)` | Respects the spacing scale; survives spacing-token refactors |
| `gap: 8px` | `gap: var(--spacing-8)` | Same |
| `background: var(--palette-gray-900)` | `background: var(--color-background-base-inverse-default)` | Semantic tokens adapt to dark mode; palette tokens are mode-locked |
| `background: var(--palette-blue-sky-600)` | `background: var(--color-background-brand-default)` | Same |
| `color: #0058d2` | `color: var(--color-text-brand-default)` | Never hard-code hex in stories |
| `font-size: 12px` | `font-size: var(--font-size-12)` | Respects typography scale |
| `border-radius: 8px` | `border-radius: var(--border-radius-4)` (or matching scale) | Respects radius scale |

**Exceptions** (raw `px` is acceptable):
- **Preview-stability wrappers**: `<div style="width: 200px;">` around a single component to keep screenshot dimensions stable.
- **Grid templates**: `grid-template-columns: 80px repeat(4, 1fr)` where the first column is a fixed label gutter, not a design value.
- **`0` and `1px`** for borders.

Anything else — including paddings, gaps, font sizes, colors, radii, shadows — should use a `var(--...)` token from `dist/design-system/tokens/core.tokens.css`.

When a swatch backdrop must be locked to one mode (e.g., showing a `light` variant on a guaranteed-dark surface regardless of global theme), use the **mode-inverse semantic token**: `var(--color-background-base-inverse-default)`. Never reach for `--palette-*` to achieve mode-locking.

---

## Grid Comparison Stories

Use **CSS grid** for visual comparison matrices:

```typescript
export const AllStatesTable: Story = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: var(--spacing-24); align-items: center; padding: var(--spacing-24);">
      <div style="font-weight: var(--font-weight-semibold);">State</div>
      <div style="font-weight: var(--font-weight-semibold);">Empty</div>
      <div style="font-weight: var(--font-weight-semibold);">Filled</div>

      <div>Default</div>
      <div style="width: 200px;"><cor-component ...>...</cor-component></div>
      <div style="width: 200px;"><cor-component ...>...</cor-component></div>
    </div>
  `,
  parameters: { controls: { disable: true } },
};
```

**Grid rules:**
- **Unique IDs** per instance — prevents duplicate-ID a11y violations
- **Labeled columns** — header row with `font-weight: var(--font-weight-semibold)`
- **Labeled rows** — state/size name in first column
- **Fixed-width cells** — `width: 200px` (preview-stability exception, see above)
- **Spacing via tokens** — `gap: var(--spacing-X)`, `padding: var(--spacing-X)`
- **`parameters: { controls: { disable: true } }`** on non-Default stories so the Controls panel doesn't show irrelevant args.

---

## Documentation Code Generator

For components where the docs panel snippet should reflect live Controls changes, provide a `transform` AND set `type: 'dynamic'`:

```typescript
parameters: {
  docs: {
    source: {
      // Override global `type: 'code'` (set in .storybook/preview.js:113) — that mode
      // caches the snippet at story registration and ignores args changes. `'dynamic'`
      // re-runs the transform whenever Controls change, so the snippet stays in sync.
      type: 'dynamic',
      transform: (_code: string, { args }: { args: SpinnerArgs }) =>
        `<cor-spinner size="${args.size}" variant="${args.variant}" label="${args.label}"></cor-spinner>`,
    },
  },
},
```

**Why `type: 'dynamic'` is required**: `.storybook/preview.js` sets a global `parameters.docs.source.type: 'code'` (around line 113). The `'code'` mode snapshots the rendered output at story registration and never re-runs. Setting `type: 'dynamic'` per-story overrides the global so the `transform` is called on every args change.

**Type the destructure**: `{ args }: { args: ComponentArgs }` — never `{ args }: any` or untyped. The transform is the most common spot for `any` to creep back in.

### Composite stories (grids, `controls: { disable: true }`)

For composite stories that use template-string helpers, `.map(...)` loops, or local style constants in their `render` (e.g. `cellStyle`, `${SERVICES.flatMap(...)}`), the global `'code'` mode captures the **render-function output verbatim** — including the demo chrome (wrapper divs, label spans, inline styles, helper interpolations). That's terrible UX in the "Show code" panel: a consumer who copies it gets the demo, not a usable example.

Override with a static `parameters.docs.source.code` containing the **minimal consumer-ready markup** — one element per line, no wrapper divs, no inline styles:

```ts
const docsSourceAllVariants = VARIANTS.map(
  v => /*html*/ `<cor-component variant="${v}"></cor-component>`,
).join('\n');

export const AllVariants: Story = {
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllVariants } },
  },
  render: () => /*html*/ `<div style="${cellStyle}">…demo grid with labels…</div>`,
};
```

Reference: `src/components/cor-logo/cor-logo.stories.ts` (all 3 stories) and `src/components/cor-service-button/cor-service-button.stories.ts`.

**When you CAN omit `docs.source`**: the render function is already a single clean `<cor-component …></cor-component>` line with no helpers or demo wrappers. In practice this happens only for `Default` — and even Default usually benefits from a `transform` so the snippet reflects live Controls changes.

---

## Common Story-Writing Mistakes

| ❌ Wrong | ✅ Correct | Why |
| --- | --- | --- |
| `import from '@storybook/react'` | `import from '@storybook/web-components-vite'` | This is a Web Components project; React types break shape |
| `/* eslint-disable */` around `Meta, StoryObj` import | drop the wrapper | Wrapper is only needed when the imports are unused — meaning the generic was forgotten |
| `const meta: Meta = { ... }` | `const meta: Meta<Args> = { ... }` | Without the generic, `Meta = Meta<any>` — no type checking |
| `export const Default: StoryObj = { ... }` | `export const Default: Story = { ... }` (with `type Story = StoryObj<Args>`) | Same — bare `StoryObj` is `StoryObj<any>` |
| `type Story = StoryObj<typeof meta>` | `type Story = StoryObj<Args>` | Storybook web-components type quirk — `<typeof meta>` nests `Meta<Args>` into the args slot |
| `render: (args: any) => ...` | `render: (args: ComponentArgs) => ...` | Typed args param is the whole point of the generic |
| `satisfies Meta<typeof Button>` | `const meta: Meta<Args> = { ... }` | `satisfies` + JS-reference form is React-Storybook idiom; web-components use string tags |
| `component: Button` (JS ref) | `component: 'cor-button'` (string tag) | Web components register globally; string tag is what Storybook needs |
| No `render` function | **Always use `render`** with HTML template strings | Storybook can't auto-render web components from args alone |
| `tags: ['autodocs']` on a story | Omit it | Autodocs is configured globally in `.storybook/main.mjs` |
| `argTypes` missing `description` or `table.defaultValue` | Include both | Controls panel needs them; audit-component flags missing entries |
| `Components/Button` title | `Atoms/CorButton` (Atomic hierarchy) | Project Storybook sort order depends on the atomic prefix |
| `<Component {...args} />` JSX spread | `variant="${args.variant}"` (explicit attributes) | Web components consume attribute strings, not React props |
| Inline `padding: 16px` | `padding: var(--spacing-16)` | See "Story Styling" — semantic tokens preferred |
| Inline `background: var(--palette-gray-900)` | `background: var(--color-background-base-inverse-default)` | Palette tokens are mode-locked; semantic tokens adapt |
| `parameters.docs.source.transform` without `type: 'dynamic'` | Add `type: 'dynamic'` | Otherwise the global `type: 'code'` caches the snippet at registration |
| `({ args }: any) =>` in transform | `({ args }: { args: ComponentArgs }) =>` | Type the destructure |
| Grid/composite story with helper-laden render and no `docs.source.code` override | Add `parameters.docs.source.code = <curated multi-line consumer markup>` | Otherwise the "Show code" panel exposes wrapper divs, inline styles, and `${SERVICES.flatMap(…)}` template guts — useless to consumers |
| Missing grid stories | Always: Default, AllVariants, AllSizes (+ States if interactive) | audit-component's `05-story-exports` enforces presence |
