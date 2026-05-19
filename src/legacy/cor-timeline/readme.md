# cor-timeline



<!-- Auto Generated Below -->


## Properties

| Property       | Attribute       | Description                                                                         | Type                                                                                                                       | Default                          |
| -------------- | --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `max`          | `max`           | Maximum value on the scale                                                          | `number`                                                                                                                   | `100`                            |
| `min`          | `min`           | Minimum value on the scale                                                          | `number`                                                                                                                   | `0`                              |
| `scaleType`    | `scale-type`    | Scale tick/label type                                                               | `CorTimelineScaleType.MONTHS \| CorTimelineScaleType.YEARS`                                                                | `CorTimelineScaleType.YEARS`     |
| `selectorType` | `selector-type` | Single or range selector mode                                                       | `CorTimelineSelectorType.RANGE \| CorTimelineSelectorType.SINGLE`                                                          | `CorTimelineSelectorType.SINGLE` |
| `step`         | `step`          | Step size between ticks                                                             | `number`                                                                                                                   | `0.25`                           |
| `value`        | `value`         | Controlled value. Single number for single mode, tuple [start, end] for range mode. | `[number, number] \| null \| number`                                                                                       | `null`                           |
| `variant`      | `variant`       | Visual variant context                                                              | `CorTimelineVariant.ON_CARD \| CorTimelineVariant.ON_MAP \| CorTimelineVariant.ON_MAP_SMALL \| CorTimelineVariant.ON_PAGE` | `CorTimelineVariant.ON_PAGE`     |


## Events

| Event                  | Description                                                           | Type                                     |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| `corTimelineChange`    | Fired when selector value changes via keyboard or programmatic update | `CustomEvent<CorTimelineChangeEvent>`    |
| `corTimelineScrollEnd` | Fired when the scroll container stops scrolling                       | `CustomEvent<CorTimelineScrollEndEvent>` |


## Methods

### `scrollToValue(val: number) => Promise<void>`



#### Parameters

| Name  | Type     | Description |
| ----- | -------- | ----------- |
| `val` | `number` |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
