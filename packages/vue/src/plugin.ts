import { setAssetPath } from '@egov-moldova/mud/components';
import type { Plugin } from 'vue';

export interface MudPluginOptions {
  /**
   * The URL of the directory that holds the component assets, i.e. the directory whose
   * immediate child is `assets/`. REQUIRED: `mud-icon` and `mud-logo` fetch their SVGs from
   * `<assetPath>assets/...`, and there is no default that is right in every build.
   *
   * Copy `node_modules/@egov-moldova/mud/dist/components/assets` into the app's served output
   * (Vite `public/` or a copy plugin) and pass the URL it is served at, for example
   * `import.meta.env.BASE_URL` when the folder is `public/assets`. A relative URL resolves
   * against the document's base URL.
   */
  assetPath: string;
}

/**
 * Registers the asset path the standalone component bundle resolves SVGs against.
 *
 * ```ts
 * app.use(Mud, { assetPath: import.meta.env.BASE_URL });
 * ```
 *
 * The wrapped components register themselves when they are imported and need no
 * `isCustomElement` option.
 */
export const Mud: Plugin<MudPluginOptions> = {
  install(_app, options) {
    if (typeof options?.assetPath !== 'string' || options.assetPath === '') {
      throw new Error('[mud-vue] `app.use(Mud, { assetPath })` needs a non-empty `assetPath`.');
    }
    // A server render has no `document`, and no component fetches an asset there: skip the setup.
    if (typeof document === 'undefined') return;
    // The bundle's `getAssetPath` builds `new URL(path, assetPath)`, which throws on a relative
    // base, and `mud-icon` swallows that throw: the icon would stay blank with no error.
    const absolute = new URL(options.assetPath, document.baseURI);
    if (!absolute.pathname.endsWith('/')) absolute.pathname += '/';
    setAssetPath(absolute.href);
  },
};
