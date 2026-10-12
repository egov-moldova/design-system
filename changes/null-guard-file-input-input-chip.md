---
type: Fixed
title: `mud-file-input` and `mud-input-chip` treat a null or undefined model as an empty list
---

A framework form model can be `null`: Angular writes `null` on setup and on `reset()`, and a Vue `ref(null)` holds it. `mud-file-input` (`files`) and `mud-input-chip` (`chips`) iterated their list on render and threw. Both now normalise a `null` or `undefined` value to `[]` when they load and on every later assignment.
