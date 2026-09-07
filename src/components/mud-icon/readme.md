# mud-icon



<!-- Auto Generated Below -->


## Overview

Icon — renders an inline SVG fetched on-demand from per-size asset files.

Names follow the Material Symbols convention: append `-filled` to the base name
to request the filled variant (e.g. `check` outlined vs `check-filled`).

When the exact `size`/`name` combination is missing from the manifest, the
provider falls back to the closest larger size (preferred) and then to the
largest smaller size before giving up.

## Properties

| Property      | Attribute     | Description                                                                                | Type                   | Default          |
| ------------- | ------------- | ------------------------------------------------------------------------------------------ | ---------------------- | ---------------- |
| `ariaLabel`   | `aria-label`  | Accessible label. When provided, the icon is announced; when omitted it is decorative.     | `string \| undefined`  | `undefined`      |
| `color`       | `color`       | Color token suffix (mapped to `--color-{value}`), or `currentColor` to inherit text color. | `string`               | `'currentColor'` |
| `disabled`    | `disabled`    | Reflects to `[disabled]` and visually disables the icon.                                   | `boolean`              | `false`          |
| `interactive` | `interactive` | Enables interactive treatment (cursor, hover, focus ring, keyboard activation).            | `boolean`              | `false`          |
| `name`        | `name`        | Icon identifier (kebab-case). Suffix `-filled` selects the filled variant.                 | `string`               | `'check'`        |
| `size`        | `size`        | Pixel size, aligned with Figma Foundations: 12 / 16 / 20 / 24.                             | `12 \| 16 \| 20 \| 24` | `16`             |


## Dependencies

### Used by

 - [mud-avatar](../mud-avatar)
 - [mud-banner](../mud-banner)
 - [mud-breadcrumb](../mud-breadcrumb)
 - [mud-checkbox](../mud-checkbox)
 - [mud-chip](../mud-chip)
 - [mud-cookie-banner](../mud-cookie-banner)
 - [mud-date-input](../mud-date-input)
 - [mud-date-picker](../mud-date-picker)
 - [mud-file-input](../mud-file-input)
 - [mud-file-item](../mud-file-item)
 - [mud-footer](../mud-footer)
 - [mud-header-mobile](../mud-header)
 - [mud-header-nav-item](../mud-header)
 - [mud-header-services-menu](../mud-header)
 - [mud-info-box](../mud-info-box)
 - [mud-inline-message](../mud-inline-message)
 - [mud-input-chip](../mud-input-chip)
 - [mud-menu-item](../mud-menu)
 - [mud-modal](../mud-modal)
 - [mud-numeric-input](../mud-numeric-input)
 - [mud-pagination](../mud-pagination)
 - [mud-phone-input](../mud-phone-input)
 - [mud-progress-tracker](../mud-progress-tracker)
 - [mud-search-input](../mud-search-input)
 - [mud-segmented-control](../mud-segmented-control)
 - [mud-select-input](../mud-select-input)
 - [mud-sidebar-item](../mud-sidebar)
 - [mud-tab](../mud-tabs)
 - [mud-table](../mud-table)
 - [mud-tabs](../mud-tabs)
 - [mud-text-input](../mud-text-input)
 - [mud-textarea](../mud-textarea)
 - [mud-toast](../mud-toast)

### Graph
```mermaid
graph TD;
  mud-avatar --> mud-icon
  mud-banner --> mud-icon
  mud-breadcrumb --> mud-icon
  mud-checkbox --> mud-icon
  mud-chip --> mud-icon
  mud-cookie-banner --> mud-icon
  mud-date-input --> mud-icon
  mud-date-picker --> mud-icon
  mud-file-input --> mud-icon
  mud-file-item --> mud-icon
  mud-footer --> mud-icon
  mud-header-mobile --> mud-icon
  mud-header-nav-item --> mud-icon
  mud-header-services-menu --> mud-icon
  mud-info-box --> mud-icon
  mud-inline-message --> mud-icon
  mud-input-chip --> mud-icon
  mud-menu-item --> mud-icon
  mud-modal --> mud-icon
  mud-numeric-input --> mud-icon
  mud-pagination --> mud-icon
  mud-phone-input --> mud-icon
  mud-progress-tracker --> mud-icon
  mud-search-input --> mud-icon
  mud-segmented-control --> mud-icon
  mud-select-input --> mud-icon
  mud-sidebar-item --> mud-icon
  mud-tab --> mud-icon
  mud-table --> mud-icon
  mud-tabs --> mud-icon
  mud-text-input --> mud-icon
  mud-textarea --> mud-icon
  mud-toast --> mud-icon
  style mud-icon fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
