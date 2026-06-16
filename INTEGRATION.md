# INTEGRATION.md — consuming `@egovmd/mud` outside a bundler

This guide is for integrators who want to drop MUD components into a host that **emits HTML directly**: a static page, a server-rendered template (PHP, Razor, Twig, Blade), or a `WebView` in a desktop app. For bundler-based installs (Vite, Webpack, Rollup, esbuild), see [`README.md`](./README.md).

Because Stencil compiles every `mud-*` component to a **W3C-standard Custom Element**, the integration story is the same everywhere a browser engine renders HTML. The only thing that changes between hosts is *how you ship the asset files* and *how you set non-string props*.

---

## Table of contents

1. [What the build emits](#1-what-the-build-emits)
2. [The three-line integration](#2-the-three-line-integration)
3. [Plain HTML / static site](#3-plain-html--static-site)
4. [PHP (Laravel, Symfony, WordPress, raw PHP)](#4-php-laravel-symfony-wordpress-raw-php)
5. [.NET (Razor, Blazor, MAUI, WPF/WinForms)](#5-net-razor-blazor-maui-wpfwinforms)
6. [Setting non-string props (objects, arrays)](#6-setting-non-string-props-objects-arrays)
7. [Listening to custom events](#7-listening-to-custom-events)
8. [Dark mode](#8-dark-mode)
9. [Hosting & cache strategy](#9-hosting--cache-strategy)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What the build emits

After `yarn build`, the relevant artifacts live in `dist/mud/`:

| File / folder | Purpose | Required? |
|---|---|---|
| `mud.esm.js` | Lazy-loader entry. Discovers and `import()`s component chunks on demand. | **Yes** |
| `mud.css` | Global base styles (reset, body defaults, focus ring helpers). | **Yes** |
| `tokens/core.tokens.css` | Light-theme CSS variables (palette + semantic). | **Yes** |
| `tokens/core.dark.tokens.css` | Dark-theme overrides, scoped under `[data-theme='dark']`. | Recommended |
| `p-*.js` chunks | One per component, lazy-loaded by the entry. | Auto-served alongside the entry |
| `assets/` | SVG sprites (used by `mud-icon`, `mud-logo`, …). Resolved via `import.meta.url` of the entry. | **Yes** — keep relative to `mud.esm.js` |

> **Critical:** ship the *entire* `dist/mud/` directory as one unit. The lazy loader uses `import.meta.url` to locate chunks and assets — moving or renaming individual files will break asset resolution at runtime.

---

## 2. The three-line integration

Anywhere you control the `<head>`:

```html
<link rel="stylesheet" href="/mud/tokens/core.tokens.css">
<link rel="stylesheet" href="/mud/mud.css">
<script type="module" src="/mud/mud.esm.js"></script>
```

Optional — opt into dark mode by including the dark tokens *and* setting `data-theme="dark"` on `<html>`:

```html
<link rel="stylesheet" href="/mud/tokens/core.dark.tokens.css">
```

That's it. From now on, `<mud-button>`, `<mud-icon>`, `<mud-modal>`, etc. work as native HTML tags.

---

## 3. Plain HTML / static site

Copy `dist/mud/` to your site's static folder (e.g. `public/mud/`) and reference it from the page:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>MUD demo</title>

    <link rel="stylesheet" href="/mud/tokens/core.tokens.css">
    <link rel="stylesheet" href="/mud/tokens/core.dark.tokens.css">
    <link rel="stylesheet" href="/mud/mud.css">
    <script type="module" src="/mud/mud.esm.js"></script>
  </head>
  <body>
    <mud-button variant="primary">Save</mud-button>
    <mud-icon name="check" size="md"></mud-icon>

    <mud-modal id="confirm" heading="Delete record?">
      <p slot="body">This action cannot be undone.</p>
      <mud-button slot="footer" variant="primary">Delete</mud-button>
    </mud-modal>
  </body>
</html>
```

### CDN alternative (no copy step)

The package declares `"unpkg": "dist/mud/mud.esm.js"`, so any npm-mirroring CDN works once the package is published. **Always pin a version and use Subresource Integrity (SRI) — without it, a CDN compromise silently runs attacker code on every page that loads the script.**

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/@egovmd/mud@0.0.1/dist/mud/tokens/core.tokens.css"
  integrity="sha384-REPLACE_WITH_REAL_HASH"
  crossorigin="anonymous">
<link
  rel="stylesheet"
  href="https://unpkg.com/@egovmd/mud@0.0.1/dist/mud/mud.css"
  integrity="sha384-REPLACE_WITH_REAL_HASH"
  crossorigin="anonymous">
<script
  type="module"
  src="https://unpkg.com/@egovmd/mud@0.0.1/dist/mud/mud.esm.js"
  integrity="sha384-REPLACE_WITH_REAL_HASH"
  crossorigin="anonymous"></script>
```

Generate hashes locally against the exact published files:

```bash
curl -sL https://unpkg.com/@egovmd/mud@0.0.1/dist/mud/mud.esm.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

> **Important caveat:** SRI protects the *entry* file but cannot cover the lazy-loaded `p-*.js` chunks that `mud.esm.js` imports dynamically — the browser has no `integrity` attribute on dynamic `import()`. If your threat model includes CDN compromise, **self-host the build** (section 3 default) and apply SRI plus normal asset-pipeline integrity at your origin. CDN delivery is best for prototypes, internal tools, and demos.

---

## 4. PHP (Laravel, Symfony, WordPress, raw PHP)

PHP only emits HTML, so the integration is the **same as section 3**. The only difference is asset-URL helpers per framework.

### Laravel / Blade

```blade
{{-- resources/views/layouts/app.blade.php --}}
<head>
  <link rel="stylesheet" href="{{ asset('age/tokens/core.tokens.css') }}">
  <link rel="stylesheet" href="{{ asset('age/mud.css') }}">
  <script type="module" src="{{ asset('age/mud.esm.js') }}"></script>
</head>

<body>
  <mud-button variant="primary">{{ __('Save') }}</mud-button>
</body>
```

Place the build under `public/age/` and the helper produces the right path.

### Symfony / Twig

```twig
{# templates/base.html.twig #}
<link rel="stylesheet" href="{{ asset('age/tokens/core.tokens.css') }}">
<link rel="stylesheet" href="{{ asset('age/mud.css') }}">
<script type="module" src="{{ asset('age/mud.esm.js') }}"></script>
```

### WordPress

Custom elements with hyphens are valid HTML5; WordPress's wpautop and KSES filters will *not* strip them, but they will strip unknown *attributes* on some posts. Enqueue assets in your theme's `functions.php`:

```php
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('age-tokens', get_template_directory_uri() . '/age/tokens/core.tokens.css', [], null);
    wp_enqueue_style('age-base',   get_template_directory_uri() . '/age/mud.css',     [], null);
    wp_enqueue_script('age-loader', get_template_directory_uri() . '/age/mud.esm.js', [], null, true);
});

// Make the loader a module — WP wraps scripts in classic <script> by default.
add_filter('script_loader_tag', function ($tag, $handle) {
    if ($handle === 'age-loader') {
        return str_replace('<script ', '<script type="module" ', $tag);
    }
    return $tag;
}, 10, 2);
```

### Raw PHP

```php
<link rel="stylesheet" href="/age/tokens/core.tokens.css">
<link rel="stylesheet" href="/age/mud.css">
<script type="module" src="/age/mud.esm.js"></script>

<mud-button variant="primary"><?= htmlspecialchars($label) ?></mud-button>
```

---

## 5. .NET (Razor, Blazor, MAUI, WPF/WinForms)

### 5a. ASP.NET MVC / Razor Pages

Identical to PHP — server renders HTML, browser does the rest. Drop the build under `wwwroot/age/`:

```cshtml
@* Views/Shared/_Layout.cshtml *@
<head>
  <link rel="stylesheet" href="~/age/tokens/core.tokens.css" />
  <link rel="stylesheet" href="~/age/mud.css" />
  <script type="module" src="~/age/mud.esm.js"></script>
</head>

<body>
  <mud-button variant="primary">@Localizer["Save"]</mud-button>
</body>
```

### 5b. Blazor Server / Blazor WebAssembly

Blazor (≥ .NET 7) renders custom elements natively. Attributes, slots, and `@onclick` work without ceremony:

```razor
@* Pages/Demo.razor *@
<mud-button variant="primary" @onclick="HandleClick">
  Save
</mud-button>

<mud-modal heading="Confirm">
  <p slot="body">Are you sure?</p>
</mud-modal>

@code {
    void HandleClick() => Console.WriteLine("clicked");
}
```

Add the assets in `App.razor` (or `_Host.cshtml` for Server) and `wwwroot/index.html` (for WASM):

```html
<link rel="stylesheet" href="age/tokens/core.tokens.css" />
<link rel="stylesheet" href="age/mud.css" />
<script type="module" src="age/mud.esm.js"></script>
```

Three caveats specific to Blazor:

1. **Object/array props** must be set via JS interop. See [section 6](#6-setting-non-string-props-objects-arrays).
2. **Custom events** (`corChange`, `corSelect`, …) need an `[EventHandler]` registration or a JS wrapper. See [section 7](#7-listening-to-custom-events).
3. **Render mode**: in interactive Server mode, the first SSR pass emits the tags *before* `mud.esm.js` runs. That is fine — custom elements upgrade automatically on `customElements.define`. But any JS interop that sets a property must wait for upgrade:

   ```csharp
   await JS.InvokeVoidAsync(
       "eval",
       """
       customElements.whenDefined('mud-select').then(() => {
         document.getElementById('mySelect').options = ...;
       });
       """);
   ```

### 5c. MAUI Blazor Hybrid

Same as Blazor WebAssembly. Assets ship inside `wwwroot/` and are served by the embedded WebView2 (Windows) or WKWebView (macOS/iOS).

### 5d. WPF / WinForms (desktop)

Custom elements only work in a **WebView2** control — there is no native HTML rendering in Win32. Embed a local HTML page exactly as in [section 3](#3-plain-html--static-site) and load it:

```csharp
await webView.EnsureCoreWebView2Async();
webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
    "app.local", "Resources/age", CoreWebView2HostResourceAccessKind.Allow);
webView.Source = new Uri("https://app.local/index.html");
```

---

## 6. Setting non-string props (objects, arrays)

HTML attributes are strings. Several AGE components accept structured data via **JS properties** instead — for example:

- `<mud-select>` → `.options = [{ label, value }, …]`
- `<mud-breadcrumb>` → `.items = [{ label, href }, …]`
- `<mud-receipt>` → `.lineItems = [...]`

For these, the attribute form (`options='[…]'`) does **not** work. You must wait for the custom element to upgrade, then assign the property:

```html
<mud-select id="country"></mud-select>

<script type="module">
  customElements.whenDefined('mud-select').then(() => {
    const el = document.getElementById('country');
    el.options = [
      { label: 'Romania', value: 'RO' },
      { label: 'Moldova', value: 'MD' },
    ];
  });
</script>
```

In Blazor, do the same via `IJSRuntime`:

```csharp
@inject IJSRuntime JS

<mud-select @ref="selectRef"></mud-select>

@code {
    ElementReference selectRef;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;
        await JS.InvokeVoidAsync("setCorProp", selectRef, "options", new[] {
            new { label = "Romania", value = "RO" },
            new { label = "Moldova", value = "MD" },
        });
    }
}
```

`setCorProp` is a small helper you ship once:

```js
// wwwroot/age-interop.js
window.setCorProp = async (el, prop, value) => {
  await customElements.whenDefined(el.tagName.toLowerCase());
  el[prop] = value;
};
```

---

## 7. Listening to custom events

AGE components dispatch namespaced events (`corChange`, `corSelect`, `corClose`, …). DOM listeners work everywhere:

```html
<mud-modal id="m"></mud-modal>
<script type="module">
  document.getElementById('m').addEventListener('corClose', e => {
    console.log('closed', e.detail);
  });
</script>
```

In Blazor, register the event name once so Razor's `@oncorclose` directive resolves. Create a small assembly with:

```csharp
[EventHandler("oncorclose", typeof(EventArgs), enableStopPropagation: true, enablePreventDefault: true)]
public static class CorEventHandlers { }
```

Reference it from `_Imports.razor`:

```razor
@using YourApp.JsInterop
```

Then:

```razor
<mud-modal @oncorclose="HandleClose"></mud-modal>
```

Alternative without `[EventHandler]`: attach the listener manually in `OnAfterRenderAsync` via `JSInterop` and forward to a `DotNetObjectReference`.

---

## 8. Dark mode

The dark stylesheet scopes its overrides to `[data-theme='dark']`. To switch modes, toggle the attribute on `<html>`:

```js
document.documentElement.dataset.theme = 'dark'; // or 'light'
```

Pattern with `prefers-color-scheme` fallback + persistence:

```js
const stored = localStorage.getItem('theme');
const dark = stored
  ? stored === 'dark'
  : matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = dark ? 'dark' : 'light';
```

You can also scope dark mode to a subtree — apply `data-theme="dark"` to any wrapping element and only its descendants flip.

---

## 9. Hosting & cache strategy

- **Same-origin or CORS**: ESM module imports honor CORS. If you host the build on a CDN under a different origin than your page, the CDN must respond with `Access-Control-Allow-Origin`. unpkg and jsDelivr already do.
- **Subresource Integrity (SRI)**: any third-party-hosted asset (CDN, partner domain) must carry `integrity="sha384-…"` + `crossorigin="anonymous"`. Note that SRI only covers files referenced directly in markup; lazy-loaded chunks emitted by Stencil cannot be SRI-protected because they are pulled via dynamic `import()`. Self-hosting eliminates this gap entirely — prefer it for production.
- **MIME type**: `.js` files must be served as `application/javascript` (or `text/javascript`). Some legacy servers default to `application/octet-stream` for unknown extensions and the browser will refuse to execute the module. Configure your server to send the right MIME for `.js`, `.css`, and `.svg`.
- **Cache headers**: chunks (`p-*.js`) are content-hashed, so they can be served with `Cache-Control: public, max-age=31536000, immutable`. The entry file `mud.esm.js` is **not** hashed — give it a short cache (e.g. 5 minutes) or version it via your asset pipeline.
- **Compression**: enable Brotli/gzip on `.js`, `.css`, `.svg`. The unminified ESM is ~3 KB but each component chunk benefits significantly.
- **CSP**: the loader uses dynamic `import()` and inline source maps in dev. Production builds are CSP-friendly with `script-src 'self'` plus a nonce — call `setNonce('<your-nonce>')` from `@egovmd/mud/loader` before the loader runs:

  ```html
  <script type="module" nonce="abc123">
    import { setNonce } from '/age/loader/index.js';
    setNonce('abc123');
  </script>
  ```

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `<mud-button>` renders as plain text, no styling | The loader didn't run, or chunks 404 | Open DevTools → Network. If `mud.esm.js` is 200 but `p-*.js` chunks are 404, the folder is split — re-deploy `dist/mud/` as a whole. |
| Icons render as blank squares | Asset resolution failed | The SVG sprite path is derived from `mud.esm.js`'s URL. Ensure `dist/mud/assets/` is co-located with the entry. |
| Modal/popover positioned wrong | Tokens not loaded | Verify `core.tokens.css` is in the document *before* `mud.css`. Otherwise component CSS resolves variables to their fallback. |
| Dark mode doesn't apply | Missing dark tokens or wrong attribute | Confirm `core.dark.tokens.css` is linked **and** `<html data-theme="dark">` is set. |
| Blazor: `e.target.value` is empty in event handler | Stencil emits typed `CustomEvent`; `value` lives on `event.detail`, not on the target | Use `e.Detail` (Blazor) or `e.detail` (JS). |
| `<mud-select>` shows no options after data load | Tried to set `options` as an attribute | Set the JS property after `customElements.whenDefined()`. See [section 6](#6-setting-non-string-props-objects-arrays). |
| Console warns "Lit is in dev mode" or similar from Stencil | You shipped the dev build (`stencil build --dev`) | Run a production build (`yarn build`) and deploy the `dist/` from that run. |
| CSP blocks the loader | `script-src` doesn't allow dynamic imports / your nonce | Add a nonce, call `setNonce()`, or relax to `'self'` for module sources. |

---

## See also

- [`README.md`](./README.md) — full build + bundler-based install guide
- [`STACK.md`](./STACK.md) — stack overview (Stencil 4.x, Style Dictionary, Storybook)
- [`DESIGN.md`](./DESIGN.md) — design tokens, theming, naming
- Storybook (when published) — live API docs per component
- `web-components/demo/` — runnable vanilla-HTML examples per component (`yarn demo.web`)
