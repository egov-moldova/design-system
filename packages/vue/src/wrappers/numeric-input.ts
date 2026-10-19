import type { JSX } from '@egov-moldova/mud/components';

import { MudNumericInput as Generated } from '../components/stencil-generated/mud-numeric-input.js';
import { defineModelWrapper } from './define-model-wrapper.js';

/**
 * The one numeric coercion, identical to the Angular accessor's (`numeric-value-accessor.ts`):
 * a finite number passes; a string is parsed like Stencil (`parseFloat` of the trimmed text, the
 * rule Stencil applies to a string set on a `number` prop, so `'5'` keeps meaning 5 and `'12px'`
 * means 12) and kept only when finite; anything else (`null`, `undefined`, `''`, `'abc'`, `NaN`,
 * `±Infinity`, any other type) is empty, which is `null`.
 */
function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * `mud-numeric-input` with a `v-model` of `number | null`. Hand-written, for two reasons the
 * generated wrapper cannot meet:
 *
 *  - the component clamps and rounds on commit, writes `value` and emits only `mudChange`, so
 *    the model listens to `mudInput` (each keystroke) AND `mudChange`;
 *  - it sets `value` to `undefined` when cleared, and Vue's `patchDOMProp` writes `0` for a
 *    `null`/`undefined` prop on an element whose `value` is a number. Here an empty model (see
 *    `toNumberOrNull`) is written as `undefined` (the component's own empty state), and an empty
 *    element is a `null` model.
 */
export const MudNumericInput = defineModelWrapper<JSX.MudNumericInput, number | null>({
  name: 'MudNumericInput',
  generated: Generated,
  events: ['mudInput', 'mudChange'],
  toModel: toNumberOrNull,
  toElement: model => toNumberOrNull(model) ?? undefined,
});
