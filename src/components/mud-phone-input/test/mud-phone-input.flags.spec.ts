import { describe, expect, it } from '@stencil/vitest';

import { FLAG_MODULES } from '../../../generated/flags';
import { COUNTRIES } from '../mud-phone-input.data';
import { flagKey } from '../mud-phone-input.flags';

describe('mud-phone-input flags', () => {
  describe('flagKey', () => {
    it('names the flag by the lower-case ISO code', () => {
      expect(flagKey('MD')).toBe('md');
      expect(flagKey('gb')).toBe('gb');
    });

    it('names the two territory flags by their parent territory', () => {
      expect(flagKey('AC')).toBe('sh-ac');
      expect(flagKey('TA')).toBe('sh-ta');
    });
  });

  describe('flag modules', () => {
    it.each(Object.keys(COUNTRIES))('%s has a key in FLAG_MODULES', iso => {
      expect(Object.hasOwn(FLAG_MODULES, flagKey(iso)), `${flagKey(iso)} is not in FLAG_MODULES`).toBe(true);
    });
  });
});
