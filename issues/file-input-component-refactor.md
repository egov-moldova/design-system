# File Input Component — Design System → Blazor Sync

**Branch:** `review/file-input`  
**Scope:** `Components/input-file.html`, `Components/js/file-input.js`, `Components/scss/components/forms/_file-input.scss`, `Components/scss/abstracts/_tokens.scss`

---

## Summary

The File Input component has been significantly refactored in the HTML design library. The Blazor component library must be brought into sync with these changes.

---

## 1. DOM Structure Changes

### Upload item — new nested layout

**Before:**
```html
<div class="upload__item">
  <div class="upload__thumb">pdf</div>
  <div class="upload__info">...</div>
  <button class="upload__remove">...</button>
</div>
```

**After:**
```html
<div class="upload__item">
  <div class="upload__item__main">
    <div class="upload__thumb"><img src="assets/icons/upload-icon.svg" alt="" aria-hidden="true"></div>
    <div class="upload__info">...</div>
    <button class="upload__remove">...</button>
  </div>
  <!-- only present when there is an error message -->
  <div class="upload__item__error-section">
    <span class="upload__item__error-message">File exceeds size limit, max size is 100 MB</span>
  </div>
</div>
```

Key points:
- `upload__item` is now a **wrapper**, not the flex row itself
- `upload__item__main` carries the `display: flex` layout (was on `upload__item`)
- `upload__item__error-section` is a **new element** — only rendered when there is an error message; has a top divider via `::before` pseudo-element
- `upload__item__error-message` is a new inline `<span>` holding the error text

### Thumb icon changed

- **Before:** file extension text (`pdf`, `jpg`, …) as `textContent`
- **After:** `<img src="assets/icons/upload-icon.svg" alt="" aria-hidden="true">` — generic upload icon SVG
- Thumb is **omitted entirely** from `upload__item__main` when the item is in error state

### Dropzone — active content slot

```html
<div class="dropzone" tabindex="0">
  <div class="dropzone__content">...</div>
  <!-- NEW: shown only while drag is active -->
  <span class="dropzone__content--active">Drop files to upload</span>
  <input type="file" hidden>
</div>
```

### Dropzone — disabled state

```html
<div class="dropzone" tabindex="-1" aria-disabled="true">
  ...
  <input type="file" hidden disabled>
</div>
```

---

## 2. CSS / SCSS Changes

### New classes to implement

| Class | Description |
|---|---|
| `.upload__item__main` | Flex row container inside `.upload__item` |
| `.upload__item__main--error` | Error border on main row (border-color: `var(--red-700)`) |
| `.upload__item__error-section` | Error detail area below main row; has top divider via `::before` |
| `.upload__item__error-message` | Inline error text; `color: var(--red-600)`, `font-size: 12px` |
| `.dropzone__content--active` | Hidden by default; shown (`display: block`) when `.dropzone--active` |
| `.dropzone--uploaded` | Hides the dropzone and its `.dropzone__details` sibling (single-upload mode) |

### Changed classes

| Class | What changed |
|---|---|
| `.upload__item` | No longer has `display: flex` / `align-items: center` — layout moved to `__main` |
| `.upload__item--error` | Border color changed: `var(--red-600)` → `var(--red-700)` |
| `.upload__thumb` | Removed `background: var(--gray-200)` |
| `.dropzone--active` | Background changed: `var(--blue-sky-50)` → `var(--blue-sky-100)`; now also hides `.dropzone__content` and shows `.dropzone__content--active` |
| `.dropzone[aria-disabled=true]` | New state — pointer-events none, muted colors (`gray-300` border, `gray-250` text/icon), no focus ring |
| `.dropzone` | Added `aspect-ratio: 49/13`, `display: flex`, `align-items: center`, `justify-content: center` |

### Token change — destructive border

`$input-colors.destructive.border`: `var(--red-500)` → `var(--red-600)`

Affects: `.input--destructive`, `.input-number--destructive`, `.textarea--destructive` border color.

---

## 3. JavaScript Behaviour Changes

### `createUploadItem(file, previewImages, state, errorMessage)`

- New `errorMessage` parameter (4th arg, nullable)
- When `errorMessage` is set: thumb is hidden, error section rendered below `__main`
- Error icon: `icon small` → `icon medium`; `text-red-600` → `text-red-700`

### `initUpload(inputId, listId, multiple, previewImages)`

- New `multiple` parameter (3rd arg, default `false`)
- When `multiple = false`: clears the file list on each new selection (single-file mode)

### `initDropzone(dropzoneId, inputId, listId, multiple, previewImages)`

- New `multiple` parameter (4th arg, default `false`)
- When `multiple = false`:
  - Clears list before adding new file
  - Adds `dropzone--uploaded` class to dropzone (hides it visually)
  - Remove button on uploaded/uploading items restores dropzone (removes `dropzone--uploaded`)

### Instance IDs renamed

| Old ID | New ID |
|---|---|
| `single-list` | `single-upload-list` |
| `multi-list` | `multi-upload-list` |
| `image-list` | `image-upload-list` |
| `dropzone` / `dropzone-input` / `dropzone-list` | `default-dropzone` / `default-dropzone-input` / `default-dropzone-list` |

New dropzone instances added:
- `dropzone-single` / `dropzone-single-input` / `dropzone-single-list` — single-file dropzone
- `dropzone-multi` / `dropzone-multi-input` / `dropzone-multi-list` — multiple-file dropzone

---

## 4. Variants & States Inventory (for Blazor params)

### Upload Button (`upload-block`)

| Variant | Class modifier | Notes |
|---|---|---|
| Default | *(none)* | Single file, no preview |
| Single Upload | `upload-block--single` | Clears list on re-select |
| Multiple Upload | `upload-block--multiple` | Accumulates files |
| Image Preview | `upload-block--image-preview` | Shows image thumbnail |

### Upload Item States

| State | DOM indicator | Notes |
|---|---|---|
| Uploading | `upload__item` (no modifier) | Remove button present |
| Success | `upload__item` + checkmark icon (`text-green-700`) | Remove button present |
| Error (no message) | `upload__item--error` + info icon | No `upload__item__error-section` |
| Error (with message) | `upload__item--error` + info icon + `upload__item__error-section` | Thumb hidden |
| Uploaded | `upload__item` + remove button | Replace button present |

### Dropzone States

| State | How applied |
|---|---|
| Default | *(none)* |
| Hover | CSS `:hover` |
| Active (drag over) | `.dropzone--active` class via JS |
| Focus | CSS `:focus` (outline + box-shadow) |
| Disabled | `aria-disabled="true"` + `tabindex="-1"` + `disabled` on `<input>` |
| Uploaded (single mode) | `.dropzone--uploaded` class via JS |

---

## 5. New Asset

`assets/icons/upload-icon.svg` — generic file/upload icon used in all non-error, non-image-preview thumb slots.

---

## 6. Doc Page Layout (reference only — not needed in Blazor)

The HTML demo page switched from a Bootstrap-style grid (`col-*`) to a custom doc layout (`doc-section`, `doc-section-items`, `doc-item`, `doc-item-label`). This is the design library's own documentation scaffold and does not affect the component's production HTML.
