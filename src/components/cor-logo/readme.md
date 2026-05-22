# cor-logo



<!-- Auto Generated Below -->


## Overview

Brand logo for Moldovan M-products.

Each `name × variant` combination resolves to a single self-contained SVG —
logomark and any accompanying wordmark/description are baked as vector paths
(no live text in the DOM). The component fetches and renders that SVG into
shadow DOM; layout follows the SVG's intrinsic dimensions.

## Properties

| Property    | Attribute    | Description                                                                                                                         | Type                                                                                                                              | Default           |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `ariaLabel` | `aria-label` | Accessible label. When provided, the logo is announced; when omitted it is decorative (aria-hidden).                                | `string \| undefined`                                                                                                             | `undefined`       |
| `name`      | `name`       | Service identifier. Determines which logo composition is rendered.                                                                  | `"mcloud" \| "mconnect" \| "mdelivery" \| "mdocs" \| "mlearn" \| "mlog" \| "mnotify" \| "mpass" \| "mpay" \| "mpower" \| "msign"` | `'mpay'`          |
| `variant`   | `variant`    | Layout variant. `logomark-only` renders just the badge; other variants pair the logomark with vectorised wordmark/description text. | `"logomark-only" \| "with-long-name-large" \| "with-long-name-medium" \| "with-name" \| "with-verb"`                              | `'logomark-only'` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
