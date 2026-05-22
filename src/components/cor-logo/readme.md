# cor-logo



<!-- Auto Generated Below -->


## Overview

Brand logo for Moldovan M-products (mpay, mpass, msign, mpower, mdelivery).

Renders the service logomark plus optional accompanying text (service name,
verb, or two-line description) based on the `variant` prop. Variant `logomark-only`
displays just the badge — used inside `cor-service-button` and other compact contexts.

## Properties

| Property    | Attribute    | Description                                                                                                         | Type                                                                                                 | Default           |
| ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------- |
| `ariaLabel` | `aria-label` | Accessible label. When provided, the logo is announced; when omitted it is decorative (aria-hidden).                | `string \| undefined`                                                                                | `undefined`       |
| `name`      | `name`       | Service identifier. Determines which logomark + text content to render.                                             | `"mdelivery" \| "mpass" \| "mpay" \| "mpower" \| "msign"`                                            | `'mpay'`          |
| `variant`   | `variant`    | Layout variant. `logomark-only` renders just the badge; other variants pair the logomark with text composed inline. | `"logomark-only" \| "with-long-name-large" \| "with-long-name-medium" \| "with-name" \| "with-verb"` | `'logomark-only'` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
