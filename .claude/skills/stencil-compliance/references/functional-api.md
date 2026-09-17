# Functional Components & Public API

Load when writing a functional component or importing anything from `@stencil/core`.
`enforced-by` grammar: [`decorators.md`](decorators.md).

Sections:

- [Functional Components](#functional)
- [Public API](#public-api)

---

## Functional

Reference: <https://stenciljs.com/docs/functional-components>.

A functional component is a function that returns JSX. It is not a custom element: no tag, no
shadow root, no lifecycle, no state. It reuses markup inside a class component's `render()`. No
component in this repo uses one today (`grep -rn FunctionalComponent src/components` → 0).

| #   | Rule                                                                                                                   | enforced-by                     |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| FC1 | PascalCase name — JSX treats a lowercase name as a native tag                                                          | `manual`                        |
| FC2 | Typed as `FunctionalComponent<Props>`; the arguments are `(props, children, utils)`                                   | `manual`                        |
| FC3 | Children are walked with `utils.map` / `utils.forEach`, not by reading `VNode` fields                                   | `manual`                        |
| FC4 | Stateful, lifecycle-bound or HTML-consumable UI is a class component instead                                            | `manual`                        |
| FC5 | A component file exports only its class (type-only exports are allowed); a functional component lives in its own file | `eslint:@stencil/single-export` |

```tsx
import { FunctionalComponent, h } from '@stencil/core';

interface CardProps {
  heading: string;
}

export const Card: FunctionalComponent<CardProps> = ({ heading }, children, utils) => (
  <div class="card">
    <h3 class="card__heading">{heading}</h3>
    <div class="card__body">{utils.map(children, child => child)}</div>
  </div>
);
```

```tsx
// ❌ Lowercase — rendered as an unknown native element
const cardHelper = (props: CardProps) => <div>{props.heading}</div>;

// ❌ React hooks do not exist in Stencil
const Counter = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

---

## Public API

Reference: <https://stenciljs.com/docs/api>. Tests import from `@stencil/vitest`, never from
`@stencil/core/testing` — see [`TESTING.md`](../../../../TESTING.md).

| #    | Rule                                                                                                                                                   | enforced-by                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| API1 | Component code imports from `@stencil/core`, never from `@stencil/core/internal/…` (only `stencil.config.ts` does, for the `Config` type that declares `buildDocs`) | `manual`                                |
| API3 | Asset URLs come from `getAssetPath()`, never a hard-coded `/assets/…` path                                                                             | `manual`                                |
| API4 | `setAssetPath()` belongs to consumer apps and tests, not components                                                                                    | `manual`                                |
| API5 | Batched DOM reads and writes go through `readTask()` / `writeTask()`                                                                                   | `manual`                                |
| API6 | Consumers call `componentOnReady()` on the element; components never override it                                                                       | `manual`                                |

No `forceUpdate()`: [`lifecycle-host.md` LC6](lifecycle-host.md#lifecycle).

The automatic JSX runtime entry `@stencil/core/jsx-runtime` exists, but this project compiles JSX
with the `h` pragma (`tsconfig.json` `jsxFactory`), so it is not used.

### Public API

| Name                  | Kind                                  | Use here                                                            |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `Config`              | type (compiler config)                | `stencil.config.ts` imports the internal `Config` instead           |
| `PrerenderConfig`     | type (compiler config)                | unused                                                              |
| `ChildNode`           | type (functional-component child)     | unused                                                              |
| `ComponentDidLoad`    | type (lifecycle interface)            | unused                                                              |
| `ComponentDidUpdate`  | type (lifecycle interface)            | unused                                                              |
| `ComponentInterface`  | type (lifecycle interface)            | unused                                                              |
| `ComponentOptions`    | type (`@Component` options)           | unused                                                              |
| `ComponentWillLoad`   | type (lifecycle interface)            | unused                                                              |
| `ComponentWillUpdate` | type (lifecycle interface)            | unused                                                              |
| `EventEmitter`        | type                                  | every `@Event()` field                                              |
| `EventOptions`        | type (`@Event` options)               | unused                                                              |
| `FunctionalComponent` | type                                  | unused                                                              |
| `FunctionalUtilities` | type (`map` / `forEach` over children) | unused                                                             |
| `JSX`                 | type namespace                        | generated `src/components.d.ts`                                     |
| `ListenOptions`       | type (`@Listen` options)              | unused                                                              |
| `ListenTargetOptions` | type (`@Listen` target)               | unused                                                              |
| `MethodOptions`       | type (`@Method` options)              | unused                                                              |
| `ModeStyles`          | type (style modes)                    | unused                                                              |
| `PropOptions`         | type (`@Prop` options)                | unused                                                              |
| `QueueApi`            | type (task queue)                     | unused                                                              |
| `RafCallback`         | type (`readTask` / `writeTask` callback) | unused                                                           |
| `VNode`               | type                                  | unused                                                              |
| `VNodeData`           | type                                  | unused                                                              |
| `AttrDeserialize`     | decorator (4.38)                      | unused                                                              |
| `PropSerialize`       | decorator (4.38)                      | unused                                                              |
| `AttachInternals`     | decorator                             | form-associated components                                          |
| `Build`               | build-conditionals object             | unused                                                              |
| `Component`           | decorator                             | every component                                                     |
| `Element`             | decorator                             | host references                                                     |
| `Env`                 | object (`env` from `stencil.config.ts`) | unused                                                            |
| `Event`               | decorator                             | custom events                                                       |
| `forceUpdate`         | function                                  | forbidden in components (`ANTIPATTERN-013-FORCEUPDATE`)         |
| `Fragment`            | functional component                  | unused                                                              |
| `getAssetPath`        | function                              | `mud-icon` and `mud-logo` providers                                 |
| `getElement`          | function                              | unused — `@Element()` is the project form                           |
| `getMode`             | function (style modes)                | unused                                                              |
| `getRenderingRef`     | function                              | unused                                                              |
| `h`                   | JSX factory                           | every component                                                     |
| `Host`                | functional component                  | every component's `render()` root                                   |
| `Listen`              | decorator                             | DOM listeners                                                       |
| `Method`              | decorator                             | public methods                                                      |
| `MixedInCtor`         | type (mixins, 4.37)                   | unused                                                              |
| `Mixin`               | function (mixins, 4.37)               | not adopted                                                         |
| `MixinFactory`        | type (mixins, 4.37)                   | unused                                                              |
| `Prop`                | decorator                             | public props                                                        |
| `readTask`            | function (batched DOM read)           | unused                                                              |
| `render`              | function (render a VNode into a container) | unused                                                         |
| `resolveVar`          | compile-time function (constant names in `@Listen` / `@Event`) | unused                                     |
| `setAssetPath`        | function                              | spec tests                                                          |
| `setErrorHandler`     | function (global render/lifecycle error handler) | unused                                                   |
| `setMode`             | function (style modes)                | unused                                                              |
| `setNonce`            | function (CSP nonce for injected tags) | unused                                                             |
| `setPlatformHelpers`  | function                              | unused                                                              |
| `setTagTransformer`   | function (rename defined tags)        | unused                                                              |
| `State`               | decorator                             | internal state                                                      |
| `transformTag`        | function (apply the tag transformer)  | unused                                                              |
| `Watch`               | decorator                             | watchers                                                            |
| `writeTask`           | function (batched DOM write)          | unused                                                              |

The table mirrors `node_modules/@stencil/core/internal/stencil-core/index.d.ts` both ways; the skill
parity spec fails when an upgrade adds or removes an export.
