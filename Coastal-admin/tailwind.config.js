/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--c-paper-rgb) / <alpha-value>)',
        'paper-2': 'rgb(var(--c-paper-2-rgb) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated-rgb) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--c-ink-rgb) / <alpha-value>)',
          2: 'rgb(var(--c-ink-2-rgb) / <alpha-value>)',
          3: 'rgb(var(--c-ink-3-rgb) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--c-line-rgb) / <alpha-value>)',
          2: 'rgb(var(--c-line-2-rgb) / <alpha-value>)',
        },
        tide: {
          DEFAULT: 'rgb(var(--c-tide-rgb) / <alpha-value>)',
          2: 'rgb(var(--c-tide-2-rgb) / <alpha-value>)',
          glow: 'rgb(var(--c-tide-glow-rgb) / <alpha-value>)',
        },
        ember: 'rgb(var(--c-ember-rgb) / <alpha-value>)',
        gold: 'rgb(var(--c-gold-rgb) / <alpha-value>)',
        ok: 'rgb(var(--c-ok-rgb) / <alpha-value>)',
        err: 'rgb(var(--c-err-rgb) / <alpha-value>)',
        warn: 'rgb(var(--c-warn-rgb) / <alpha-value>)',
        coastal: {
          navy: 'rgb(var(--c-ink-rgb) / <alpha-value>)',
          navyLight: 'rgb(var(--c-ink-2-rgb) / <alpha-value>)',
          sand: 'rgb(var(--c-paper-rgb) / <alpha-value>)',
          sandDark: 'rgb(var(--c-paper-2-rgb) / <alpha-value>)',
          stone: 'rgb(var(--c-line-rgb) / <alpha-value>)',
          terracotta: 'rgb(var(--c-tide-rgb) / <alpha-value>)',
          terracottaHover: 'rgb(var(--c-tide-2-rgb) / <alpha-value>)',
          teal: 'rgb(var(--c-tide-rgb) / <alpha-value>)',
          tealLight: 'rgb(var(--c-paper-2-rgb) / <alpha-value>)',
          ocean: 'rgb(var(--c-tide-rgb) / <alpha-value>)',
          foam: 'rgb(var(--c-tide-glow-rgb) / <alpha-value>)',
          gold: 'rgb(var(--c-gold-rgb) / <alpha-value>)',
          slate: 'rgb(var(--c-ink-2-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl2: '1rem',
      },
      maxWidth: {
        shell: '1280px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasis: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        micro: '120ms',
        std: '240ms',
        emphasis: '480ms',
      },
      zIndex: {
        base: '0',
        raised: '10',
        chrome: '40',
        grain: '60',
        tide: '70',
        overlay: '80',
        modal: '90',
        palette: '100',
      },
    },
  },
  plugins: [],
};
