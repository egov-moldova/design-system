# TypeScript Strict Mode — All Rules & Patterns

## Scope

All TypeScript strict mode rules for components and stories. **Canonical location — read when writing `.tsx` or `.stories.ts` files.**

## Contents

- Rule 1: Definite Assignment for Decorators (`!` on `@Element`, `@Event`, `@AttachInternals`)
- Rule 2: Story Render Function Types (typed args)
- Rule 3: Explicit `Record<>` for Object Maps
- Rule 4: Nullish Coalescing for Optional Chaining (`?? ''`)
- Rule 5: Optional Props vs Required Props
- Rule 6: Type-Only Imports (`import type`)
- Rule 7: Module Declarations for Untyped Packages
- Pre-Commit Checklist
- Quick Reference

---

## Rule 1: Definite Assignment for Decorators

All Stencil decorator properties MUST use `!` (definite assignment assertion). Stencil initializes at runtime.

```typescript
// ✅ CORRECT
@Element() host!: HTMLElement;
@Event() corChange!: EventEmitter<boolean>;
@AttachInternals() internals!: ElementInternals;

// ❌ WRONG — "Property has no initializer"
@Element() host: HTMLElement;
```

**Applies to**: `@Element()`, `@Event()`, `@AttachInternals()`
**Does NOT apply to**: `@Prop()` / `@State()` with default values, private properties with initializers.

---

## Rule 2: Story Render Function Types

All Storybook render functions MUST type `args` (never leave it implicit).

Prefer a component-specific `Args` type/interface when practical. Use `(args: any)` only as a fallback when typing would be disproportionately complex.

```typescript
// ✅ PREFERRED
type CorButtonArgs = { label: string };
const renderComponent = (args: CorButtonArgs) => /*html*/ `<mud-button>${args.label}</mud-button>`;
export const Default = { render: (args: CorButtonArgs) => /*html*/ `...` };

// ✅ ACCEPTABLE FALLBACK
const renderComponentFallback = (args: any) => /*html*/ `<mud-button>${args.label}</mud-button>`;

// ❌ WRONG — "Parameter 'args' implicitly has an 'any' type"
const renderComponent = args => /*html*/ `...`;
```

---

## Rule 3: Explicit Record<> for Object Maps

Object literals used as maps MUST have `Record<string, T>` type annotations.

```typescript
// ✅ CORRECT
const sizeMap: Record<string, number> = {
  [AvatarSize.SM]: 12,
  [AvatarSize.MD]: 16,
  [AvatarSize.LG]: 20,
};

// ❌ WRONG — implicit type inference
const sizeMap = { [AvatarSize.SM]: 12 };
```

---

## Rule 4: Nullish Coalescing for Optional Chaining

Optional chaining MUST be followed by `??` when a non-nullable value is expected.

```typescript
// ✅ CORRECT
const tag = this.host.firstElementChild?.tagName?.toLowerCase() ?? '';
const value = event.target?.value ?? '';

// ❌ WRONG — "Object is possibly 'undefined'"
const tag = this.host.firstElementChild?.tagName?.toLowerCase();
```

---

## Rule 5: Optional Props vs Required Props

```typescript
@Prop() width?: string | number;                    // ✅ Truly optional — may be undefined
@Prop() size: IconSize = IconSize.SM;                // ✅ Required with default (preferred)
@Prop() name!: string;                               // ✅ Required, no default (rare — avoid if possible)
```

**Prefer default values over `!` for props.**

---

## Rule 6: Type-Only Imports

Use `type` keyword for type-only imports/exports.

```typescript
// ✅ CORRECT
import type { Meta, StoryObj } from '@storybook/web-components-vite';
export type { Components, JSX } from './components';

// ❌ WRONG — imports types as values
import { Meta, StoryObj } from '@storybook/web-components-vite';
```

---

## Rule 7: Module Declarations for Untyped Packages

Create `.d.ts` files in `src/types/` for packages without TypeScript definitions.

```typescript
// src/types/<package-name>.d.ts
declare module '<package-name>';
```

---

## Pre-Commit Checklist

- [ ] All `@Element()` / `@Event()` / `@AttachInternals()` have `!`
- [ ] Story render functions have typed args (`(args: ComponentArgs)` preferred; `(args: any)` allowed)
- [ ] Object maps have `Record<string, T>` annotations
- [ ] Optional chaining uses `?? ''` or `?? fallback`
- [ ] Type-only imports use `import type { ... }`
- [ ] No implicit `any` types (`yarn lint`)
- [ ] Build succeeds (`yarn build`)

## Quick Reference

```typescript
@Element() host!: HTMLElement;
@Event() corChange!: EventEmitter<T>;
@AttachInternals() internals!: ElementInternals;
const render = (args: any) => /*html*/ `...`;
const map: Record<string, number> = { ... };
const tag = el?.tagName?.toLowerCase() ?? '';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
```
