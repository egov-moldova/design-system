---
type: Changed
title: "`mud-phone-input` offers every country, not 15"
---

The country picker lists every country that has a phone numbering plan (245), each with its flag,
calling code, input mask and number length, Moldova first and the rest sorted by the displayed name;
the search field narrows it by name, calling code or ISO code. Before, only 15 countries were
offered.

The table is generated from libphonenumber's metadata (`yarn countries.sync`, pinned and
hash-checked), not typed. The length window is that of mobile numbers, which is how the 15
hand-set rows were set; it reproduces all 15. Those 15 keep their own masks. For the other 230 the
mask follows the grouping of an example mobile number, so a landline may be printed differently.

Several countries share a calling code (+1 by 25, +7, +44 ...). A pasted international number cannot
tell them apart, so it is read as the main country of the code: +1 as the United States, +7 as
Russia, +44 as the United Kingdom, +358 as Finland. The others are chosen from the list. A flag is
requested only when its row comes near the visible part of the list (opening it fetches about 55 KB
of flags, not the whole set).

**Migration:** to keep the previous list, pass the whitelist:
`countries = ['MD', 'RO', 'RU', 'UA', 'US', 'GB', 'DE', 'FR', 'IT', 'ES', 'PT', 'IL', 'TR', 'BG', 'GR']`.
