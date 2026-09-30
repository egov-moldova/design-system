---
type: Deprecated
title: `mud-accordion` `items`
---

A panel body from `items` can only be plain text (`content` is a string), and rich content is
what an accordion panel is for. Setting `items` warns once; it goes away in the next major.

**Migration:** slot `<mud-accordion-item>` children, with the panel body as their content.
