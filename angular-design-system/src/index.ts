/**
 * `@age/angular-design-system` — Angular wrapper for the AGE Design
 * System Stencil components.
 *
 * Public API:
 *
 * - **Standalone Angular components** — one per Stencil web component
 *   (`CorButton`, `CorInput`, `CorTimeline`, …). Import the ones you need
 *   into a standalone component's `imports` array.
 * - **`provideDesignSystem(options?)`** — `EnvironmentProviders` factory for
 *   `bootstrapApplication`'s providers list. Wires `setAssetPath` so
 *   illustration / icon assets load from the consumer's document root.
 * - **`eventDetail<T>(event)`** — typed helper that extracts the `detail`
 *   payload from a Stencil custom event in an Angular template handler.
 * - **Component prop / event types** — `Components.CorButton`, `JSX.CorInput`,
 *   `Cor*CustomEvent<T>`, `Cor*EventDetail`, etc., re-exported from the
 *   underlying Stencil package.
 * - **Runtime enums** — every component-specific enum (`ButtonVariant`,
 *   `CorTimelineVariant`, `LinkState`, `textVariants`, …) for typed template
 *   bindings: `[variant]="ButtonVariant.PRIMARY"`.
 * - **Icon name constant + literal type** — `ICON_NAMES`, `IconName`.
 *
 * @example Bootstrap
 * ```ts
 * import { provideDesignSystem } from '@age/angular-design-system';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [provideDesignSystem()],
 * });
 * ```
 *
 * @example Component
 * ```ts
 * import {
 *   CorButton,
 *   ButtonVariant,
 *   eventDetail,
 *   type CorAccordionToggleEventDetail,
 * } from '@age/angular-design-system';
 *
 * @Component({
 *   standalone: true,
 *   imports: [CorButton],
 *   template: `
 *     <cor-button [variant]="ButtonVariant.PRIMARY">
 *       <button (click)="onClick()">Save</button>
 *     </cor-button>
 *   `,
 * })
 * export class MyComponent {
 *   readonly ButtonVariant = ButtonVariant;
 *   onAccordionToggle(event: Event): void {
 *     const { open } = eventDetail<CorAccordionToggleEventDetail>(event);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// Generated Angular standalone proxies (one per Stencil component).
export * from './directives/proxies';

// Auto-generated re-exports of upstream enums + type surface.
// Source of truth for enum/type drift: scripts/generate-public-api.mjs
export * from './public-api';

// Provider factory for application bootstrap.
export { provideDesignSystem, type DesignSystemOptions } from './provide-design-system';

// Template-handler helper for typed CustomEvent.detail extraction.
export { eventDetail } from './event-detail';
