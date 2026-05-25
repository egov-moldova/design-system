# cor-file-input



<!-- Auto Generated Below -->


## Overview

File Input — drag-and-drop / click-to-browse file selection molecule.

Pattern B (molecule, internal DOM, form-associated): the host owns a hidden
native `<input type="file">` for the browse path, manages the drop zone
affordance, validates by `accept` / `maxSize` / `maxFiles`, and renders a
per-file list of `cor-file-item` rows. Citizens get keyboard parity (Tab
to focus, Enter/Space to open the picker) and a `role="status"` live region
that announces add / remove / reject events.

The component owns SELECTION + VALIDATION + DISPLAY. Real upload (progress,
network errors, retries) is consumer-driven via the `corChange` event.

State model (no style axis — Figma is state-only):
  default → hover → focus → active (drag-over) → disabled
  `invalid` is a separate validation flag that recolors the dashed border red
  without introducing a style variant.

## Properties

| Property               | Attribute                | Description                                                                                                                                                                                    | Type                  | Default                         |
| ---------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------- |
| `accept`               | `accept`                 | Native HTML `accept` attribute — MIME types and/or extensions, comma-separated.                                                                                                                | `string \| undefined` | `undefined`                     |
| `ariaLabel`            | `aria-label`             | Accessible name; mirrors to the drop zone's `aria-label` when no visible label.                                                                                                                | `string \| undefined` | `undefined`                     |
| `chooseFilesText`      | `choose-files-text`      | Label for the inline "choose files" link. Rendered as an underlined brand-blue button that opens the native file picker.                                                                       | `string`              | `'Alege fișiere'`               |
| `ctaText`              | `cta-text`               | Lead-in CTA body text inside the drop area at rest. Renders BEFORE the brand-blue inline link. The trailing space is intentional — the link follows on the same line.                          | `string`              | `'Trage și plasează sau '`      |
| `disabled`             | `disabled`               | Disables interactivity — drop zone ignores drops, button is blocked.                                                                                                                           | `boolean`             | `false`                         |
| `dropzoneActiveText`   | `dropzone-active-text`   | Body text shown while a drag is over the drop zone (Figma "Active" state). Replaces the resting body + hides the icon for the duration of the drag.                                            | `string`              | `'Eliberează pentru a încărca'` |
| `errorText`            | `error-text`             | Plain-text error message shown below the drop zone when `invalid` is set.                                                                                                                      | `string \| undefined` | `undefined`                     |
| `files`                | --                       | Currently accepted files. Two-way bound: assigning a new array rerenders the list, the citizen interacting fires events that the consumer may use to mutate this array externally.             | `File[]`              | `[]`                            |
| `helperText`           | `helper-text`            | Plain-text helper / hint shown below the drop zone.                                                                                                                                            | `string \| undefined` | `undefined`                     |
| `invalid`              | `invalid`                | Renders the red-border error treatment + wires `aria-invalid`.                                                                                                                                 | `boolean`             | `false`                         |
| `label`                | `label`                  | Plain-text label. Use the `label` slot for richer content.                                                                                                                                     | `string \| undefined` | `undefined`                     |
| `maxFiles`             | `max-files`              | Maximum number of files accepted when `multiple` is set.                                                                                                                                       | `number \| undefined` | `undefined`                     |
| `maxSize`              | `max-size`               | Maximum per-file size in bytes; files above are rejected with `code='size'`.                                                                                                                   | `number \| undefined` | `undefined`                     |
| `maxSizeText`          | `max-size-text`          | Top-right caption inside the field row, shown below the dropzone. When unset and `maxSize` is provided, this is derived from `maxSize` (bytes) as `Mărime maximă: 100 MB`. Explicit prop wins. | `string \| undefined` | `undefined`                     |
| `multiple`             | `multiple`               | Allow selecting more than one file.                                                                                                                                                            | `boolean`             | `false`                         |
| `name`                 | `name`                   | Form-control `name`. Used during form submission.                                                                                                                                              | `string \| undefined` | `undefined`                     |
| `required`             | `required`               | Marks the field as mandatory. Adds the red asterisk + `aria-required`.                                                                                                                         | `boolean`             | `false`                         |
| `size`                 | `size`                   | Visual size rung. Drives drop-zone min-height + label / icon scale.                                                                                                                            | `"lg" \| "md"`        | `'md'`                          |
| `supportedFormatsText` | `supported-formats-text` | Top-left caption inside the field row, shown below the dropzone. When unset and `accept` is provided, this is derived from `accept` as `Formate acceptate: jpg, png, pdf`. Explicit prop wins. | `string \| undefined` | `undefined`                     |


## Events

| Event          | Description                                                                          | Type                                 |
| -------------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| `corChange`    | Fires when the accepted file list changes (browse OR drop OR remove).                | `CustomEvent<FileInputChangeDetail>` |
| `corDragEnter` | Fires when a drag enters the drop zone.                                              | `CustomEvent<DragEvent>`             |
| `corDragLeave` | Fires when the drag leaves the drop zone.                                            | `CustomEvent<DragEvent>`             |
| `corDrop`      | Fires after a drop, with the accepted / rejected split + the first rejection reason. | `CustomEvent<FileInputDropDetail>`   |
| `corError`     | Fires for every rejected file (size / type / count). One event per file.             | `CustomEvent<FileInputErrorDetail>`  |
| `corRemove`    | Fires when a file is removed from the inline list.                                   | `CustomEvent<FileInputRemoveDetail>` |


## Slots

| Slot       | Description                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| `"helper"` | Rich helper / hint content, replaces the `helper-text` prop.                                                   |
| `"icon"`   | Override the centre drop-zone icon-glyph inside the circle.        Defaults to `cor-icon name="cloud-upload"`. |
| `"label"`  | Rich label content, replaces the `label` prop when present.                                                    |


## Shadow Parts

| Part                  | Description |
| --------------------- | ----------- |
| `"captions"`          |             |
| `"captions-formats"`  |             |
| `"captions-max-size"` |             |
| `"choose-files-link"` |             |
| `"dropzone"`          |             |
| `"dropzone-body"`     |             |
| `"dropzone-cta"`      |             |
| `"dropzone-icon"`     |             |
| `"dropzone-text"`     |             |
| `"error"`             |             |
| `"file-list"`         |             |
| `"helper"`            |             |
| `"label"`             |             |
| `"required-mark"`     |             |


## Dependencies

### Depends on

- [cor-icon](../cor-icon)
- [cor-file-item](../cor-file-item)

### Graph
```mermaid
graph TD;
  cor-file-input --> cor-icon
  cor-file-input --> cor-file-item
  cor-file-item --> cor-icon
  style cor-file-input fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
