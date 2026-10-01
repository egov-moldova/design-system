import { setAssetPath } from '@egov-moldova/mud/components';

export interface MudSetupOptions {
  /**
   * The URL of the directory that holds the component assets, i.e. the directory whose
   * immediate child is `assets/`. REQUIRED: `mud-icon` and `mud-logo` fetch their SVGs from
   * `<assetPath>assets/...`, and there is no default that is right in every build.
   *
   * Copy `node_modules/@egov-moldova/mud/dist/components/assets` into the app's served output
   * (Vite `public/`, a copy plugin, or the framework's static folder) and pass the URL it is
   * served at. A relative URL resolves against the document's base URL.
   */
  assetPath: string;
}

/**
 * The absolute directory URL the standalone bundle's `getAssetPath` needs: it builds
 * `new URL(path, assetPath)`, which throws on a relative base, and `mud-icon` swallows that
 * throw, so the icon would stay blank with no error.
 */
export function toAssetBaseUrl(assetPath: string, baseURI: string): string {
  let absolute: URL;
  try {
    absolute = new URL(assetPath, baseURI);
  } catch {
    // An opaque base (`about:blank`, a srcdoc iframe) cannot resolve a relative path.
    throw new Error(
      `[mud-react] cannot resolve assetPath "${assetPath}" against the document base "${baseURI}"; pass an absolute URL.`,
    );
  }
  if (!absolute.pathname.endsWith('/')) absolute.pathname += '/';
  return absolute.href;
}

/**
 * Registers the asset path the standalone component bundle resolves SVGs against. Call it
 * once at startup, before the first render:
 *
 * ```ts
 * setupMud({ assetPath: `${import.meta.env.BASE_URL}mud/` });
 * ```
 *
 * It registers no element: every wrapper registers its own element, and the elements it
 * renders, when it is imported. A raw `<mud-x>` tag needs its wrapper imported, or
 * `defineCustomElement` from `@egov-moldova/mud/components/mud-x.js` called.
 *
 * A second call replaces the path the first one set.
 */
export function setupMud(options: MudSetupOptions): void {
  const assetPath: unknown = options?.assetPath;
  // A blank path would resolve to the document's own URL and 404 every asset without a message.
  if (typeof assetPath !== 'string' || assetPath.trim() === '') {
    throw new Error('[mud-react] `setupMud({ assetPath })` needs a non-empty `assetPath`.');
  }
  // A server render has no `document`, and no component fetches an asset there: skip the setup.
  if (typeof document === 'undefined') return;
  setAssetPath(toAssetBaseUrl(assetPath, document.baseURI));
}

export type DefineCustomElementsOptions = {
  /** See {@link MudSetupOptions.assetPath}. Defaults to `<origin>/node_modules/@egov-moldova/mud/dist/components/`, which only a dev server that exposes `node_modules` serves. */
  assetPath?: string;
};

/**
 * @deprecated Use {@link setupMud}, which requires `assetPath`. This alias registers no
 * element either (see `setupMud`); it only sets the asset path, defaulting to the
 * `node_modules` URL of a Vite dev server. Kept so linked consumers keep compiling. Unlike the
 * old alias it is not idempotent: a later call replaces the path an earlier one set, so a bare
 * second call resets an explicit path to the dev default.
 */
export function defineCustomElements(opts?: DefineCustomElementsOptions): Promise<void> {
  if (opts?.assetPath !== undefined) {
    // Validated on the server too, so a bad path fails the server render, not only the hydration.
    setupMud({ assetPath: opts.assetPath });
  } else if (typeof document !== 'undefined') {
    setupMud({ assetPath: new URL('/node_modules/@egov-moldova/mud/dist/components/', window.location.origin).href });
  }
  return Promise.resolve();
}
