---
type: Changed
title: collections with two APIs: the array prop wins, and warns
breaking: true
---

`mud-accordion` (`items`), `mud-breadcrumb` (`items`) and `mud-tabs` (`tabs`) each take an
array prop and declarative children. They now follow one rule: when both are set, the prop
renders, the children do not, and the component warns once. Accordion and breadcrumb already
let the prop win; `mud-tabs` rendered both, its slotted `<mud-tab>` children first.
