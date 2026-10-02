import { describe, expect, it } from '@stencil/vitest';

import { GENERATED_COUNTRIES } from '../mud-phone-input.countries';
import { COUNTRIES, DEFAULT_COUNTRY_ORDER } from '../mud-phone-input.data';

const rows = Object.values(COUNTRIES);
const CURATED = ['MD', 'RO', 'RU', 'UA', 'US', 'GB', 'DE', 'FR', 'IT', 'ES', 'PT', 'IL', 'TR', 'BG', 'GR'];
const digitsIn = (mask: string): number => mask.replace(/[^X]/g, '').length;

describe('mud-phone-input countries', () => {
  it('has a row for every generated country and no other', () => {
    expect(rows.length).toBe(GENERATED_COUNTRIES.length);
    expect(Object.keys(COUNTRIES).sort()).toEqual(GENERATED_COUNTRIES.map(row => row[0]).sort());
    expect(rows.length).toBeGreaterThan(200);
  });

  it('lists Moldova first, then the other curated countries, then the rest', () => {
    expect(DEFAULT_COUNTRY_ORDER.slice(0, CURATED.length)).toEqual(CURATED);
    expect(DEFAULT_COUNTRY_ORDER.length).toBe(rows.length);
  });

  describe.each(rows.map(row => [row.iso, row] as const))('%s', (_iso, row) => {
    it('is keyed by its own ISO code and has a dial code and a name', () => {
      expect(COUNTRIES[row.iso]).toBe(row);
      expect(row.iso).toMatch(/^[A-Z]{2}$/);
      expect(row.code).toMatch(/^\+[1-9]\d{0,2}$/);
      expect(row.name.trim()).not.toBe('');
    });

    it('has a mask of digits and single spaces that holds exactly maxLen digits: the input stops at its end', () => {
      expect(row.mask).toMatch(/^X+( X+)*$/);
      expect(digitsIn(row.mask)).toBe(row.maxLen);
    });

    it('has a sane length window', () => {
      expect(row.minLen).toBeGreaterThanOrEqual(1);
      expect(row.minLen).toBeLessThanOrEqual(row.maxLen);
      expect(row.maxLen).toBeLessThanOrEqual(17);
    });
  });

  it('names exactly one main country for every dial code', () => {
    const byCode = new Map<string, string[]>();
    for (const row of rows) byCode.set(row.code, [...(byCode.get(row.code) ?? []), ...(row.main ? [row.iso] : [])]);
    for (const [code, mains] of byCode) expect(mains.length, `${code}: ${mains.join(',')}`).toBe(1);
  });

  it('makes the biggest country of each shared dial code the main one', () => {
    const main = (iso: string) => COUNTRIES[iso].main;
    for (const iso of ['US', 'RU', 'GB', 'IT', 'NO', 'AU', 'MA', 'RE', 'FI']) expect(main(iso), iso).toBe(true);
    for (const iso of ['CA', 'AG', 'KZ', 'GG', 'VA', 'SJ', 'CX', 'EH', 'YT', 'AX']) expect(main(iso), iso).toBe(false);
  });

  describe('the hand-set rows', () => {
    it.each(CURATED)('%s keeps the length window libphonenumber gives for mobile numbers', iso => {
      const generated = GENERATED_COUNTRIES.find(row => row[0] === iso);
      expect(generated).toBeTruthy();
      expect([COUNTRIES[iso].minLen, COUNTRIES[iso].maxLen]).toEqual([generated?.[4], generated?.[5]]);
      expect(COUNTRIES[iso].code).toBe(generated?.[1]);
    });

    it('keep their own masks, which differ from the generated ones for four countries', () => {
      const differing = CURATED.filter(
        iso => COUNTRIES[iso].mask !== GENERATED_COUNTRIES.find(row => row[0] === iso)?.[3],
      );
      expect(differing.sort()).toEqual(['DE', 'ES', 'GB', 'UA']);
    });
  });

  it('keeps the Moldovan number the shape the form has always had', () => {
    expect(COUNTRIES.MD).toMatchObject({ code: '+373', mask: 'XXX XX XXX', minLen: 8, maxLen: 8, main: true });
  });
});
