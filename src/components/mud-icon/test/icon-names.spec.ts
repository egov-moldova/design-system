import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from '@stencil/vitest';
import { expectTypeOf } from 'vitest';

import type { Components } from '../../../components';
import type { BreadcrumbItem } from '../../mud-breadcrumb/mud-breadcrumb.types';
import type { SegmentedControlSegment } from '../../mud-segmented-control/mud-segmented-control.types';
import type { StepperStep } from '../../mud-stepper/mud-stepper.types';
import type { TabDescriptor } from '../../mud-tabs/mud-tabs.types';
import manifest from '../assets/icons.manifest.json';
import { hasIconVariant, ICON_NAMES, type IconName, isIconName } from '../icon-names';
import type { IconVariant } from '../mud-icon.types';

const COMPONENTS_ROOT = path.resolve(import.meta.dirname, '../..');
const REGISTRY_SCRIPT = path.resolve(import.meta.dirname, '../../../../scripts/icons/build-registry.mjs');

/** Deliberately unknown names used by stories that demo the missing-icon fallback. */
const INTENTIONALLY_UNKNOWN = new Set(['this-icon-does-not-exist']);

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return entry.name.endsWith('.tsx') && !entry.name.endsWith('.spec.tsx') ? [full] : [];
  });
}

function listStoryFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listStoryFiles(full);
    return entry.name.endsWith('.stories.ts') ? [full] : [];
  });
}

describe('icon names', () => {
  it('matches the manifest exactly (regenerate with `node scripts/icons/build-registry.mjs`)', () => {
    expect([...ICON_NAMES]).toEqual(Object.keys(manifest).sort());
  });

  it('narrows only manifest names', () => {
    expect(isIconName('circle-info')).toBe(true);
    expect(isIconName('check')).toBe(false);
    expect(isIconName('')).toBe(false);
    expect(isIconName(undefined)).toBe(false);
  });

  it('references only manifest names from story markup', () => {
    const unknown = listStoryFiles(COMPONENTS_ROOT).flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return [
        ...source.matchAll(
          /<mud-[a-z-]+\b[^>]*?\s(?:icon-name|icon|icon-start)="([^"$]+)"|<mud-icon\b[^>]*?\sname="([^"$]+)"/g,
        ),
      ]
        .map(match => match[1] ?? match[2])
        .filter(name => !isIconName(name) && !INTENTIONALLY_UNKNOWN.has(name))
        .map(name => `${path.relative(COMPONENTS_ROOT, file)}: ${name}`);
    });
    expect(unknown).toEqual([]);
  });

  it('references only styles the named icon is drawn in', () => {
    const wrong = listStoryFiles(COMPONENTS_ROOT)
      .concat(listSourceFiles(COMPONENTS_ROOT))
      .flatMap(file => {
        const source = readFileSync(file, 'utf8');
        return [...source.matchAll(/<mud-icon\b[^>]*?\sname="([^"$]+)"[^>]*?\svariant="([^"${]+)"/g)]
          .filter(([, name, variant]) => isIconName(name) && !hasIconVariant(name, variant as 'outlined' | 'filled'))
          .map(([, name, variant]) => `${path.relative(COMPONENTS_ROOT, file)}: ${name}/${variant}`);
      });
    expect(wrong).toEqual([]);
  });

  it('types every icon-name surface as IconName', () => {
    // Compile-time contract, checked by `yarn typecheck` (a no-op under vitest). Each
    // assertion fails when a surface widens back to `string` AND when it is renamed or
    // removed, which a `@ts-expect-error` line would silently absorb.
    type Optional = IconName | undefined;
    expectTypeOf<Components.MudIcon['name']>().toEqualTypeOf<IconName>();
    expectTypeOf<Components.MudIcon['variant']>().toEqualTypeOf<IconVariant>();
    expectTypeOf<Components.MudToast['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudBanner['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudInfoBox['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudInlineMessage['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudTab['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudAvatar['iconName']>().toEqualTypeOf<IconName>();
    expectTypeOf<Components.MudSearchInput['iconName']>().toEqualTypeOf<IconName>();
    expectTypeOf<Components.MudMenuItem['icon']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudSidebarItem['icon']>().toEqualTypeOf<Optional>();
    expectTypeOf<StepperStep['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<TabDescriptor['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<SegmentedControlSegment['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<BreadcrumbItem['iconStart']>().toEqualTypeOf<Optional>();
    expectTypeOf<'not-an-icon'>().not.toMatchTypeOf<IconName>();
  });

  it('is what build-registry.mjs would emit from the SVG assets', () => {
    expect(() => execFileSync(process.execPath, [REGISTRY_SCRIPT, '--check'], { stdio: 'pipe' })).not.toThrow();
  });
});

describe('build-registry.mjs refusals', () => {
  // The script derives its project root from its own location, so a fixture
  // tree is a copy of the script plus the assets folders it scans — nothing in
  // the real tree is touched, and every refusal below is reachable no other way.
  function runAgainstFixture(files: Record<string, string>, dirs: string[] = ['outlined', 'filled']): string {
    const root = mkdtempSync(path.join(tmpdir(), 'mud-icon-registry-'));
    try {
      const scriptDir = path.join(root, 'scripts', 'icons');
      const assetsRoot = path.join(root, 'src', 'components', 'mud-icon', 'assets');
      mkdirSync(scriptDir, { recursive: true });
      for (const dir of dirs) mkdirSync(path.join(assetsRoot, dir), { recursive: true });
      copyFileSync(REGISTRY_SCRIPT, path.join(scriptDir, 'build-registry.mjs'));
      for (const [rel, body] of Object.entries(files)) {
        writeFileSync(path.join(assetsRoot, rel), body);
      }
      try {
        execFileSync(process.execPath, [path.join(scriptDir, 'build-registry.mjs')], { stdio: 'pipe' });
      } catch (err) {
        return String((err as { stderr?: Buffer }).stderr ?? err);
      }
      return '';
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>';

  it('refuses a filename that still carries the style suffix', () => {
    expect(runAgainstFixture({ 'filled/car-filled.svg': SVG })).toContain('style suffix in a filename');
  });

  it('refuses a name that could inject code into the generated module', () => {
    expect(runAgainstFixture({ "outlined/car'+process.exit(1)+'.svg": SVG })).toContain('unsafe icon name');
  });

  it('refuses a missing style directory', () => {
    expect(runAgainstFixture({ 'outlined/car.svg': SVG }, ['outlined'])).toContain('missing asset directory');
  });

  it('refuses an empty asset set', () => {
    expect(runAgainstFixture({})).toContain('no SVG assets found');
  });
});
