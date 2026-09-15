import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@stencil/vitest';
import { expectTypeOf } from 'vitest';

import type { Components } from '../../../components';
import type { BreadcrumbItem } from '../../mud-breadcrumb/mud-breadcrumb.types';
import type { SegmentedControlSegment } from '../../mud-segmented-control/mud-segmented-control.types';
import type { StepperStep } from '../../mud-stepper/mud-stepper.types';
import type { TabDescriptor } from '../../mud-tabs/mud-tabs.types';
import manifest from '../assets/icons.manifest.json';
import { ICON_NAMES, type IconName, isIconName } from '../icon-names';

const COMPONENTS_ROOT = path.resolve(import.meta.dirname, '../..');

/** Deliberately unknown names used by stories that demo the missing-icon fallback. */
const INTENTIONALLY_UNKNOWN = new Set(['this-icon-does-not-exist']);

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
    expect(isIconName('circle-info-filled')).toBe(true);
    expect(isIconName('check')).toBe(false);
    expect(isIconName('')).toBe(false);
    expect(isIconName(undefined)).toBe(false);
  });

  it('references only manifest names from story markup', () => {
    const unknown = listStoryFiles(COMPONENTS_ROOT).flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return [
        ...source.matchAll(
          /<mud-[a-z-]+\b[^>]*?\s(?:icon-name|icon|icon-active|icon-start)="([^"$]+)"|<mud-icon\b[^>]*?\sname="([^"$]+)"/g,
        ),
      ]
        .map(match => match[1] ?? match[2])
        .filter(name => !isIconName(name) && !INTENTIONALLY_UNKNOWN.has(name))
        .map(name => `${path.relative(COMPONENTS_ROOT, file)}: ${name}`);
    });
    expect(unknown).toEqual([]);
  });

  it('types every icon-name surface as IconName', () => {
    // Compile-time contract, checked by `yarn typecheck` (a no-op under vitest). Each
    // assertion fails when a surface widens back to `string` AND when it is renamed or
    // removed, which a `@ts-expect-error` line would silently absorb.
    type Optional = IconName | undefined;
    expectTypeOf<Components.MudIcon['name']>().toEqualTypeOf<IconName>();
    expectTypeOf<Components.MudToast['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudBanner['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudInfoBox['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudInlineMessage['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudTab['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudAvatar['iconName']>().toEqualTypeOf<IconName>();
    expectTypeOf<Components.MudSearchInput['iconName']>().toEqualTypeOf<IconName>();
    expectTypeOf<Components.MudMenuItem['icon']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudSidebarItem['icon']>().toEqualTypeOf<Optional>();
    expectTypeOf<Components.MudSidebarItem['iconActive']>().toEqualTypeOf<Optional>();
    expectTypeOf<StepperStep['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<TabDescriptor['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<SegmentedControlSegment['iconName']>().toEqualTypeOf<Optional>();
    expectTypeOf<BreadcrumbItem['iconStart']>().toEqualTypeOf<Optional>();
    expectTypeOf<'not-an-icon'>().not.toMatchTypeOf<IconName>();
  });

  it('is what build-registry.mjs would emit from the SVG assets', () => {
    const script = path.resolve(import.meta.dirname, '../../../../scripts/icons/build-registry.mjs');
    expect(() => execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' })).not.toThrow();
  });
});
