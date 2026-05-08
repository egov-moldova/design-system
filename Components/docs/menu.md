# Menu — contract componentă (API static → Angular / React / Vue)

Documentație pentru markup-ul din `menu.html`, stilurile din `scss/components/_menu.scss` și `scss/components/_dropdown.scss` (tokeni partajați cu Select), plus scriptul de demo `js/menu-doc-variations.js`.

---

## Română

### Rolul componentei

**Menu** afișează o listă de opțiuni într-un panou (popover): fie ca **listă de selecție** (`role="listbox"`, o valoare aleasă), fie ca **meniu contextual** (`role="menu"`, acțiuni). În pagina statică, aceleași structuri BEM se repetă cu **atribute `data-*`** diferite — echivalent cu props-uri diferite într-un framework.

### Rădăcină: `div.menu`

| Atribut | Valori posibile | Utilizare |
|--------|-------------------|-----------|
| `data-variant` | `selection` \| `contextual` | **`selection`**: comportament listbox (selectare valoare). **`contextual`**: butoane `menuitem`, acțiuni / navigare contextuală. |
| `data-size` | `desktop` \| `mobile` | Densitate și tratament responsive (ex. cadru „mobile” în doc). În producție se poate mapa la breakpoint. |
| `data-truncate` | `true` \| `false` | Marchează scenarii cu text lung; se combină cu `.menu--truncate` și clase pe rând (`menu__label--multiline`). |
| `data-multiple` | `true` \| `false` | Rezervat / viitor: selecție multiplă (în scriptul de demo poate marca variații cu checkbox). |
| `data-searchable` | `true` \| `false` | Rezervat / viitor: câmp de filtrare în capul meniului. |
| `data-state` | `unselected` \| `hover` \| `selected` \| `disabled` \| … | **Doar documentare în demo static**: descrie scenariul afișat. **Nu** înlocuiește `aria-*` sau clasele de stare în producție. |

### Modificatori BEM (opțional, echivalent `data-*`)

| Clasă | Rol |
|-------|-----|
| `.menu--desktop` | Alias vizual / compatibilitate cu API pe clase (densitate „desktop”). |
| `.menu--mobile` | Alias pentru layout mobil (poate coexista cu `data-size="mobile"`). |
| `.menu--truncate` | Semnalează meniu unde etichetele pot fi tăiate / clamp pe mai multe linii. |

### Părți structurale (BEM)

| Element | Clasă | Rol |
|---------|--------|-----|
| Panou | `.menu__panel` | Suprafața cu umbră și colțuri rotunjite; echivalent `.select-dropdown` la Select. |
| Listă | `.menu__list` | `ul` cu `role="listbox"` sau `role="menu"`. |
| Rând | `.menu__item` | `li` (listbox) sau `button` în `li` (contextual). |
| Etichetă | `.menu__label` | Text opțiune. |
| Indicator selecție | `.menu__check` | Bifă vizuală pentru listbox (poate fi ascunsă în contextual în doc). |
| Leading | `.menu__leading` | Slot icon / prefix. |
| Trigger | `.menu__trigger` | Buton opțional care deschide meniul (pattern „combobox” simplu). |

### Modificatori pe rând (`.menu__item`)

| Modificator | Când se folosește |
|---------------|-------------------|
| `.menu__item--selected` | Opțiune selectată în listbox (împreună cu `aria-selected="true"`). |
| `.menu__item--hover` | **Demo static** pentru starea hover (când nu poți păstra `:hover` în captură). În producție folosește hover CSS real. |
| `.menu__item--disabled` | Opțiune inactivă (`aria-disabled` / `disabled`). |
| `.menu__item--multiline` | Text lung; eticheta folosește `.menu__label--multiline`. |
| `.menu__item--current` | Rând evidențiat în meniu contextual (ex. feedback după acțiune). |
| `.menu__item--pressed-demo` / `--focus-visible-demo` | **Doar demo** pentru stări `:active` / `:focus-visible` fixe. |

### Variabile CSS relevante (legate de Select)

Tokenii `--select-bg`, `--select-menu-shadow`, `--select-option-selected-*`, `--select-panel-border`, etc. sunt definiți pe `.menu` și refolosiți din același strat vizual ca **Select**.

### Pagina statică: `data-menu-doc-fill` pe `<ul>`

Aceste valori sunt **doar pentru documentație** — generează opțiuni în `menu-doc-variations.js`:

| Valoare | Efect |
|---------|--------|
| `selection-list` | Listbox: citește `data-option-count`, `data-selected-option`, `data-hover-option`, `data-disabled-option`, `data-long-label-option` (index **1-based**: `2` = a doua opțiune). |
| `contextual-list` | Meniu cu butoane: `data-current-option`, `data-hover-option`, `data-pressed-option`, `data-focus-option`, `data-disabled-option`, `data-long-label-option`. |
| `contextual-edge-heading` | Secțiune cu separator și heading lung (demo edge case). |
| `menu-plain-6`, `menu-icon-6`, `checkbox-6`, `radio-6`, `menu-segmented-6`, `menu-seg-heading`, `listbox-6-pointer` | Variații Figma / layout doc. |

---

## English

### Component role

**Menu** shows options in a floating panel: either a **selection list** (`role="listbox"`) or a **contextual menu** (`role="menu"`). In the static doc page, the same BEM structure is reused with different **`data-*` attributes** — the same idea as different props in a framework component.

### Root: `div.menu`

| Attribute | Allowed values | Purpose |
|-----------|----------------|---------|
| `data-variant` | `selection` \| `contextual` | **`selection`**: listbox semantics (pick one value). **`contextual`**: `menuitem` buttons, commands / navigation. |
| `data-size` | `desktop` \| `mobile` | Density and responsive treatment (e.g. mobile frame in docs). Map to breakpoints in the real app. |
| `data-truncate` | `true` \| `false` | Marks long-label scenarios; combine with `.menu--truncate` and row classes (`menu__label--multiline`). |
| `data-multiple` | `true` \| `false` | Reserved / future: multi-select (may tag checkbox variations in demos). |
| `data-searchable` | `true` \| `false` | Reserved / future: filter slot above the list. |
| `data-state` | `unselected` \| `hover` \| `selected` \| `disabled` \| … | **Documentation only** in static HTML: describes the showcased scenario. **Does not** replace `aria-*` or production state classes. |

### BEM modifiers (optional, parallel to `data-*`)

| Class | Role |
|-------|------|
| `.menu--desktop` | Visual alias / class-first API compatibility. |
| `.menu--mobile` | Mobile layout alias (can pair with `data-size="mobile"`). |
| `.menu--truncate` | Menu where labels may be line-clamped / ellipsized. |

### Structural parts (BEM)

| Part | Class | Role |
|------|--------|------|
| Panel | `.menu__panel` | Shadowed surface; pairs visually with `.select-dropdown`. |
| List | `.menu__list` | `ul` with `role="listbox"` or `role="menu"`. |
| Row | `.menu__item` | `li` (listbox) or `button` inside `li` (contextual). |
| Label | `.menu__label` | Option text. |
| Check | `.menu__check` | Selection checkmark (may be hidden for contextual in docs). |
| Leading | `.menu__leading` | Icon / prefix slot. |
| Trigger | `.menu__trigger` | Optional button that opens the menu. |

### Row modifiers (`.menu__item`)

| Modifier | When to use |
|----------|-------------|
| `.menu__item--selected` | Selected listbox row (with `aria-selected="true"`). |
| `.menu__item--hover` | **Static demo** for hover when you cannot persist `:hover` in a screenshot. Use real CSS hover in production. |
| `.menu__item--disabled` | Disabled row (`aria-disabled` / `disabled`). |
| `.menu__item--multiline` | Long text; label uses `.menu__label--multiline`. |
| `.menu__item--current` | Highlighted row in a contextual menu (e.g. after an action). |
| `.menu__item--pressed-demo` / `--focus-visible-demo` | **Demo only** for frozen `:active` / `:focus-visible` states. |

### Static doc page: `data-menu-doc-fill` on `<ul>`

These values are **documentation-only** — they populate lists in `menu-doc-variations.js`:

| Value | Effect |
|-------|--------|
| `selection-list` | Listbox: reads `data-option-count`, `data-selected-option`, `data-hover-option`, `data-disabled-option`, `data-long-label-option` (**1-based** index: `2` = second option). |
| `contextual-list` | Button menu: `data-current-option`, `data-hover-option`, `data-pressed-option`, `data-focus-option`, `data-disabled-option`, `data-long-label-option`. |
| `contextual-edge-heading` | Divider + long heading block + options (edge case). |
| `menu-plain-6`, `menu-icon-6`, `checkbox-6`, `radio-6`, `menu-segmented-6`, `menu-seg-heading`, `listbox-6-pointer` | Figma / layout variations. |

### Related files

- `Components/menu.html` — examples  
- `Components/scss/components/_menu.scss` — Menu tokens + layout hooks  
- `Components/scss/components/_dropdown.scss` — shared row/panel styles (`.menu__*` + `.select-*`)  
- `Components/js/menu-doc-variations.js` — fills demo lists from `data-menu-doc-fill`  
- `Components/js/menu-doc-breakpoints.js` — demo interactions on the doc page  
