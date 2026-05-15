import { LoadingState } from './cor-loading.enums';

/**
 * Helper: Attach click handler to button after render
 */
const attachButtonClick = (buttonId: string, callback: () => void) => {
  setTimeout(() => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', callback);
    }
  }, 0);
};

type CorLoadingArgs = {
  value: number;
  state: LoadingState;
  label: string;
};

export default {
  title: 'Atoms/Loading',
  component: 'cor-loading',
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    state: {
      control: 'select',
      options: Object.values(LoadingState),
    },
    label: {
      control: 'text',
    },
  },
  parameters: {
    actions: { handles: [] },
  },
};

const renderLoading = (args: CorLoadingArgs) => {
  const attrs = [`value="${args.value}"`, `state="${args.state}"`, args.label ? `label="${args.label}"` : '']
    .filter(Boolean)
    .join(' ');
  return /*html*/ `<cor-loading ${attrs}></cor-loading>`;
};

export const Default = {
  render: renderLoading,
  args: {
    value: 42,
    state: LoadingState.LOADING,
    label: 'Loading',
  },
};

export const Final = {
  render: renderLoading,
  args: {
    value: 100,
    state: LoadingState.FINAL,
    label: 'Complete',
  },
};

export const AllStates = {
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: 32px; padding: 24px; flex-wrap: wrap;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-loading value="0" state="loading"></cor-loading>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">0%</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-loading value="25" state="loading"></cor-loading>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">25%</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-loading value="50" state="loading"></cor-loading>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">50%</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-loading value="75" state="loading"></cor-loading>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">75%</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-loading value="100" state="loading"></cor-loading>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">100%</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-loading value="100" state="final"></cor-loading>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">final</span>
      </div>
    </div>
  `,
  parameters: {
    controls: {
      disable: true,
    },
  },
};

export const ComplexAnimation = {
  render: () => {
    let isAnimating = false;
    let finalTimeout: number | null = null;
    let animationInterval: number | null = null;

    const resetAnimation = () => {
      if (finalTimeout) {
        clearTimeout(finalTimeout);
        finalTimeout = null;
      }
      if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
      }
      const loader = document.getElementById('complex-loader');
      const percentage = document.getElementById('complex-percentage');
      const text = document.getElementById('loading-text');
      const button = document.getElementById('start-animation');

      if (loader && percentage && text && button) {
        loader.setAttribute('value', '0');
        loader.setAttribute('state', 'loading');
        percentage.setAttribute('value', '0');
        const span = text.querySelector('span');
        if (span) span.textContent = 'This process is loading. Please wait...';
        isAnimating = false;
        button.textContent = 'Start Animation';
      }
    };

    const startAnimation = () => {
      if (isAnimating) {
        resetAnimation();
        return;
      }

      const loader = document.getElementById('complex-loader');
      const percentage = document.getElementById('complex-percentage');
      const text = document.getElementById('loading-text');
      const button = document.getElementById('start-animation');

      if (!loader || !percentage || !text || !button) return;

      isAnimating = true;
      button.textContent = 'Reset';
      loader.setAttribute('value', '0');
      loader.setAttribute('state', 'loading');
      percentage.setAttribute('value', '0');
      const span = text.querySelector('span');
      if (span) span.textContent = 'This process is loading. Please wait...';

      let current = 0;
      animationInterval = window.setInterval(() => {
        current += 2;
        loader.setAttribute('value', current.toString());
        percentage.setAttribute('value', current.toString());

        if (current >= 100) {
          if (animationInterval) clearInterval(animationInterval);
          animationInterval = null;
          loader.setAttribute('value', '100');
          percentage.setAttribute('value', '100');

          finalTimeout = window.setTimeout(() => {
            loader.setAttribute('state', 'final');
            if (span) span.textContent = 'Process completed successfully!';
            button.textContent = 'Start Animation';
            isAnimating = false;
          }, 500);
        }
      }, 50);
    };

    // Attach button click handler
    attachButtonClick('start-animation', startAnimation);

    // Auto-start on load
    setTimeout(startAnimation, 100);

    return /*html*/ `
    <div style="
      background: var(--color-background-base-default);
      border: 1px solid var(--color-border-base-tertiary);
      border-radius: var(--border-radius-lg, 16px);
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      width: 480px;
    ">
      <cor-loading id="complex-loader" value="0" state="loading" label=""></cor-loading>

      <cor-typography id="loading-text" variant="body-sm" color="color-neutral-text-default">
        <span>This process is loading. Please wait...</span>
      </cor-typography>

      <cor-loading-percentage id="complex-percentage" value="0"></cor-loading-percentage>

      <div style="margin-top: 8px;">
        <cor-button variant="secondary-gray" size="sm">
          <button id="start-animation">Start Animation</button>
        </cor-button>
      </div>
    </div>
  `;
  },
  parameters: {
    controls: {
      disable: true,
    },
  },
};
