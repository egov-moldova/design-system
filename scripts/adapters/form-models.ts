// The form-control model map: which `mud-*` components hold a form value, which property
// carries it and which event(s) announce a user-driven change.
//
// ONE module, read by every consumer so the same fact is never typed twice:
//   - `stencil.config.ts` derives the Vue `componentModels` from it (`vueComponentModels`);
//   - the Angular adapter derives its `valueAccessorConfigs` from it
//     (`angularValueAccessorConfigs`), and writes the `hand-written` rows' accessors by hand;
//   - `scripts/__tests__/adapter-form-models.spec.mjs` checks it against
//     `.storybook/custom-elements.json`, which Stencil writes from the component decorators.
//
// A form control here is a component that emits `mudInput` or `mudChange` carrying its value.
// `formAssociated` is not the rule: `mud-button` is form-associated without holding a value,
// and `mud-radio-group`, `mud-date-picker`, `mud-time-picker` and `mud-menu` hold one without
// being form-associated. The plan's rationale lives in
// `.claude/plans/2026-09-30-angular-vue-adapters.md` § Form-control model map.
//
// Every control sets its model property BEFORE it emits, so reading `event.target[property]`
// is correct. Two components also write the property on a path that emits a DIFFERENT event,
// so a row lists EVERY event that follows a user-driven write:
//   - `mud-numeric-input` clamps and rounds on commit and emits only `mudChange`;
//   - `mud-phone-input`'s country switch rewrites `value` and emits only `mudCountryChange`.
// Angular listens to all of a row's events. Vue's generator binds ONE event per model, so
// each row names it in `vueEvent`; the phone-input country switch is a recorded Vue limitation.
//
// Erasable TypeScript only (no enums, namespaces or parameter properties): Stencil's config
// loader transpiles this file when `stencil.config.ts` imports it, and Node 24 strips the
// types natively for the `node --test` specs and the fixture runner.

/** The properties a model is read from. `value` and `checked` are native; the others are not. */
export type ModelProperty = 'value' | 'checked' | 'chips' | 'files';

/**
 * The model's value type, as the property carries it.
 * `passthrough` is "the component's own property type, passed as-is" (a string, or
 * `string | string[]` in `mud-date-picker`'s range mode).
 */
export type ModelValueType = 'string' | 'number' | 'boolean' | 'string[]' | 'File[]' | 'passthrough';

/** What the Angular adapter binds a row with: one of the generator's accessor types, or by hand. */
export type AngularAccessorKind = 'text' | 'select' | 'boolean' | 'hand-written';

export interface FormModelRow {
  /** Stable name of the model shape, used in spec failures. */
  readonly id: string;
  readonly property: ModelProperty;
  readonly valueType: ModelValueType;
  /** Every event that follows a user-driven write of `property`; Angular listens to all of them. */
  readonly events: readonly string[];
  /** The ONE event Vue's `v-model` binds. Always one of `events`. */
  readonly vueEvent: string;
  /** The components that share this model shape. */
  readonly tags: readonly string[];
  /** Why the row looks the way it does, and the coercion a hand-written accessor owes. */
  readonly note: string;
}

export interface TagDisposition {
  readonly tag: string;
  readonly reason: string;
}

export const FORM_MODEL_ROWS: readonly FormModelRow[] = [
  {
    id: 'text',
    property: 'value',
    valueType: 'string',
    events: ['mudInput'],
    vueEvent: 'mudInput',
    tags: ['mud-text-input', 'mud-textarea', 'mud-search-input'],
    note: 'The model follows every keystroke.',
  },
  {
    id: 'phone',
    property: 'value',
    valueType: 'string',
    events: ['mudInput', 'mudCountryChange'],
    vueEvent: 'mudInput',
    tags: ['mud-phone-input'],
    note:
      'E.164 on each keystroke and on a country switch. The switch rewrites `value` and emits only ' +
      '`mudCountryChange` (mud-phone-input.tsx:693), which Vue cannot bind next to `mudInput`: recorded limitation.',
  },
  {
    id: 'numeric',
    property: 'value',
    valueType: 'number',
    events: ['mudInput', 'mudChange'],
    vueEvent: 'mudChange',
    tags: ['mud-numeric-input'],
    note:
      'Clamps and rounds on commit and emits only `mudChange` (mud-numeric-input.tsx:798-822), so the model updates ' +
      'on commit in Vue. It sets `value` to `undefined` on clear (mud-numeric-input.tsx:716-727,771-773), which the ' +
      "generated `number` accessor turns into NaN: the Angular accessor is hand-written (`undefined`/`null`/`''` → `null`).",
  },
  {
    id: 'boolean',
    property: 'checked',
    valueType: 'boolean',
    events: ['mudChange'],
    vueEvent: 'mudChange',
    tags: ['mud-checkbox', 'mud-switch'],
    note: 'The model is `checked`, not `value`.',
  },
  {
    id: 'select',
    property: 'value',
    valueType: 'passthrough',
    events: ['mudChange'],
    vueEvent: 'mudChange',
    tags: [
      'mud-select',
      'mud-radio-group',
      'mud-segmented-control',
      'mud-date-picker',
      'mud-time-picker',
      'mud-date-input',
      'mud-time-input',
      'mud-menu',
    ],
    note:
      'date-input and time-input bind `mudChange`: their `mudInput` carries the partially masked text while the user ' +
      'types. mud-menu holds a value only with `type="selection"`. mud-date-picker passes `string | string[]` through.',
  },
  {
    id: 'chips',
    property: 'chips',
    valueType: 'string[]',
    events: ['mudChange'],
    vueEvent: 'mudChange',
    tags: ['mud-input-chip'],
    note: 'The generated accessors write `.value`, never `.chips`: hand-written (`null`/`undefined` → `[]`).',
  },
  {
    id: 'files',
    property: 'files',
    valueType: 'File[]',
    events: ['mudChange'],
    vueEvent: 'mudChange',
    tags: ['mud-file-input'],
    note:
      'Hand-written (`null`/`undefined` → `[]`): the generated accessors write `.value`, and Angular calls ' +
      '`writeValue(null)` on setup and on `reset()`.',
  },
];

/** Emitters of `mudInput`/`mudChange` that are NOT form controls, each with its reason. */
export const FORM_MODEL_EXCLUSIONS: readonly TagDisposition[] = [
  { tag: 'mud-radio', reason: "its value is owned by `mud-radio-group`, which is the row's control" },
  { tag: 'mud-pagination', reason: 'emits page navigation, not a form value' },
  { tag: 'mud-tabs', reason: 'emits the active tab, which is navigation, not a form value' },
  { tag: 'mud-accordion', reason: 'emits its open item ids, which is disclosure state, not a form value' },
];

/**
 * Tags whose manifest declares a `value`, `checked` or `selected` member and that are neither
 * a row nor an exclusion. They emit under another name or not at all, so the emitter rule
 * above cannot see them; each is stated here so a new value holder cannot slip past silently.
 */
export const NON_EMITTING_VALUE_HOLDERS: readonly TagDisposition[] = [
  { tag: 'mud-button', reason: 'form-associated submit value, not a model: it emits no change' },
  { tag: 'mud-service-button', reason: 'form-associated submit value, not a model: it emits no change' },
  {
    tag: 'mud-chip',
    reason: 'a `selected` toggle that announces itself with `mudSelect`, an action rather than a model',
  },
  { tag: 'mud-menu-item', reason: 'its `selected`/`value` are item state; the owning `mud-menu` holds the model' },
  { tag: 'mud-sidebar-item', reason: 'navigation item: emits `mudSelect`/`mudToggle`, holds no form value' },
  { tag: 'mud-tab', reason: 'a tab of `mud-tabs`, which is excluded: navigation, not a form value' },
];

/** Every tag with a row, in row order. */
export const FORM_MODEL_TAGS: readonly string[] = FORM_MODEL_ROWS.flatMap(row => row.tags);

/**
 * The Angular accessor type of a row, DERIVED from its property and events and never stored
 * beside them, so a row cannot be typed into the wrong merge.
 *
 * The Angular generator merges every `valueAccessorConfigs` row of one `type` into ONE
 * directive that listens to ALL of that type's events on ALL of its selectors
 * (`@stencil/angular-output-target@1.5.0 dist/generate-value-accessors.js:12-28`), so:
 *   - `checked` is the generator's `boolean` type;
 *   - `chips`, `files` and a numeric `value` are written by hand (the generated accessors
 *     write `.value`, and a number accessor turns `undefined` into NaN);
 *   - any other `value` is `text` when the user-driven event is `mudInput` and `select` when
 *     it is `mudChange`. date-input and time-input are therefore `select`: as `text` they
 *     would hear the `mudInput` of the text row.
 */
export function angularAccessorKind(row: Pick<FormModelRow, 'property' | 'valueType' | 'events'>): AngularAccessorKind {
  if (row.property === 'checked') return 'boolean';
  if (row.property !== 'value' || row.valueType === 'number') return 'hand-written';
  return row.events[0] === 'mudInput' ? 'text' : 'select';
}

export interface AngularValueAccessorConfig {
  readonly elementSelectors: string[];
  readonly event: string;
  readonly targetAttr: string;
  readonly type: Exclude<AngularAccessorKind, 'hand-written'>;
}

/**
 * The `valueAccessorConfigs` of the Angular output target: one config per (type, event,
 * property) whose `elementSelectors` lists every tag, because the generator appends one host
 * entry per config and eight `select` configs would write `'(mudChange)'` eight times (TS1117).
 * `hand-written` rows are not in the list: their accessors are not generated.
 */
export function angularValueAccessorConfigs(
  rows: readonly FormModelRow[] = FORM_MODEL_ROWS,
): AngularValueAccessorConfig[] {
  const groups = new Map<string, AngularValueAccessorConfig>();
  for (const row of rows) {
    const type = angularAccessorKind(row);
    if (type === 'hand-written') continue;
    for (const event of row.events) {
      const key = `${type}|${event}|${row.property}`;
      const group = groups.get(key) ?? { elementSelectors: [], event, targetAttr: row.property, type };
      group.elementSelectors.push(...row.tags);
      groups.set(key, group);
    }
  }
  return [...groups.values()];
}

export interface VueComponentModel {
  readonly elements: string[];
  readonly event: string;
  readonly targetAttr: string;
}

/**
 * The `componentModels` of the Vue output target (`ComponentModelConfig`): `event` is the row's
 * `vueEvent` and `targetAttr` its property. `eventAttr` is left unset on purpose: the runtime
 * then reads `event.target[targetAttr]` (`@stencil/vue-output-target/dist/runtime.js`), which
 * is exactly the contract every row keeps, and the same property is written back.
 */
export function vueComponentModels(rows: readonly FormModelRow[] = FORM_MODEL_ROWS): VueComponentModel[] {
  return rows.map(row => ({ elements: [...row.tags], event: row.vueEvent, targetAttr: row.property }));
}
