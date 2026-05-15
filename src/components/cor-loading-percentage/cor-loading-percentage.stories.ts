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

export default {
  title: 'Atoms/Loading Percentage',
  component: 'cor-loading-percentage',
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Percentage value to display (0-100)',
    },
  },
  parameters: {
    actions: { handles: [] },
  },
};

export const Default = {
  render: (args: { value: number }) => /*html*/ `
    <cor-loading-percentage value="${args.value}"></cor-loading-percentage>
  `,
  args: {
    value: 0,
  },
};

export const AllValues = {
  render: () => /*html*/ `
    <div style="display: flex; gap: 16px; align-items: center;">
      <cor-loading-percentage value="0"></cor-loading-percentage>
      <cor-loading-percentage value="8"></cor-loading-percentage>
      <cor-loading-percentage value="20"></cor-loading-percentage>
      <cor-loading-percentage value="50"></cor-loading-percentage>
      <cor-loading-percentage value="64"></cor-loading-percentage>
      <cor-loading-percentage value="100"></cor-loading-percentage>
    </div>
  `,
  args: {},
  parameters: {
    controls: {
      disable: true,
    },
  },
};

export const Animated = {
  render: () => {
    let currentInterval: number | null = null;

    const animatePercentage = () => {
      const el = document.getElementById('animated-pct') as any;
      if (!el) return;

      // Clear any existing animation
      if (currentInterval !== null) {
        clearInterval(currentInterval);
      }

      // Reset to 0 and start new animation
      el.value = 0;
      let current = 0;
      currentInterval = window.setInterval(() => {
        current += 5;
        el.value = current;
        if (current >= 100) {
          clearInterval(currentInterval!);
          currentInterval = null;
        }
      }, 150);
    };

    // Attach button click handler
    attachButtonClick('animate-btn', animatePercentage);

    return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
      <cor-loading-percentage id="animated-pct" value="0"></cor-loading-percentage>
      <cor-button variant="secondary-gray" size="sm"><button id="animate-btn">Animate 0 → 100</button></cor-button>
    </div>
  `;
  },
  args: {},
  parameters: {
    controls: {
      disable: true,
    },
  },
};
