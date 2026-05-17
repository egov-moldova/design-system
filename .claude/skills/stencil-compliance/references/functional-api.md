# Functional Components & Public API

**Aligned with:** Stencil 4.x.

Sections:
- [Functional Components](#functional)
- [Public API surface](#api)

---

## Functional

Reference: <https://stenciljs.com/docs/functional-components>.

Functional components are plain JS functions that return JSX. They are NOT web components — they don't have a custom-element tag, no shadow DOM, no lifecycle, no internal state. They exist purely as a way to reuse JSX markup inside class component `render()` methods.

### When to use

- ✅ Reusable presentation markup: an icon variant, a status badge, a row template
- ✅ Composition helpers within ONE class component or a small set
- ✅ Stateless / props-only rendering

### When NOT to use

- ❌ Anything stateful → use class component (`@Component`)
- ❌ Anything with lifecycle needs → use class component
- ❌ Anything that needs to be usable as a custom-element in HTML → use class component
- ❌ Anything consumed cross-package → publish as class component for proper typing

### Rules

| # | Rule | Verification |
|---|------|--------------|
| FC1 | Function name PascalCase: `MyHelper`, NOT `myHelper` (JSX convention) | Grep |
| FC2 | Type with `FunctionalComponent<Props>`: `const Card: FunctionalComponent<CardProps> = (props, children) => <div>{children}</div>;` | Read TSX |
| FC3 | First arg is `props`, second is `children` (JSX children array) | Read signature |
| FC4 | Third arg is `utils` providing `map(children, fn)` and `forEach(children, fn)` — preferred over direct children access | Read signature |
| FC5 | No `@Component` decorator (it's not a custom element) | Conceptual |
| FC6 | No shadow DOM, no scoped styles — inherits parent's scope | Conceptual |
| FC7 | No lifecycle methods (`componentWillLoad`, etc.) | Conceptual |
| FC8 | No `@State` — pass derived data as props | Conceptual |
| FC9 | DON'T re-export from a barrel index file — Stencil documented limitation (won't resolve dynamic rendering) | Manual review |
| FC10 | Use only WITHIN class component `render()` — not standalone | Manual review |
| FC11 | Co-locate next to the class component that uses it (or in `cor-<name>.partials.tsx` if reused across stories) | Manual review |

### Example

```tsx
import { FunctionalComponent, h } from '@stencil/core';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error';
  label: string;
}

// ✅ Functional component
export const Badge: FunctionalComponent<BadgeProps> = ({ variant = 'success', label }) => (
  <span class={`badge badge--${variant}`}>{label}</span>
);

// ✅ With children + utils
interface CardProps { title: string; }

export const Card: FunctionalComponent<CardProps> = ({ title }, children, utils) => (
  <div class="card">
    <h3 class="card__title">{title}</h3>
    <div class="card__body">{utils.map(children, child => child)}</div>
  </div>
);
```

Usage in a class component:

```tsx
@Component({ tag: 'cor-widget', shadow: true })
export class CorWidget {
  render() {
    return (
      <Host>
        <Badge variant="success" label="OK" />
        <Card title="Hello">
          <p>Body</p>
        </Card>
      </Host>
    );
  }
}
```

### Anti-patterns

```tsx
// ❌ Lowercase name — JSX treats it as native tag
const myHelper = (props) => <div>{props.label}</div>;

// ❌ Re-exporting from barrel breaks Stencil
// index.ts
export * from './my-helper';  // ← functional component won't work via dynamic rendering

// ❌ Trying to use state
const Counter = (props) => {
  const [count, setCount] = useState(0);  // ← React hook, doesn't exist in Stencil
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

### Project-specific extras

- The repo has very few functional components — most reuse happens via shared utilities (`src/utils/`) or pure render helpers (`getHostClasses()`, `getIconSizeVar()`).
- If you find yourself reaching for a functional component, first check whether a simple template literal or shared util suffices.

---

## API

Reference: <https://stenciljs.com/docs/api>.

The public Stencil API surface — what you can import from `@stencil/core` and friends.

### Decorators

```ts
import {
  Component,           // class decorator — declares the custom element
  Prop,                // public property → HTML attribute
  State,               // internal reactive state
  Element,             // host element reference
  Method,              // async public method
  Event, EventEmitter, // custom event emitter
  Listen,              // DOM event listener
  Watch,               // property/state change reaction
  AttachInternals,     // ElementInternals (form-associated, Custom States)
  PropSerialize,       // property → attribute serializer
  AttrDeserialize,     // attribute → property deserializer
} from '@stencil/core';
```

### Lifecycle hooks (instance methods, not imports)

```
connectedCallback()
disconnectedCallback()
componentWillLoad()
componentDidLoad()
componentShouldUpdate(newValue, oldValue, propName): boolean
componentWillRender()
componentDidRender()
componentWillUpdate()
componentDidUpdate()
render()
componentOnReady()    // exists on the element instance — for consumers
```

### Utility functions

```ts
import {
  h,             // JSX factory — converts <div /> into virtual DOM
  Fragment,      // group children without wrapper
  Host,          // functional component for setting host attributes
  forceUpdate,   // manually trigger a re-render (rare)
  readTask,      // schedule a DOM read in the next frame
  writeTask,     // schedule a DOM write in the next frame
  getAssetPath,  // resolve a path relative to assetsDirs
  setAssetPath,  // configure asset base path at runtime
  setMode,       // set component style mode (rare; project uses CSS variables)
  getMode,       // read component style mode
  getElement,    // get the host element from a `this` reference (rare)
} from '@stencil/core';
```

### Testing utilities

```ts
import { newSpecPage } from '@stencil/core/testing';    // unit tests
import { newE2EPage }  from '@stencil/core/testing';    // E2E tests (Puppeteer)
```

### Rules

| # | Rule | Verification |
|---|------|--------------|
| API1 | Import ONLY from `@stencil/core` and `@stencil/core/testing` — never deep paths (`@stencil/core/internal/...`) | Grep imports |
| API2 | Use `readTask()` for DOM reads that should batch in the next animation frame | Manual review |
| API3 | Use `writeTask()` for DOM writes that should batch | Manual review |
| API4 | `componentOnReady()` is CALLED BY CONSUMERS on the element instance — you don't override it | Conceptual |
| API5 | `forceUpdate()` only for: (a) watching native attributes, (b) external imperative state changes | Grep |
| API6 | `getAssetPath('img.svg')` if you declared `assetsDirs: ['assets']` in `@Component` — never hardcode `/assets/...` paths | Pair grep |
| API7 | `setAssetPath('/custom/base/')` only in consumer apps, not in components | Manual review |
| API8 | `setMode()`/`getMode()` — only if using style mode strings (this repo does NOT) | Conceptual |
| API9 | `getElement(this)` is legacy — use `@Element() host` instead | Grep |
| API10 | `Fragment` for "group without wrapper" — NOT for setting host attributes (that's `<Host>`) | Manual review |
| API11 | `EventEmitter` is a TYPE imported alongside `Event` — usage is purely typed (no runtime new) | Read TSX |
| API12 | Stencil 4 exposes additional types via TS: `FunctionalComponent`, `JSX.IntrinsicElements`, generated `HTMLCorXElement` | Use as needed |
| API13 | Don't import from `@stencil/core/internal/...` — internal, unstable across versions | Grep |
| API14 | `newSpecPage` and `newE2EPage` are testing-only imports; never used at runtime | Read imports |

### `readTask` / `writeTask` example

```ts
import { readTask, writeTask } from '@stencil/core';

componentDidLoad() {
  // ✅ Schedule a DOM read
  readTask(() => {
    const rect = this.host.getBoundingClientRect();
    // schedule a DOM write
    writeTask(() => {
      this.tooltipElement.style.top = `${rect.bottom + 8}px`;
    });
  });
}
```

This prevents layout thrashing by batching reads and writes into separate animation-frame phases.

### `componentOnReady()` usage (consumer side)

```ts
const el = document.querySelector('cor-input') as HTMLCorInputElement;
await el.componentOnReady();    // resolves after first render
await el.focus();                // safe to call public @Method now
```

Document this in JSDoc `@example` blocks for components with `@Method`s.

### Anti-patterns

```ts
// ❌ Deep import path
import { something } from '@stencil/core/internal/utils';

// ❌ Hardcoded asset path (loses cross-bundle compatibility)
<img src="/assets/icon.svg" />
// ✅ Right
<img src={getAssetPath('icon.svg')} />

// ❌ Using getElement(this) instead of @Element()
import { getElement } from '@stencil/core';
const host = getElement(this);

// ✅ Right
@Element() host!: HTMLCorXElement;
```

### Project-specific extras

- The repo does NOT use Stencil style modes — use CSS variables and `data-theme="dark"` instead.
- `readTask`/`writeTask` are useful but rarely used in this codebase; most layout is handled via CSS Grid / Flex.
- `getAssetPath` is used for the SVG sprite path in `cor-icon` (see `src/assets/`).
