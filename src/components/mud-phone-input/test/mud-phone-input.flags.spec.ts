import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@stencil/vitest';

import { FLAG_MODULES } from '../../../generated/flags';
import { COUNTRIES } from '../mud-phone-input.data';
import { flagKey } from '../mud-phone-input.flags';

const FLAGS_DIR = path.resolve(import.meta.dirname, '../assets/flags');
const files = readdirSync(FLAGS_DIR);
const flagFiles = new Set(files.filter(name => name.endsWith('.svg')));

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

  // The vendored source set the modules are generated from: its provenance is what the licence
  // banner and `validate.package` repeat, so it is checked where it lives.
  describe('vendored flag files', () => {
    it('ships the upstream licence and the pinned commit with the files', () => {
      expect(files).toContain('LICENSE');
      expect(readFileSync(path.join(FLAGS_DIR, 'LICENSE'), 'utf8')).toMatch(/MIT License/);
      const source = JSON.parse(readFileSync(path.join(FLAGS_DIR, 'SOURCE.json'), 'utf8')) as {
        commit: string;
        count: number;
        license: string;
      };
      expect(source.license).toBe('MIT');
      expect(source.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(source.count).toBe(flagFiles.size);
    });

    it('says where every replaced flag comes from, under which licence and why', () => {
      const source = JSON.parse(readFileSync(path.join(FLAGS_DIR, 'SOURCE.json'), 'utf8')) as {
        overrides?: Record<string, { source: string; license: string; reason: string }>;
      };
      const overrides = source.overrides ?? {};
      expect(Object.keys(overrides)).toContain('md');
      for (const [code, entry] of Object.entries(overrides)) {
        expect(flagFiles.has(`${code}.svg`), code).toBe(true);
        for (const key of ['source', 'license', 'reason'] as const) {
          expect(entry[key].trim(), `${code}.${key}`).not.toBe('');
        }
      }
    });

    it('holds plain vector drawings: no script, style sheet, raster or reference to another file', () => {
      for (const file of flagFiles) {
        const svg = readFileSync(path.join(FLAGS_DIR, file), 'utf8');
        expect(svg, file).toMatch(/viewBox="/);
        expect(svg, file).not.toMatch(/<script|<style|<image|<foreignObject|\bhref\s*=\s*["'](?!#)|\son\w+\s*=/i);
      }
    });
  });
});
