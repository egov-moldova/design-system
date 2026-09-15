import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@stencil/vitest';

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
      return [...source.matchAll(/<mud-icon\b[^>]*?\sname="([^"$]+)"/g)]
        .map(match => match[1])
        .filter(name => !isIconName(name) && !INTENTIONALLY_UNKNOWN.has(name))
        .map(name => `${path.relative(COMPONENTS_ROOT, file)}: ${name}`);
    });
    expect(unknown).toEqual([]);
  });

  it('types every icon-name surface as IconName', () => {
    // Compile-time contract, enforced by `yarn typecheck`: each line below must
    // stay a type error. An unused `@ts-expect-error` fails the typecheck, so a
    // surface regressing to `string` breaks the build rather than passing silently.
    const unknown = 'not-an-icon';
    const surfaces = [
      // @ts-expect-error mud-icon name
      { name: unknown } satisfies Partial<Components.MudIcon>,
      // @ts-expect-error mud-toast iconName
      { iconName: unknown } satisfies Partial<Components.MudToast>,
      // @ts-expect-error mud-banner iconName
      { iconName: unknown } satisfies Partial<Components.MudBanner>,
      // @ts-expect-error mud-info-box iconName
      { iconName: unknown } satisfies Partial<Components.MudInfoBox>,
      // @ts-expect-error mud-inline-message iconName
      { iconName: unknown } satisfies Partial<Components.MudInlineMessage>,
      // @ts-expect-error mud-tab iconName
      { iconName: unknown } satisfies Partial<Components.MudTab>,
      // @ts-expect-error mud-avatar iconName
      { iconName: unknown } satisfies Partial<Components.MudAvatar>,
      // @ts-expect-error mud-search-input iconName
      { iconName: unknown } satisfies Partial<Components.MudSearchInput>,
      // @ts-expect-error mud-menu-item icon
      { icon: unknown } satisfies Partial<Components.MudMenuItem>,
      // @ts-expect-error mud-sidebar-item icon
      { icon: unknown } satisfies Partial<Components.MudSidebarItem>,
      // @ts-expect-error mud-sidebar-item iconActive
      { iconActive: unknown } satisfies Partial<Components.MudSidebarItem>,
      // @ts-expect-error StepperStep iconName
      { iconName: unknown } satisfies Partial<StepperStep>,
      // @ts-expect-error TabDescriptor iconName
      { iconName: unknown } satisfies Partial<TabDescriptor>,
      // @ts-expect-error SegmentedControlSegment iconName
      { iconName: unknown } satisfies Partial<SegmentedControlSegment>,
      // @ts-expect-error BreadcrumbItem iconStart
      { iconStart: unknown } satisfies Partial<BreadcrumbItem>,
    ];
    const known: IconName = 'circle-info-filled';
    expect(surfaces).toHaveLength(15);
    expect(known).toBe('circle-info-filled');
  });
});
