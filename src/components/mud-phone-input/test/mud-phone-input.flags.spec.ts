import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { setAssetPath } from '@stencil/core';
import { describe, expect, it } from '@stencil/vitest';

import { COUNTRIES } from '../mud-phone-input.data';
import { flagAssetPath, flagUrl } from '../mud-phone-input.flags';

const FLAGS_DIR = path.resolve(import.meta.dirname, '../assets/flags');
const files = readdirSync(FLAGS_DIR);
const flagFiles = new Set(files.filter(name => name.endsWith('.svg')));

describe('mud-phone-input flags', () => {
  describe('flagAssetPath', () => {
    it('names the file by the ISO code', () => {
      expect(flagAssetPath('MD')).toBe('./assets/flags/MD.svg');
    });

    it('maps GB to flagpack-core "GB-UKM": the set has no GB.svg', () => {
      expect(flagAssetPath('GB')).toBe('./assets/flags/GB-UKM.svg');
    });
  });

  describe('flag files', () => {
    it.each(Object.keys(COUNTRIES))('%s resolves to a file that ships', iso => {
      const file = path.basename(flagAssetPath(iso));
      expect(flagFiles.has(file), `${file} is not under assets/flags`).toBe(true);
    });

    it('ships the upstream licence and the pinned commit with the files', () => {
      expect(files).toContain('LICENSE');
      expect(readFileSync(path.join(FLAGS_DIR, 'LICENSE'), 'utf8')).toMatch(/^MIT License/);
      const source = JSON.parse(readFileSync(path.join(FLAGS_DIR, 'SOURCE.json'), 'utf8')) as {
        commit: string;
        count: number;
        license: string;
      };
      expect(source.license).toBe('MIT');
      expect(source.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(source.count).toBe(flagFiles.size);
    });

    it('holds plain vector drawings: no script, style sheet, raster or reference', () => {
      for (const file of flagFiles) {
        const svg = readFileSync(path.join(FLAGS_DIR, file), 'utf8');
        expect(svg, file).toMatch(/viewBox="/);
        expect(svg, file).not.toMatch(/<script|<style|<image|<foreignObject|href\s*=|\son\w+\s*=/i);
      }
    });
  });

  describe('flagUrl', () => {
    it('resolves the file against the asset base the host registers', () => {
      setAssetPath('https://cdn.test/build/');
      expect(flagUrl('RO')).toBe('https://cdn.test/build/assets/flags/RO.svg');
      expect(flagUrl('GB')).toBe('https://cdn.test/build/assets/flags/GB-UKM.svg');
    });
  });
});
