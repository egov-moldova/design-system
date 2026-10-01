import type { JSX } from '@egov-moldova/mud/components';

import { MudPhoneInput as Generated } from '../components/stencil-generated/mud-phone-input.js';
import { defineModelWrapper } from './define-model-wrapper.js';

/**
 * `mud-phone-input` with a `v-model` of the E.164 string. Hand-written because a country switch
 * rewrites `value` and emits only `mudCountryChange`: the model listens to `mudInput` (each
 * keystroke) AND `mudCountryChange`, which the generated wrapper's single-event `v-model` cannot.
 */
export const MudPhoneInput = defineModelWrapper<JSX.MudPhoneInput, string>({
  name: 'MudPhoneInput',
  generated: Generated,
  events: ['mudInput', 'mudCountryChange'],
  toModel: value => (typeof value === 'string' ? value : ''),
  toElement: model => (typeof model === 'string' ? model : ''),
});
