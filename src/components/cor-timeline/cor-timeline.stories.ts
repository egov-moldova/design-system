/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { CorTimelineVariant, CorTimelineScaleType, CorTimelineSelectorType } from './cor-timeline.enums';
import { ICON_NAMES } from '../..';
import { IconSize } from '../cor-icon/cor-icon.types';

const meta: Meta = {
  title: 'Molecules/Timeline',
  component: 'cor-timeline',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      description: 'Visual variant context',
      control: 'select',
      options: Object.values(CorTimelineVariant),
      defaultValue: { summary: CorTimelineVariant.ON_PAGE },
    },
    scaleType: {
      description: 'Scale tick/label type',
      control: 'select',
      options: Object.values(CorTimelineScaleType),
      defaultValue: { summary: CorTimelineScaleType.YEARS },
    },
    selectorType: {
      description: 'Single or range selector mode',
      control: 'select',
      options: Object.values(CorTimelineSelectorType),
      defaultValue: { summary: CorTimelineSelectorType.RANGE },
    },
    min: {
      description: 'Minimum value on the scale',
      control: 'number',
      defaultValue: { summary: 0 },
    },
    max: {
      description: 'Maximum value on the scale',
      control: 'number',
      defaultValue: { summary: 100 },
    },
    step: {
      description: 'Step size between ticks',
      control: { type: 'number', min: 0.25, max: 12, step: 0.25 },
      defaultValue: { summary: 0.25 },
    },
    value: {
      description: 'Controlled value (number or [start, end] tuple)',
      control: 'object',
    },
  },
};

type DefaultArgs = {
  variant: CorTimelineVariant;
  scaleType: CorTimelineScaleType;
  selectorType: CorTimelineSelectorType;
  min: number;
  max: number;
  step: number;
  value: number | [number, number];
};

const defaultArgs: DefaultArgs = {
  variant: CorTimelineVariant.ON_PAGE,
  scaleType: CorTimelineScaleType.YEARS,
  selectorType: CorTimelineSelectorType.RANGE,
  min: 2010,
  max: 2024,
  step: 0.25,
  value: [2013, 2015],
};

export default meta;
type Story = StoryObj;

const render = (args: Record<string, unknown>) => {
  const id = `cor-timeline-story-${Math.random().toString(36).slice(2)}`;
  setTimeout(() => {
    const el = document.getElementById(id) as HTMLElement & { value: number | [number, number] };
    if (el && args.value !== undefined) el.value = args.value as number | [number, number];
  }, 0);
  return /*html*/ `
  <div style="widht: 100%; max-width: 800px;">
    <cor-timeline
      id="${id}"
      variant=${args.variant}
      scale-type=${args.scaleType}
      selector-type=${args.selectorType}
      min=${args.min}
      max=${args.max}
      step=${args.step}
    ></cor-timeline>
  </div>
  `;
};

export const Default: Story = {
  args: defaultArgs,
  render,
};

export const YearsBottomAlign: Story = {
  name: 'Years — Bottom Align',
  argTypes: {
    variant: {
      control: false,
    },
    scaleType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    variant: CorTimelineVariant.ON_CARD,
  } as DefaultArgs,
  render,
};

export const YearsCenteredAlign: Story = {
  name: 'Years — Centered Align',
  argTypes: {
    variant: {
      control: false,
    },
    scaleType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
  } as DefaultArgs,
  render,
};

export const MonthsBottomAlign: Story = {
  name: 'Months — Bottom Align',
  argTypes: {
    variant: {
      control: false,
    },
    scaleType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    variant: CorTimelineVariant.ON_CARD,
    scaleType: CorTimelineScaleType.MONTHS,
  } as DefaultArgs,
  render,
};

export const MonthsCenteredAlign: Story = {
  name: 'Months — Centered Align',
  argTypes: {
    variant: {
      control: false,
    },
    scaleType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    scaleType: CorTimelineScaleType.MONTHS,
  } as DefaultArgs,
  render,
};

export const RangeSingle: Story = {
  name: 'Range — Single Selector',
  argTypes: {
    value: {
      description: 'Controlled value',
      control: { type: 'number', min: 2010, max: 2024, step: 1 },
    },
    selectorType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    selectorType: CorTimelineSelectorType.SINGLE,
    value: 2013,
  } as DefaultArgs,
  render,
};

export const RangeSelector: Story = {
  name: 'Range — Range Selector',
  argTypes: {
    selectorType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    selectorType: CorTimelineSelectorType.RANGE,
  } as DefaultArgs,
  render,
};

export const OnMap: Story = {
  name: 'Variant — On Map',
  argTypes: {
    variant: {
      control: false,
    },
    scaleType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    variant: CorTimelineVariant.ON_MAP,
  } as DefaultArgs,
  render,
};

export const OnCard: Story = {
  name: 'Variant — On Card',
  argTypes: {
    variant: {
      control: false,
    },
    scaleType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    variant: CorTimelineVariant.ON_CARD,
  } as DefaultArgs,
  render,
};

export const OnMapSmall: Story = {
  name: 'Variant — On Map Small',
  argTypes: {
    variant: {
      control: false,
    },
    scaleType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    variant: CorTimelineVariant.ON_MAP_SMALL,
  } as DefaultArgs,
  render,
};

export const AllVariants: Story = {
  parameters: {
    controls: {
      disable: true,
    },
  },
  args: {
    ...defaultArgs,
  } as DefaultArgs,
  name: 'All Usage Variants',
  render: () => /*html*/ `
    <div style="width: 100%; max-width: 800px; display: flex; flex-direction: column; gap: 32px; padding: 24px;">
      <div>
        <p style="margin-bottom: 8px; font-size: 12px; color: var(--color-neutral-text-weaker);">on-page / years / center</p>
        <cor-timeline
          variant="on-page"
          scale-type="years"
          min="2010"
          max="2022"
          step="0.25"
          selector-type="range"
          value="[2013,2015]"
        ></cor-timeline>
      </div>
       <div>
        <p style="margin-bottom: 8px; font-size: 12px; color: var(--color-neutral-text-weaker);">on-map-small / years / center / range</p>
        <cor-timeline
          variant="on-map-small"
          scale-type="years"
          min="2010"
          max="2022"
          step="0.25"
          selector-type="range"
          value="[2013,2015]"
        ></cor-timeline>
      </div>
      <div>
        <p style="margin-bottom: 8px; font-size: 12px; color: var(--color-neutral-text-weaker);">on-map / years / center</p>
        <cor-timeline
          variant="on-map"
          scale-type="years"
          min="2010"
          max="2022"
          step="0.25"
          selector-type="range"
          value="[2013,2015]"
        ></cor-timeline>
      </div>
      <div>
        <p style="margin-bottom: 8px; font-size: 12px; color: var(--color-neutral-text-weaker);">on-card / months / bottom</p>
        <cor-timeline
          variant="on-card"
          scale-type="months"
          min="0"
          max="11"
          step="0.25"
          selector-type="range"
          value="[2,5]"
        ></cor-timeline>
      </div>

    </div>
  `,
};

export const Interactive: Story = {
  argTypes: {
    selectorType: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    min: 2011,
    max: 2019,
    step: 0.25,
    value: [2012, 2015],
  } as DefaultArgs,
  name: 'Interactive — With Controls',
  render: (args: Partial<DefaultArgs>) => {
    const isMonthsScale = args.scaleType === 'months';
    const MIN = isMonthsScale ? 0 : (args.min ?? 2010);
    const MAX = isMonthsScale ? 11 : (args.max ?? 2024);
    const STEP = args.step ?? 1;
    const initialValue: [number, number] = isMonthsScale ? [2, 5] : [2013, 2015]; // Adaptive initial value
    const containerId = 'timeline-interactive-story';

    const formatYearMonth = (year: number): string => {
      const yearPart = Math.floor(year);
      const decimalPart = year - yearPart;
      const month = Math.round(decimalPart * 12);
      return month === 0 ? `${yearPart}` : `${yearPart}.${month.toString().padStart(2, '0')}`;
    };

    // Key uses YYYY.MM format to match displayed label, avoiding float string comparison issues
    const toYearsRangeKey = (start: number, end: number): string => `${formatYearMonth(start)}-${formatYearMonth(end)}`;

    const getInputLabel = (v: [number, number]) => {
      if (isMonthsScale) {
        // For months scale: show month names
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonth = monthNames[v[0]] || `Month ${v[0]}`;
        const endMonth = monthNames[v[1]] || `Month ${v[1]}`;
        return `${startMonth} \u2013 ${endMonth}`;
      } else {
        return `${formatYearMonth(v[0])} \u2013 ${formatYearMonth(v[1])}`;
      }
    };

    setTimeout(() => {
      const host = document.getElementById(containerId);
      if (!host) return;

      let rangeValue: [number, number] = [...initialValue];
      let isPlaying = false;
      let animationId: number | null = null;

      const elements = {
        timeline: host.querySelector('cor-timeline') as HTMLElement & { value: [number, number] },
        btnPrev: host.querySelector('#timeline-btn-prev') as HTMLElement,
        btnNext: host.querySelector('#timeline-btn-next') as HTMLElement,
        btnPlay: host.querySelector('button[aria-label="Play animation"]') as HTMLElement,
        btnPlayIcon: host.querySelector('button[aria-label="Play animation"] cor-icon') as HTMLElement & {
          name: string;
        },
        corSelect: host.querySelector('cor-select.timeline-range-select') as HTMLElement & { value: string },
      };

      const getRangeSpan = () => rangeValue[1] - rangeValue[0];

      const navigateRange = (direction: 'prev' | 'next') => {
        const span = getRangeSpan();
        const actualMin = isMonthsScale ? 0 : MIN;
        const actualMax = isMonthsScale ? 11 : MAX;

        if (direction === 'prev') {
          const newStart = Math.max(actualMin, rangeValue[0] - STEP);
          const newEnd = Math.min(actualMax, newStart + span);
          update([newStart, newEnd]);
          return;
        }
        const newEnd = Math.min(actualMax, rangeValue[1] + STEP);
        const newStart = Math.max(actualMin, newEnd - span);
        update([newStart, newEnd]);
      };

      const startAnimation = () => {
        const animate = () => {
          const span = getRangeSpan();
          const actualMin = isMonthsScale ? 0 : MIN;
          const actualMax = isMonthsScale ? 11 : MAX;

          if (rangeValue[1] >= actualMax) {
            update([actualMin, actualMin + span]); // Reset to beginning
          } else {
            const newEnd = Math.min(actualMax, rangeValue[1] + STEP);
            const newStart = Math.max(actualMin, newEnd - span);
            update([newStart, newEnd]);
          }

          animationId = requestAnimationFrame(() => {
            setTimeout(() => isPlaying && animate(), 500);
          });
        };
        animate();
      };

      const stopAnimation = () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      };

      const toggleAnimation = () => {
        isPlaying = !isPlaying;
        if (isPlaying) {
          startAnimation();
          if (elements.btnPlayIcon) elements.btnPlayIcon.name = ICON_NAMES.PAUSE__FILLED;
        } else {
          stopAnimation();
          if (elements.btnPlayIcon) elements.btnPlayIcon.name = ICON_NAMES.PLAY__FILLED__ALT;
        }
      };

      const update = (newValue: [number, number]) => {
        rangeValue = newValue;
        if (elements.timeline) elements.timeline.value = rangeValue;
        if (elements.corSelect) {
          elements.corSelect.value = isMonthsScale
            ? getInputLabel([Math.round(newValue[0]), Math.round(newValue[1])])
            : toYearsRangeKey(Math.round(newValue[0] / STEP) * STEP, Math.round(newValue[1] / STEP) * STEP);
        }
      };

      elements.btnPrev?.addEventListener('click', () => navigateRange('prev'));
      elements.btnNext?.addEventListener('click', () => navigateRange('next'));
      elements.btnPlay?.addEventListener('click', toggleAnimation);

      elements.corSelect?.addEventListener('corChange', ((e: CustomEvent) => {
        const value = e.detail.value as string;
        if (isMonthsScale) {
          // Value is the formatted label "Jan – Apr"; parse month names back to indices
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const [startStr, endStr] = value.split(' – ');
          const start = monthNames.indexOf(startStr ?? '');
          const end = monthNames.indexOf(endStr ?? '');
          if (start !== -1 && end !== -1) {
            rangeValue = [start, end];
            if (elements.timeline) elements.timeline.value = rangeValue;
          }
          return;
        }
        // Value is in "YYYY.MM-YYYY.MM" format; parse back to decimal year and snap to step
        const parseYM = (s: string): number => {
          const [yearStr, monthStr] = s.split('.');
          const year = parseInt(yearStr, 10);
          if (!monthStr) return year;
          const month = parseInt(monthStr, 10);
          return Math.round((year + month / 12) / STEP) * STEP;
        };
        const dashIdx = value.indexOf('-', value.indexOf('.') + 1);
        const start = parseYM(value.slice(0, dashIdx));
        const end = parseYM(value.slice(dashIdx + 1));
        if (!isNaN(start) && !isNaN(end)) {
          rangeValue = [start, end];
          if (elements.timeline) elements.timeline.value = rangeValue;
        }
      }) as EventListener);

      // Populate cor-select with options using slot pattern
      if (elements.corSelect) {
        // Clear existing options
        elements.corSelect.innerHTML = '';

        // Create options dynamically and append to light DOM
        if (isMonthsScale) {
          const rangeSpan = 3; // 3-month spans for months
          for (let start = 0; start <= 11 - rangeSpan; start++) {
            const end = start + rangeSpan;
            const label = getInputLabel([start, end]);

            const option = document.createElement('cor-select-item');
            option.setAttribute('value', label); // value = label so cor-select shows the label as fallback too
            option.setAttribute('variant', 'label-only');
            option.setAttribute('label', label);
            option.textContent = label;
            elements.corSelect.appendChild(option);
          }
        } else {
          const rangeSpan = 2; // 2-year spans for years
          for (let start = MIN; start <= MAX - rangeSpan; start += STEP) {
            const end = start + rangeSpan;
            const label = getInputLabel([start, end]);

            const option = document.createElement('cor-select-item');
            option.setAttribute('value', toYearsRangeKey(start, end));
            option.setAttribute('variant', 'label-only');
            option.setAttribute('label', label);
            option.textContent = label;
            elements.corSelect.appendChild(option);
          }
        }
      }

      elements.timeline?.addEventListener('corTimelineChange', ((e: CustomEvent) => {
        const detail = e.detail as { valueStart: number; valueEnd: number | null };
        rangeValue = [detail.valueStart, detail.valueEnd ?? detail.valueStart];
        if (elements.corSelect) {
          elements.corSelect.value = isMonthsScale
            ? getInputLabel([Math.round(rangeValue[0]), Math.round(rangeValue[1])])
            : toYearsRangeKey(Math.round(rangeValue[0] / STEP) * STEP, Math.round(rangeValue[1] / STEP) * STEP);
        }
      }) as EventListener);

      if (elements.timeline) elements.timeline.value = rangeValue;
      if (elements.corSelect) {
        elements.corSelect.value = isMonthsScale
          ? getInputLabel([Math.round(rangeValue[0]), Math.round(rangeValue[1])])
          : toYearsRangeKey(Math.round(rangeValue[0] / STEP) * STEP, Math.round(rangeValue[1] / STEP) * STEP);
      }
    }, 0);

    return /*html*/ `
      <div id="${containerId}" style="width: 100%; max-width: 800px;">
        <cor-timeline
          variant="${args.variant}"
          scale-type="${args.scaleType}"
          selector-type="${args.selectorType}"
          min="${MIN}"
          max="${MAX}"
          step="${STEP}"
        >
          <div slot="actions" style="display: flex; align-items: center; gap: 12px; ${args.variant === 'on-map-small' ? 'height: 32px;' : ''}">
            <div style="display: flex; align-items: center; gap: 4px;">
              <cor-button variant="secondary-gray" size="md" icon-only>
                <button id="timeline-btn-prev" aria-label="Previous">
                  <cor-icon name="${ICON_NAMES.CHEVRON__LEFT}" size="${IconSize.SM}" color="currentColor"></cor-icon>
                </button>
              </cor-button>

              <cor-button variant="secondary-gray" size="md" icon-only>
                <button id="timeline-btn-next" aria-label="Next">
                  <cor-icon name="${ICON_NAMES.CHEVRON__RIGHT}" size="${IconSize.SM}" color="currentColor"></cor-icon>
                </button>
              </cor-button>
            </div>

            <cor-select
              class="timeline-range-select"
              size="md"
              style="width: 200px;"
            >
              <!-- Options will be added dynamically -->
            </cor-select>
            <cor-button variant="primary-gray" size="md" icon-only>
              <button aria-label="Play animation">
                <cor-icon name="${ICON_NAMES.PLAY__FILLED__ALT}" size="${IconSize.SM}" color="currentColor"></cor-icon>
              </button>
            </cor-button>
          </div>
        </cor-timeline>
      </div>
    `;
  },
};
