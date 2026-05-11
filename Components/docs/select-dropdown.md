# Select (Dropdown) — contract componentă (API static → Angular / React / Vue)

Documentație pentru **`custom-select`** din `dropdown.html`, stilurile din `scss/components/_dropdown.scss` și comportamentul din `js/dropdown-select.js` (clasă `CustomSelect`).

---

## Română

### Rolul componentei

**Select** este un control de formular: un **trigger** (`.select-control`) afișează valoarea curentă și deschide un **panou** (`.select-dropdown`) cu lista de opțiuni (`.select-list` / `.select-option`). Scriptul se atașează numai dacă există `data-select` pe rădăcină.

### Rădăcină: `div.custom-select`

| Atribut | Valori posibile | Utilizare |
|---------|-----------------|-----------|
| `data-select` | (prezent / absent) | **Prezent**: inițializează `CustomSelect` în `dropdown-select.js`. **Absent**: markup static fără comportament JS. |
| `data-size` | `medium` \| `large` | Înălțimea triggerului, font și iconiță săgeată; tokeni CSS (`--select-min-height`, etc.). |
| `data-variant` | (omit / implicit) \| `destructive` \| `warning` \| `success` | Paleta semantică: bordură, focus, culoare text la opțiunea selectată (ex. „destructive” = roșu). |
| `data-placeholder` | string | Text afișat când nu există valoare sau înainte de selecție (clasa `is-placeholder` pe `.select-value`). |
| `data-multiple` | `true` \| `false` | Selecție multiplă din listă (comportament în `CustomSelect`). |
| `data-searchable` | `true` \| `false` | Afișează câmp de căutare în panou și filtrează opțiunile. |
| `data-required` | `true` \| `false` | Marchează câmp obligatoriu (`aria-required` pe control și listă). |
| `data-select-default-value` | string | Trebuie să corespundă cu `data-value` pe una din `.select-option`; preselectează acea opțiune la inițializare. |
| `data-doc-static-hover` | `true` | **Doar demo**: păstrează clasa de hover pe trigger pentru capturi Figma. |
| `data-doc-static-focus` | `true` | **Doar demo**: păstrează focus vizual pe trigger. |
| `data-doc-open-default` | `true` | **Doar demo**: panou deschis implicit la încărcare (dacă este implementat în script). |
| `aria-disabled` | `true` | Dezactivează întreg controlul; nu deschide lista. |
| `aria-labelledby` | id-uri | Leagă eticheta vizibilă (`label`) de control pentru cititoare de ecran. |

### Trigger: `button.select-control`

| Atribut | Valori | Utilizare |
|---------|--------|-----------|
| `aria-expanded` | `true` \| `false` | Setat de script: panou deschis / închis. |
| `aria-haspopup` | `listbox` | Rolul popup-ului (setat de script). |
| `aria-labelledby` | id | Etichetă accesibilă. |

### Panou: `div.select-dropdown`

| Atribut | Rol |
|---------|-----|
| `hidden` | Ascunde panoul când nu e deschis (înainte de CSS/JS). |
| `role="presentation"` | Wrapper neutru; semantica listei e pe `ul`. |

### Listă: `ul.select-list`

| Atribut | Utilizare |
|---------|-----------|
| `role="listbox"` | Rol listă selecție. |
| `aria-labelledby` | Legătură cu eticheta. |
| `tabindex="-1"` | Focus programatic la navigare cu tastatura. |
| `data-select-inject` | Cheie în `dropdown-select.js`: injectează setul de opțiuni (ex. `country`) din date locale scriptului. |

### Opțiune: `li.select-option` sau element cu clasă echivalentă

| Atribut | Utilizare |
|---------|-----------|
| `role="option"` | Setat de script pe opțiuni. |
| `aria-selected` | Selectat sau nu. |
| `data-value` | Valoare stabilă trimisă la formular / comparată cu `data-select-default-value`. |

### Variabile CSS (tokeni)

Pe `.custom-select` se definesc `--select-bg`, `--select-border`, `--select-focus-ring`, `--select-option-selected-*`, `--select-menu-shadow`, etc. — aceleași familii folosite și de **Menu** pentru consistență vizuală.

### Fișiere înrudite

- `Components/dropdown.html` — exemple  
- `Components/js/dropdown-select.js` — `CustomSelect`, inițializare `[data-select]`  
- `Components/scss/components/_dropdown.scss` — stiluri Select + părți comune cu Menu  

---

## English

### Component role

**Select** is a form control: a **trigger** (`.select-control`) shows the current value and opens a **panel** (`.select-dropdown`) with the option list (`.select-list` / `.select-option`). Enhancement runs only when `data-select` is present on the root.

### Root: `div.custom-select`

| Attribute | Allowed values | Purpose |
|-----------|----------------|---------|
| `data-select` | (present / absent) | **Present**: bootstraps `CustomSelect` in `dropdown-select.js`. **Absent**: static markup without JS behaviour. |
| `data-size` | `medium` \| `large` | Trigger height, font and chevron size; drives CSS variables. |
| `data-variant` | (omit) \| `destructive` \| `warning` \| `success` | Semantic palette: border, focus ring, selected option text colour. |
| `data-placeholder` | string | Text when empty / before selection (`is-placeholder` on `.select-value`). |
| `data-multiple` | `true` \| `false` | Multi-select from the list. |
| `data-searchable` | `true` \| `false` | Search field in panel + filtered options. |
| `data-required` | `true` \| `false` | Required field (`aria-required`). |
| `data-select-default-value` | string | Must match a `.select-option`’s `data-value`; preselects that option. |
| `data-doc-static-hover` | `true` | **Demo only**: keeps hover styling on trigger for screenshots. |
| `data-doc-static-focus` | `true` | **Demo only**: keeps focus styling on trigger. |
| `data-doc-open-default` | `true` | **Demo only**: panel starts open if implemented. |
| `aria-disabled` | `true` | Disables the whole control; list does not open. |
| `aria-labelledby` | ids | Associates visible `<label>` with the control for assistive tech. |

### Trigger: `button.select-control`

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `aria-expanded` | `true` \| `false` | Managed by script: panel open / closed. |
| `aria-haspopup` | `listbox` | Popup semantics (set by script). |

### Panel: `div.select-dropdown`

| Attribute | Purpose |
|-----------|---------|
| `hidden` | Hides panel when closed. |
| `role="presentation"` | Neutral wrapper; list semantics live on `ul`. |

### List: `ul.select-list`

| Attribute | Purpose |
|-----------|---------|
| `role="listbox"` | Selection list role. |
| `aria-labelledby` | Label association. |
| `tabindex="-1"` | Programmatic focus for keyboard nav. |
| `data-select-inject` | Key in `dropdown-select.js` to inject option sets (e.g. `country`). |

### Option row

| Attribute | Purpose |
|-----------|---------|
| `role="option"` | Applied by script. |
| `aria-selected` | Selected state. |
| `data-value` | Stable value for forms / matching `data-select-default-value`. |

### Related files

- `Components/dropdown.html`  
- `Components/js/dropdown-select.js`  
- `Components/scss/components/_dropdown.scss`  
