---
name: stencil-compliance
description: Use when designing, implementing, auditing, or modifying any `mud-*` Stencil component to ensure conformance with Stencil best practices at the pinned version. Covers @Component decorator options, @Prop/@State/@Event/@Listen/@Method/@Watch decorators, lifecycle hooks, Host element + @Element(), JSX/templating, shadow DOM styling, form-associated custom elements, reactive data, serialization, functional components, and public API surface. Required reference for all `mud-*` components. NOT `audit-component` (that is the whole production audit and calls this skill for Stencil rules). NOT `token-creation` (token and colour rules). NOT `accessibility-compliance` (WCAG).
---

# Stencil Compliance

Checks one `mud-*` component against the Stencil rules of the pinned version
([`references/version-delta.md`](references/version-delta.md)). Scripts and linters decide every rule
they can; you judge only the `manual` rows of the [rule index](#rule-index).

Project overlays in [`src/components/AGENTS.md`](../../../src/components/AGENTS.md) and
[`src/components/_agents/component-structure.md`](../../../src/components/_agents/component-structure.md)
(`mud-` prefix, member order, `@Watch` rule, host classes) win over Stencil's docs, whether stricter or looser.

## Run contract

Input: one component name (`mud-<name>`).

1. Run the scripts:
   `node scripts/audit/run-all.mjs <component> --only 02,04,14,16 --json --out <scratch>/stencil.json`
2. Read the envelope. Quote each script's `summary` counts (`results[].summary`) in the report — a report
   without them did not run step 1. Script 14 contributes only its own findings (e.g. a file with no
   component class); its extracted contract is not in the combined envelope.
3. When the change touched TSX or CSS, run `yarn lint` and keep the output for the component's files; when
   it did not, the `eslint:`/`stylelint:` rows are covered by the CI lint gate — say so in the report.
   For a form-associated component (`grep -l "formAssociated: true" <component tsx>` matches — the
   combined `run-all` envelope does not carry the contract), also run
   `node --test scripts/__tests__/form-associated-contract.spec.mjs`.
4. Judge only the `manual` rows of the rule index against the component source, loading the reference
   each row links.
5. Report: script findings grouped by code; then manual findings as `file:line — rule id — why`; then
   "not checked" with a reason for each skipped row.

`script-16` is report-only: its findings are real but do not fail CI. Fixes for Stencil codes:
[`references/anti-patterns.md`](references/anti-patterns.md); project codes (tokens, colours, raw pixels, icons,
`innerHTML`, `any`) carry their fix in the finding, with the rules in
[`_agents/anti-patterns.md`](../../../_agents/anti-patterns.md).

## Rule index

One row per rule kept in the references. `enforced-by` is exactly one of `compiler`, `tsc`,
`eslint:<rule id>`, `stylelint:<rule id>`, `script-02:<code>`, `script-04:<code>`, `script-16:<code>`,
`manual`. Only `manual` rows link a reference; automated rows name the code their tool emits.

| Area | Rule | enforced-by | Code or reference |
| --- | --- | --- | --- |
| @Component | C1: `tag` is required, contains `-`, and is globally unique | `compiler` | — |
| @Component | C2: `tag` starts with `mud-` (project overlay) | `manual` | [decorators C2](references/decorators.md#component) |
| @Component | C3: Shadow DOM is enabled: `shadow: true` or an options object such as `shadow: { delegatesFocus: true }`. Both are accepted; never `scoped: true` | `script-16:STENCIL-SHADOW-REQUIRED` | `STENCIL-SHADOW-REQUIRED` |
| @Component | C4: `shadow` and `scoped` are mutually exclusive | `compiler` | — |
| @Component | C5: `styleUrl` (one CSS file) is the default for `mud-*` | `manual` | [decorators C5](references/decorators.md#component) |
| @Component | C6: `styleUrls` only when several stylesheets are needed; the project themes with CSS custom properties, not Stencil modes | `manual` | [decorators C6](references/decorators.md#component) |
| @Component | C7: `styles` (inline string) only for tests or scaffolding, and pure CSS | `manual` | [decorators C7](references/decorators.md#component) |
| @Component | C8: `assetsDirs: ['assets']` only when the component bundles static assets, read through `getAssetPath()` | `manual` | [decorators C8](references/decorators.md#component) |
| @Component | C9: `shadow: { delegatesFocus: true }` on components that wrap a focusable control, so focusing the host focuses it | `manual` | [decorators C9](references/decorators.md#component) |
| @Component | C10: `shadow: { slotAssignment: 'manual' }` only for components that assign slots imperatively | `manual` | [decorators C10](references/decorators.md#component) |
| @Prop | P1: Props that drive styling use `reflect: true` so `:host([variant='primary'])` selectors match | `manual` | [decorators P1](references/decorators.md#prop) |
| @Prop | P2: A prop the component itself assigns declares `mutable: true` | `manual` | [decorators P2](references/decorators.md#prop) |
| @Prop | P3: No `mutable: true` on a prop the component never assigns | `manual` | [decorators P3](references/decorators.md#prop) |
| @Prop | P5: `attribute: 'custom-name'` only when the default kebab-case name is wrong | `manual` | [decorators P5](references/decorators.md#prop) |
| @Prop | P6: Optional props use `?`: `@Prop() width?: string;` | `manual` | [decorators P6](references/decorators.md#prop) |
| @Prop | P7: A prop with neither a default nor `?` needs `!` under `strict` | `tsc` | — |
| @Prop | P8: On a form-associated component, a boolean prop does not default to `true`: a string `"false"` assigned to the property parses as `true` there, so a consumer that sets the property from a template string cannot turn it off (HTML attributes are coerced to a boolean first) | `script-16:STENCIL-FORM-BOOLEAN-DEFAULT-TRUE` | `STENCIL-FORM-BOOLEAN-DEFAULT-TRUE` |
| @Prop | P9: Enum props import their values from `mud-<name>.enums.ts` or a union type | `manual` | [decorators P9](references/decorators.md#prop) |
| @Prop | P10: Every `@Prop()` has JSDoc | `script-04:JSDOC-PROP-MISSING` | `JSDOC-PROP-MISSING` |
| @Prop | P11: Public members do not use names `HTMLElement` already declares (`ariaLabel`, `title`, …); renaming the existing ones is tracked in [#88](https://github.com/egov-moldova/design-system/issues/88) | `manual` | [decorators P11](references/decorators.md#prop) |
| @Prop | P12: Props are public (no `private`/`protected` modifier) | `eslint:@stencil/props-must-be-public` | — |
| @Prop | P13: Prop names are camelCase; the attribute is derived as kebab-case | `manual` | [decorators P13](references/decorators.md#prop) |
| @Prop | P14: A prop with a default documents it with `@default` | `script-04:JSDOC-PROP-DEFAULT-TAG` | `JSDOC-PROP-DEFAULT-TAG` |
| @State | S1: `@State()` only for values that change render output | `manual` | [decorators S1](references/decorators.md#state) |
| @State | S2: Refs, timers and IDs are plain fields, never `@State()` | `manual` | [decorators S2](references/decorators.md#state) |
| @State | S3: A value `render()` can compute is not stored in state | `manual` | [decorators S3](references/decorators.md#state) |
| @State | S4: Arrays are reassigned, never mutated in place (`push`, `splice`, `sort`, …) | `script-02:ANTIPATTERN-005-ARRAY-MUTATION` | `ANTIPATTERN-005-ARRAY-MUTATION` |
| @State | S7: State is not exposed to consumers; use a `@Prop` or an `@Event` | `manual` | [decorators S7](references/decorators.md#state) |
| @State | S8: Every `@State()` has an initial value (or `!`) under `strict` | `tsc` | — |
| @Event / @Listen | E1: Event fields are `mud` + PascalCase (`mudChange`, `mudAccordionToggle`) | `script-02:ANTIPATTERN-025-EVENT-PREFIX` | `ANTIPATTERN-025-EVENT-PREFIX` |
| @Event / @Listen | E2: Typed payload: `EventEmitter<Payload>`, never bare `EventEmitter` | `script-02:ANTIPATTERN-004-EVENTEMITTER-UNTYPED` | `ANTIPATTERN-004-EVENTEMITTER-UNTYPED` |
| @Event / @Listen | E3: `!` on the field: `@Event() mudChange!: EventEmitter<string>;` | `tsc` | — |
| @Event / @Listen | E4: Defaults are `bubbles: true, composed: true, cancelable: true`; override only with a reason | `manual` | [decorators E4](references/decorators.md#event--listen) |
| @Event / @Listen | E5: Events consumers listen to stay `composed: true`, so they cross the shadow boundary | `manual` | [decorators E5](references/decorators.md#event--listen) |
| @Event / @Listen | E6: A cancelable event checks `emit(...).defaultPrevented` before acting | `manual` | [decorators E6](references/decorators.md#event--listen) |
| @Event / @Listen | E7: Payload types live in `mud-<name>.types.ts` | `manual` | [decorators E7](references/decorators.md#event--listen) |
| @Event / @Listen | L1: `@Listen('click')` listens on the host; `{ target: 'window' \| 'document' \| 'body' }` for global targets | `manual` | [decorators L1](references/decorators.md#event--listen) |
| @Event / @Listen | L2: Listeners are removed on disconnect by the runtime — no manual `removeEventListener` for `@Listen` | `manual` | [decorators L2](references/decorators.md#event--listen) |
| @Event / @Listen | L3: `scroll`, `wheel` and `touch*` listeners default to `passive: true` unless the option says otherwise | `compiler` | — |
| @Event / @Listen | L4: `{ capture: true }` only when the capture phase is needed | `manual` | [decorators L4](references/decorators.md#event--listen) |
| @Event / @Listen | L5: Prefer a JSX handler (`onClick={…}`) on an internal element over `@Listen` | `manual` | [decorators L5](references/decorators.md#event--listen) |
| @Method | M1: Every `@Method()` is `async` or returns `Promise<T>` | `eslint:@stencil/async-methods` | — |
| @Method | M2: `@Method()` members are public | `eslint:@stencil/methods-must-be-public` | — |
| @Method | M3: Prefer `@Prop` (data in) and `@Event` (data out); a method is for imperative actions (`focus()`, `reset()`) | `manual` | [decorators M3](references/decorators.md#method) |
| @Method | M4: More than two `@Method()` on one component is a smell | `manual` | [decorators M4](references/decorators.md#method) |
| @Method | M5: Every public method has JSDoc with `@returns` | `manual` | [decorators M5](references/decorators.md#method) |
| @Method | M6: A method mirroring a built-in (`focus`, `blur`) keeps its name and signature | `manual` | [decorators M6](references/decorators.md#method) |
| @Element | EL1: Typed with the generated element interface: `@Element() host!: HTMLMudBadgeElement;` | `eslint:@stencil/element-type` | — |
| @Element | EL2: `!` on the field | `tsc` | — |
| @AttachInternals | AI2: `!` on the field: `@AttachInternals() internals!: ElementInternals;` | `tsc` | — |
| Lifecycle | LC1: A component using `setInterval`, `setTimeout`, `addEventListener`, `ResizeObserver`, `MutationObserver` or `IntersectionObserver` cleans up in `disconnectedCallback()` | `script-02:ANTIPATTERN-007-LIFECYCLE-LEAK` | `ANTIPATTERN-007-LIFECYCLE-LEAK` |
| Lifecycle | LC2: `connectedCallback` runs on every re-attach; one-time setup is guarded or lives in `componentWillLoad` | `manual` | [lifecycle-host LC2](references/lifecycle-host.md#lifecycle) |
| Lifecycle | LC3: A Promise returned from `componentWillLoad` delays the first render until it settles — only for data the first paint needs | `manual` | [lifecycle-host LC3](references/lifecycle-host.md#lifecycle) |
| Lifecycle | LC4: `componentDidUpdate` guards every state write (`if (this.x !== next) this.x = next;`) | `manual` | [lifecycle-host LC4](references/lifecycle-host.md#lifecycle) |
| Lifecycle | LC5: No `componentShouldUpdate` — fix the reactivity instead | `script-02:ANTIPATTERN-014-SHOULDUPDATE` | `ANTIPATTERN-014-SHOULDUPDATE` |
| Lifecycle | LC6: No `forceUpdate()` — it masks a reactivity bug | `script-02:ANTIPATTERN-013-FORCEUPDATE` | `ANTIPATTERN-013-FORCEUPDATE` |
| Lifecycle | LC7: Light-DOM children present in the markup are readable in `componentWillLoad`; children appended after load reach the component only through `slotchange` | `manual` | [lifecycle-host LC7](references/lifecycle-host.md#lifecycle) |
| Lifecycle | LC8: Consumer code awaits `el.componentOnReady()` before calling a `@Method` | `manual` | [lifecycle-host LC8](references/lifecycle-host.md#lifecycle) |
| Host | H1: `render()` returns `<Host>` at its root | `eslint:@stencil/render-returns-host` | — |
| Host | H2: Host classes are declarative (`<Host class={hostClasses}>`), never `this.host.classList.add/remove` | `script-02:ANTIPATTERN-002-HOST-CLASSLIST` | `ANTIPATTERN-002-HOST-CLASSLIST` |
| Host | H3: No inline `style={…}` in JSX, on `<Host>` or elsewhere — use classes and CSS custom properties | `script-02:ANTIPATTERN-001-INLINE-STYLE` | `ANTIPATTERN-001-INLINE-STYLE` |
| Host | H4: ARIA on the host goes through `<Host role=… aria-…>` | `manual` | [lifecycle-host H4](references/lifecycle-host.md#host) |
| Host | H5: Exactly one `<Host>` per render | `manual` | [lifecycle-host H5](references/lifecycle-host.md#host) |
| Host | H6: `<Host>` is virtual — it renders no element of its own | `manual` | [lifecycle-host H6](references/lifecycle-host.md#host) |
| Host | H7: An imperative host class change reported by script 02 is kept only for an external event that does not re-render (component-structure.md § When to Use `classList` Manipulation) | `manual` | [lifecycle-host H7](references/lifecycle-host.md#host) |
| Host element | HE1: The field is named `host` | `manual` | [lifecycle-host HE1](references/lifecycle-host.md#host-element) |
| Host element | HE2: Use it for DOM APIs only: `getBoundingClientRect`, `closest`, `matches`, `querySelector` on light DOM | `manual` | [lifecycle-host HE2](references/lifecycle-host.md#host-element) |
| Host element | HE3: No `@Element()` that the class never reads | `manual` | [lifecycle-host HE3](references/lifecycle-host.md#host-element) |
| JSX | J1: `h` is imported from `@stencil/core` (the `jsxFactory` in `tsconfig.json`) | `tsc` | — |
| JSX | J2: Conditional render uses expressions: `{this.open && <div>…</div>}` | `manual` | [jsx-styling J2](references/jsx-styling.md#jsx) |
| JSX | J3: An element returned from a `.map()` callback carries a unique `key` | `script-16:STENCIL-MAP-KEY` | `STENCIL-MAP-KEY` |
| JSX | J4: A `key` on conditionally swapped siblings keeps each one's DOM and state apart | `manual` | [jsx-styling J4](references/jsx-styling.md#jsx) |
| JSX | J5: Event handlers are class-field arrows (or inline arrows), so `this` stays bound | `manual` | [jsx-styling J5](references/jsx-styling.md#jsx) |
| JSX | J6: Refs: `ref={el => (this.inputElement = el)}` | `manual` | [jsx-styling J6](references/jsx-styling.md#jsx) |
| JSX | J7: `attr:` / `prop:` prefixes force an attribute or a property write (`<input prop:checked={…}>`); rare | `manual` | [jsx-styling J7](references/jsx-styling.md#jsx) |
| JSX | J8: A JSX node stored in a variable is not rendered twice — use a render function | `manual` | [jsx-styling J8](references/jsx-styling.md#jsx) |
| JSX | J11: `class=`, never React's `className=` | `script-02:ANTIPATTERN-023-CLASSNAME` | `ANTIPATTERN-023-CLASSNAME` |
| JSX | J12: `render()` is pure: no DOM writes, no state writes | `manual` | [jsx-styling J12](references/jsx-styling.md#jsx) |
| Styling | ST1: The bare `:host { }` rule declares `display` (a custom element defaults to `inline`) | `script-02:ANTIPATTERN-HOST-DISPLAY` | `ANTIPATTERN-HOST-DISPLAY` |
| Styling | ST2: Custom properties meant for consumers are declared on `:host` | `manual` | [jsx-styling ST2](references/jsx-styling.md#styling) |
| Styling | ST3: Attribute variants use `:host([variant='primary'])`; state classes use `:host(.is-open)` | `manual` | [jsx-styling ST3](references/jsx-styling.md#styling) |
| Styling | ST4: `::slotted()` matches only top-level slotted elements, never default content rendered inside the shadow root | `manual` | [jsx-styling ST4](references/jsx-styling.md#styling) |
| Styling | ST5: `::part(name)` is an opt-in styling API; `exportparts` forwards a nested component's parts | `manual` | [jsx-styling ST5](references/jsx-styling.md#styling) |
| Styling | ST6: No `!important` unless the line above carries `/* stylelint-disable-next-line declaration-no-important */` | `stylelint:declaration-no-important` | — |
| Styling | ST7: No `transition: all` / `transition-property: all` — list the properties | `stylelint:declaration-property-value-disallowed-list` | — |
| Styling | ST8: `prefers-reduced-motion` is handled once, in `src/assets/css/base/html.css` | `manual` | [jsx-styling ST8](references/jsx-styling.md#styling) |
| Styling | ST9: Global tokens (`:root` in `dist/mud/tokens/*.css`) inherit into shadow roots | `manual` | [jsx-styling ST9](references/jsx-styling.md#styling) |
| Styling | ST10: One conceptual element is not styled through both `::slotted()` and an internal class | `manual` | [jsx-styling ST10](references/jsx-styling.md#styling) |
| Styling | ST11: A load-bearing `!important` disable comment is accompanied by a comment saying why | `manual` | [jsx-styling ST11](references/jsx-styling.md#styling) |
| Form-Associated | F1: `formAssociated: true` in `@Component()` and `@AttachInternals() internals!: ElementInternals;` | `manual` | [form-reactivity F1](references/form-reactivity.md#form-associated) |
| Form-Associated | F2: `formResetCallback` and `formDisabledCallback` on every form-associated component; `formStateRestoreCallback` on every value control (not on a submitter) | `script-16:STENCIL-FORM-CALLBACKS` | `STENCIL-FORM-CALLBACKS` |
| Form-Associated | F3: `formResetCallback` restores the value captured at load and republishes it with `setFormValue` | `manual` | [form-reactivity F3](references/form-reactivity.md#form-associated) |
| Form-Associated | F4: `formDisabledCallback(disabled)` sets a `@State` (the fieldset's disabled state), never the component's own `disabled` prop | `manual` | [form-reactivity F4](references/form-reactivity.md#form-associated) |
| Form-Associated | F5: `formStateRestoreCallback(state, mode)` handles a string state and ignores what it cannot restore | `manual` | [form-reactivity F5](references/form-reactivity.md#form-associated) |
| Form-Associated | F6: `setFormValue(value, state)` is called with both arguments, so the browser can restore the state | `script-02:ANTIPATTERN-010-SETFORMVALUE-1ARG` | `ANTIPATTERN-010-SETFORMVALUE-1ARG` |
| Form-Associated | F7: `setValidity(flags, message, anchor)`: a flag set to `true` comes with a non-empty message, and the anchor is the internal focusable control | `manual` | [form-reactivity F7](references/form-reactivity.md#form-associated) |
| Form-Associated | F9: Custom states for `:host(:state(invalid))` are declared in `@AttachInternals({ states: { … } })` | `manual` | [form-reactivity F9](references/form-reactivity.md#form-associated) |
| Reactive | R2: Objects are reassigned with spread; `obj.x = y`, `obj['x'] = y`, `delete obj.x`, `arr[i] = y` do not re-render | `manual` | [form-reactivity R2](references/form-reactivity.md#reactive) |
| Reactive | R3: `@Watch` fires on assignment, not on mutation | `manual` | [form-reactivity R3](references/form-reactivity.md#reactive) |
| Reactive | R4: A `@Watch` on a native attribute that is not a prop (`@Watch('aria-label')`) runs from `attributeChangedCallback` and does not re-render; mirror the value into a `@State` rather than calling `forceUpdate()` | `manual` | [form-reactivity R4](references/form-reactivity.md#reactive) |
| Serialization | SE1: No `reflect: true` on an object or array prop without a serializer — a complex value is never written to an attribute | `manual` | [form-reactivity SE1](references/form-reactivity.md#serialization) |
| Serialization | SE2: A `@PropSerialize` method returns a string, or `null` to remove the attribute; `false` also removes it, `true` writes `""` | `manual` | [form-reactivity SE2](references/form-reactivity.md#serialization) |
| Serialization | SE3: `@PropSerialize` output reaches the attribute only when the prop also has `reflect: true`: the serializer runs for reflected components and its value is written only by the reflect loop over `ReflectAttr` props | `manual` | [form-reactivity SE3](references/form-reactivity.md#serialization) |
| Serialization | SE4: `@AttrDeserialize` never throws on bad input — wrap `JSON.parse` and fall back | `manual` | [form-reactivity SE4](references/form-reactivity.md#serialization) |
| Serialization | SE5: The serialized format is documented in the prop's JSDoc | `manual` | [form-reactivity SE5](references/form-reactivity.md#serialization) |
| Functional | FC1: PascalCase name — JSX treats a lowercase name as a native tag | `manual` | [functional-api FC1](references/functional-api.md#functional) |
| Functional | FC2: Typed as `FunctionalComponent<Props>`; the arguments are `(props, children, utils)` | `manual` | [functional-api FC2](references/functional-api.md#functional) |
| Functional | FC3: Children are walked with `utils.map` / `utils.forEach`, not by reading `VNode` fields | `manual` | [functional-api FC3](references/functional-api.md#functional) |
| Functional | FC4: Stateful, lifecycle-bound or HTML-consumable UI is a class component instead | `manual` | [functional-api FC4](references/functional-api.md#functional) |
| Functional | FC5: A component file exports only its class (type-only exports are allowed); a functional component lives in its own file | `eslint:@stencil/single-export` | — |
| Public API | API1: Component code imports from `@stencil/core`, never from `@stencil/core/internal/…` (only `stencil.config.ts` does, for the `Config` type that declares `buildDocs`) | `manual` | [functional-api API1](references/functional-api.md#public-api) |
| Public API | API3: Asset URLs come from `getAssetPath()`, never a hard-coded `/assets/…` path | `manual` | [functional-api API3](references/functional-api.md#public-api) |
| Public API | API4: `setAssetPath()` belongs to consumer apps and tests, not components | `manual` | [functional-api API4](references/functional-api.md#public-api) |
| Public API | API5: Batched DOM reads and writes go through `readTask()` / `writeTask()` | `manual` | [functional-api API5](references/functional-api.md#public-api) |
| Public API | API6: Consumers call `componentOnReady()` on the element; components never override it | `manual` | [functional-api API6](references/functional-api.md#public-api) |
| @Watch | W1: a watcher is not `async` — [`component-structure.md` § @Watch Rule](../../../src/components/_agents/component-structure.md) | `script-16:STENCIL-WATCH-ASYNC` | `STENCIL-WATCH-ASYNC` |
| @Watch | W2: a watcher writes its watched prop only as a literal validation fallback — [`component-structure.md` § @Watch Rule](../../../src/components/_agents/component-structure.md) | `script-16:STENCIL-WATCH-WRITES-WATCHED` | `STENCIL-WATCH-WRITES-WATCHED` |
| @Watch | W3: a literal write inside an `if` is a genuine validation fallback, and the watcher does only what the allowlist names | `manual` | [component-structure @Watch Rule](../../../src/components/_agents/component-structure.md) |
| Member order | MO1: decorator groups follow the canonical order and `render()` is last — [`component-structure.md` § TSX Class Member Order](../../../src/components/_agents/component-structure.md) | `script-16:STENCIL-MEMBER-ORDER` | `STENCIL-MEMBER-ORDER` |
| Member order | MO2: lifecycle methods (item 8, in `componentWillLoad` → `componentDidLoad` → `componentDidUpdate` order) precede private members (item 9) — [`component-structure.md` § TSX Class Member Order](../../../src/components/_agents/component-structure.md) | `manual` | [component-structure member order](../../../src/components/_agents/component-structure.md) |

## Failure modes

| Failure                                                                                            | Consequence                                                                             | Instead                                                                        |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Reading a tool error as "0 results" (ripgrep rejects lookahead without `--pcre2`)                  | A real violation passes as clean                                                        | Use the scripts; treat a non-zero exit with no findings as "not checked"       |
| Applying an old-prefix name (`cor*`)                                                               | Suggested renames point at components and events that do not exist                     | The prefix is `mud` (`mudChange`, `HTMLMudButtonElement`)                      |
| Treating `shadow: { delegatesFocus: true }` as a violation                                         | A compliant form control is "fixed" into losing focus delegation                        | Both `shadow: true` and an options object pass `STENCIL-SHADOW-REQUIRED`      |
| Demanding `formStateRestoreCallback` on a submitter                                                | Dead callbacks added to `mud-button`-style components                                   | A component calling `internals.form?.requestSubmit()` needs only reset/disabled |
| Citing an anti-pattern by number instead of code                                                   | Numbers differ across docs, so the finding points at the wrong rule                     | Cite the code (`ANTIPATTERN-002-HOST-CLASSLIST`)                               |
| Judging from memory without step 1's envelope                                                      | Rules the scripts already decided are re-judged, and inconsistently                     | Run step 1 first and quote its counts                                          |

## Self-check

- [ ] Each script's `summary` counts from step 1 are quoted in the report.
- [ ] Every finding carries a code or a `manual` rule id from the rule index.
- [ ] No rule was judged by hand whose `enforced-by` is not `manual`.
- [ ] Every skipped `manual` row is listed under "not checked" with a reason.

## Out of scope

- Hydrate/SSR output targets and declarative shadow DOM — the project builds no hydrate output (`stencil.config.ts`).
- Slot fixes for `scoped` components — every component uses shadow DOM.
- Testing — [`TESTING.md`](../../../TESTING.md) and `src/components/_agents/testing.md`.
- Design tokens and colours — [`token-creation`](../token-creation/SKILL.md).
- Figma extraction and pixel parity — [`pixel-perfect`](../pixel-perfect/SKILL.md).
- WCAG 2.1 AA — [`accessibility-compliance`](../accessibility-compliance/SKILL.md).
- Storybook configuration — `.storybook/main.mjs`, `src/components/_agents/storybook-stories.md`.
- Build configuration (`stencil.config.ts`).

## Cross-references

| Topic                                  | Canonical location                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| ARIA states reflected from props       | [`accessibility-compliance`](../accessibility-compliance/SKILL.md)                                           |
| Focus rings with `delegatesFocus`      | [`accessibility-compliance`](../accessibility-compliance/SKILL.md)                                           |
| Member order, `@Watch`, host classes   | [`component-structure.md`](../../../src/components/_agents/component-structure.md)                           |
| Project anti-patterns (tokens, icons)  | [`_agents/anti-patterns.md`](../../../_agents/anti-patterns.md)                                              |
| Stencil version deltas and upgrades    | [`references/version-delta.md`](references/version-delta.md)                                                 |
| Narrowest checks before commit         | `yarn lint`, `yarn test`                                                                                     |
