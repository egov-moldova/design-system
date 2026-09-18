# mud-time-picker



<!-- Auto Generated Below -->


## Overview

Time picker — an hour column and a minute column, the dropdown of
`mud-time-input` (Figma Time frame 13807:8471, dropdown 13810:9450).

The selected value of the column being edited is solid (`.day-cell` Active);
the other column's selected value is tinted (`.day-cell` Middle). Picking an
hour moves on to the minutes; picking a minute completes the time and fires
`mudChange`.

Keyboard: each column is a listbox with one tab stop. Up / Down move within a
column, Home / End jump to its ends, Left / Right switch columns, Enter or
Space picks the focused option.

## Properties

| Property       | Attribute       | Description                                                         | Type                  | Default            |
| -------------- | --------------- | ------------------------------------------------------------------- | --------------------- | ------------------ |
| `hoursLabel`   | `hours-label`   | Accessible name of the hour column.                                 | `string`              | `'Ore'`            |
| `label`        | `label`         | Accessible name of the picker.                                      | `string`              | `'Selectează ora'` |
| `max`          | `max`           | Latest selectable time, `HH:MM` inclusive.                          | `string \| undefined` | `undefined`        |
| `min`          | `min`           | Earliest selectable time, `HH:MM` inclusive.                        | `string \| undefined` | `undefined`        |
| `minutesLabel` | `minutes-label` | Accessible name of the minute column.                               | `string`              | `'Minute'`         |
| `value`        | `value`         | Selected time, `HH:MM` (24-hour). Updated when a time is completed. | `string \| undefined` | `undefined`        |


## Events

| Event       | Description                                                              | Type                                  |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------- |
| `mudChange` | Fires when a time is complete — a minute is picked while an hour is set. | `CustomEvent<TimePickerChangeDetail>` |


## Shadow Parts

| Part          | Description |
| ------------- | ----------- |
| `"columns"`   |             |
| `"option"`    |             |
| `"separator"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
