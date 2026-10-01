import type { JSX } from '@egov-moldova/mud/components';
import { defineCustomElement } from '@egov-moldova/mud/components/mud-numeric-input.js';

import { MudNumericInput as Generated } from '../components/stencil-generated/mud-numeric-input.js';
import { defineModelWrapper } from './define-model-wrapper.js';

/**
 * `mud-numeric-input` with a `v-model` of `number | null`. Hand-written, for two reasons the
 * generated wrapper cannot meet:
 *
 *  - the component clamps and rounds on commit, writes `value` and emits only `mudChange`, so
 *    the model listens to `mudInput` (each keystroke) AND `mudChange`;
 *  - it sets `value` to `undefined` when cleared, and Vue's `patchDOMProp` writes `0` for a
 *    `null`/`undefined` prop on an element whose `value` is a number. Here a `null`/`undefined`
 *    model is written as `undefined` (the component's own empty state), and an empty element is
 *    a `null` model.
 */
export const MudNumericInput = defineModelWrapper<JSX.MudNumericInput, number | null>({
  name: 'MudNumericInput',
  tag: 'mud-numeric-input',
  define: defineCustomElement,
  generated: Generated,
  events: ['mudInput', 'mudChange'],
  toModel: value => (typeof value === 'number' ? value : null),
  toElement: model => (typeof model === 'number' ? model : undefined),
});
