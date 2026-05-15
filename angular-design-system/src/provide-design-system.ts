import { APP_INITIALIZER, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { setAssetPath } from '@age/design-system/components';

export interface DesignSystemOptions {
  /**
   * Base URL where Stencil component assets (illustrations, icons) live.
   * The wrapper resolves files like `${assetPath}assets/illustrations/<name>.svg`.
   * Defaults to the document origin (`window.location.origin + '/'`) so consumers
   * can serve assets from their document root — matching the typical Angular CLI
   * asset-copy config that drops them under `dist/<app>/assets/illustrations/`.
   */
  assetPath?: string;
}

export function provideDesignSystem(options: DesignSystemOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {
        const base = options.assetPath ?? (typeof window !== 'undefined' ? window.location.origin + '/' : '/');
        setAssetPath(base);
      },
      multi: true,
    },
  ]);
}
