import { type EnvironmentProviders, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { setAssetPath } from '@egov-moldova/mud/components';

export interface MudOptions {
  /**
   * The URL of the directory that holds the component assets, i.e. the directory whose
   * immediate child is `assets/`. REQUIRED: `mud-icon` and `mud-logo` fetch their SVGs from
   * `<assetPath>assets/...`, and there is no default that is right in every build.
   *
   * Copy `node_modules/@egov-moldova/mud/dist/components/assets` into the app's output with an
   * `angular.json` `assets` entry and pass the URL it is served at:
   *
   * ```json
   * { "glob": "**\/*", "input": "node_modules/@egov-moldova/mud/dist/components/assets", "output": "mud/assets" }
   * ```
   *
   * with `provideMud({ assetPath: 'mud/' })`. A relative URL resolves against the document's
   * base URL (`<base href>`).
   */
  assetPath: string;
}

/**
 * Registers the asset path the standalone component bundle resolves SVGs against.
 *
 * ```ts
 * bootstrapApplication(App, { providers: [provideMud({ assetPath: 'mud/' })] });
 * ```
 *
 * It does not register the form value accessors: a component that binds a `mud-*` form control
 * imports `MUD_FORM_ACCESSORS` next to `FormsModule` or `ReactiveFormsModule`, or `[(ngModel)]`
 * and `formControl` throw `No value accessor`.
 */
export function provideMud(options: MudOptions): EnvironmentProviders {
  const assetPath = options?.assetPath;
  if (typeof assetPath !== 'string' || assetPath === '') {
    throw new Error('[mud-angular] `provideMud({ assetPath })` needs a non-empty `assetPath`.');
  }
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      // A server render has no `document` global (Angular's server platform injects its own, which
      // the bundle never sees) and no component fetches an asset there: skip the setup.
      if (typeof document === 'undefined') return;
      // The bundle's `getAssetPath` builds `new URL(path, assetPath)`, which throws on a relative
      // base, and `mud-icon` swallows that throw: the icon would stay blank with no error.
      const absolute = new URL(assetPath, document.baseURI);
      if (!absolute.pathname.endsWith('/')) absolute.pathname += '/';
      setAssetPath(absolute.href);
    }),
  ]);
}
