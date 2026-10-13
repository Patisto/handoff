const color = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(
        [
          'background',
          'foreground',
          'muted',
          'border',
          'accent',
          'secondary',
          'success',
          'warning',
          'danger',
          'panel',
          'raised',
          'soft',
          'contrast',
        ].map((name) => [name, color(name)]),
      ),
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'DM Sans', 'sans-serif'],
      },
      boxShadow: { panel: 'var(--panel-shadow)' },
    },
  },
  plugins: [],
};
