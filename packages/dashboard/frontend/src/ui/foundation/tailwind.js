// Tailwind 3 adapter. The consuming application owns Tailwind and its plugins.
const color = name => `color-mix(in srgb, var(--ui-${name}) calc(<alpha-value> * 100%), transparent)`;
export default {
  theme: {
    extend: {
      colors: {
        ui: Object.fromEntries([
          'canvas', 'raised', 'inset', 'hover', 'ink', 'secondary', 'muted',
          'edge', 'control-edge', 'focus', 'action-contrast', 'action-hover',
          'action-active', 'danger', 'danger-wash', 'danger-contrast', 'success', 'warning',
        ].map(name => [name, color(name)])),
      },
      fontFamily: { sans: ['var(--ui-font)'] },
      borderRadius: { control: 'var(--ui-radius-control)' },
    },
  },
};
